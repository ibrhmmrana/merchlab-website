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
  
  // Get the current max idx to increment
  const { data: maxData } = await supabase
    .from('chatbot_history')
    .select('idx')
    .order('idx', { ascending: false })
    .limit(1)
    .single();
  
  const nextIdx = (maxData?.idx || 0) + 1;
  
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
  
  const { error } = await supabase
    .from('chatbot_history')
    .insert({
      session_id: messageData.session_id,
      message: messageData.message,
      customer: messageData.customer,
      date_time: messageData.date_time,
      idx: nextIdx,
    });
  
  if (error) {
    console.error('Error saving message to Supabase:', error);
    throw new Error(`Failed to save message: ${error.message}`);
  }
}

