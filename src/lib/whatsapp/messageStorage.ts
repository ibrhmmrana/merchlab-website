import { getSupabaseAdmin } from '../supabaseAdmin';

interface ToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

export interface WhatsAppMessage {
  session_id: string;
  message: {
    type: 'human' | 'ai';
    content: string;
    additional_kwargs?: Record<string, unknown>;
    response_metadata?: Record<string, unknown>;
    tool_calls?: ToolCall[];
    invalid_tool_calls?: ToolCall[];
  };
  customer: {
    number: string;
    name?: string;
  };
  date_time: string;
}

/**
 * Save a WhatsApp message to Supabase chatbot_history table
 */
interface AIMetadata {
  tool_calls?: ToolCall[];
  invalid_tool_calls?: ToolCall[];
  additional_kwargs?: Record<string, unknown>;
  response_metadata?: Record<string, unknown>;
}

export async function saveWhatsAppMessage(
  sessionId: string,
  messageType: 'human' | 'ai',
  content: string,
  customer: { number: string; name?: string },
  aiMetadata?: AIMetadata
): Promise<void> {
  const supabase = getSupabaseAdmin();
  
  // Try to get the current max idx to increment (if column exists)
  // Note: chatbot_history table has idx column, but Supabase schema cache might not see it
  let nextIdx: number | undefined = undefined;
  try {
    // First try to get max id and use that as idx (since they should be similar)
    const { data: maxDataId, error: idError } = await supabase
      .from('chatbot_history')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (!idError && maxDataId?.id !== undefined && maxDataId.id !== null) {
      // Use id + 1 as idx (they should be in sync)
      nextIdx = (maxDataId.id as number) + 1;
    }
  } catch (error) {
    // Query failed, that's okay - we'll insert without idx
    console.log('Could not get max id for idx calculation, inserting without idx');
  }
  
  // Build message object with all required fields
  const messageObject: WhatsAppMessage['message'] = {
    type: messageType,
    content,
    additional_kwargs: aiMetadata?.additional_kwargs || {},
    response_metadata: aiMetadata?.response_metadata || {},
  };
  
  // Add tool_calls and invalid_tool_calls for AI messages
  if (messageType === 'ai') {
    messageObject.tool_calls = aiMetadata?.tool_calls || [];
    messageObject.invalid_tool_calls = aiMetadata?.invalid_tool_calls || [];
  }
  
  const messageData: WhatsAppMessage = {
    session_id: sessionId,
    message: messageObject,
    customer: {
      number: customer.number,
      name: customer.name,
    },
    date_time: new Date().toISOString(),
  };
  
  // Build insert object - don't include idx since Supabase schema cache doesn't see it
  // The idx column might exist but Supabase PostgREST doesn't recognize it
  const insertData: Record<string, unknown> = {
    session_id: messageData.session_id,
    message: messageData.message,
    customer: messageData.customer,
    date_time: messageData.date_time,
  };
  
  // Don't include idx - let the database handle it automatically if it exists
  // If idx is an auto-increment or has a default, the database will handle it
  
  const { error } = await supabase
    .from('chatbot_history')
    .insert(insertData);
  
  if (error) {
    console.error('Error saving message to Supabase:', error);
    throw new Error(`Failed to save message: ${error.message}`);
  }
}

