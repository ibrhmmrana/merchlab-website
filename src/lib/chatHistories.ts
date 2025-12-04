import { getSupabaseAdmin } from './supabaseAdmin';

// Raw database row type
export type N8nChatHistoryRow = {
  id: number;
  idx: number;
  session_id: string;
  message: string | object | null; // JSONB - can be string, already parsed object, or null
  customer: string | object | null; // JSONB - can be string, already parsed object, or null
  date_time?: string; // timestamptz column
  created_at?: string; // Keep for backward compatibility
};

// Parsed message type
export type WhatsappMessage = {
  id: number;
  idx: number;
  sessionId: string;
  senderType: 'human' | 'ai';
  content: string;
  customerName: string;
  customerNumber: string;
  createdAt?: string;
};

// Conversation summary type
export type WhatsappConversationSummary = {
  sessionId: string;
  customerName: string;
  customerNumber: string;
  lastMessageContent: string;
  lastMessageAt?: string;
  messageCount: number;
};

// Helper to safely parse JSON strings
function safeParseJson<T>(jsonString: string, fallback: T): T {
  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.error('Failed to parse JSON:', error);
    return fallback;
  }
}

// Parse message - handles both JSONB (already object) and JSON string
function parseMessage(messageData: string | object | null | undefined): { type: 'human' | 'ai'; content: string } {
  let parsed: { type?: string; content?: string };
  
  if (!messageData) {
    parsed = {};
  } else if (typeof messageData === 'string') {
    // If it's a string, parse it
    parsed = safeParseJson<{ type?: string; content?: string }>(messageData, {});
  } else if (typeof messageData === 'object' && messageData !== null) {
    // If it's already an object (JSONB), use it directly
    parsed = messageData as { type?: string; content?: string };
  } else {
    parsed = {};
  }
  
  return {
    type: (parsed.type === 'human' || parsed.type === 'ai' ? parsed.type : 'human') as 'human' | 'ai',
    content: parsed.content || '[Unparseable message]',
  };
}

// Parse customer - handles both JSONB (already object) and JSON string
function parseCustomer(customerData: string | object | null | undefined): { name?: string; number?: string } {
  if (!customerData) {
    return {};
  } else if (typeof customerData === 'string') {
    // If it's a string, parse it
    return safeParseJson<{ name?: string; number?: string }>(customerData, {});
  } else if (typeof customerData === 'object' && customerData !== null) {
    // If it's already an object (JSONB), use it directly
    return customerData as { name?: string; number?: string };
  }
  return {};
}

/**
 * Fetch all WhatsApp conversations grouped by session_id
 * Returns a list of conversation summaries ordered by most recent message
 */
export async function getWhatsappConversations(): Promise<WhatsappConversationSummary[]> {
  const supabase = getSupabaseAdmin();

  // Fetch all chat history rows
  // Order by date_time (most reliable), fallback to id if date_time doesn't exist
  let query = supabase
    .from('chatbot_history')
    .select('*');
  
  // Try to order by date_time first (most reliable for chronological order)
  // If that fails, try id, if that fails, sort in JS
  try {
    query = query.order('date_time', { ascending: false });
  } catch {
    // If date_time ordering fails, try id
    try {
      query = query.order('id', { ascending: false });
    } catch {
      // If both fail, we'll sort in JS
    }
  }
  
  const { data, error } = await query;

  if (error) {
    console.error('Error fetching chat histories:', error);
    console.error('Full error object:', JSON.stringify(error, null, 2));
    console.error('Error details:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    
    // Provide more helpful error message
    if (error.code === '42P01') {
      throw new Error(`Table 'chatbot_history' does not exist. Please verify the table name in Supabase.`);
    } else if (error.code === '42501') {
      throw new Error(`Permission denied. Please check Supabase RLS policies and service role key permissions.`);
    } else if (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist')) {
      // Column doesn't exist - try ordering by id instead
      console.warn('Column ordering failed, trying with id instead');
      const { data: dataWithIdOrder, error: errorWithIdOrder } = await supabase
        .from('chatbot_history')
        .select('*')
        .order('id', { ascending: false });
      
      if (errorWithIdOrder) {
        // If id ordering also fails, try without any ordering
        console.warn('id ordering also failed, fetching without order');
        const { data: dataWithoutOrder, error: errorWithoutOrder } = await supabase
          .from('chatbot_history')
          .select('*');
        
        if (errorWithoutOrder) {
          throw new Error(`Failed to fetch chat histories: ${errorWithoutOrder.message} (Original error: ${error.message})`);
        }
        
        // Continue with dataWithoutOrder and sort in JS
        return processConversationData(dataWithoutOrder || []);
      }
      
      // Use dataWithIdOrder
      return processConversationData(dataWithIdOrder || []);
    }
    throw new Error(`Failed to fetch chat histories: ${error.message} (Code: ${error.code || 'unknown'})`);
  }

  return processConversationData(data || []);
}

// Helper function to process conversation data (extracted for reuse)
function processConversationData(data: N8nChatHistoryRow[]): WhatsappConversationSummary[] {
  if (!data || data.length === 0) {
    return [];
  }

  try {
    // Group by session_id
    const conversationsMap = new Map<string, N8nChatHistoryRow[]>();
    for (const row of data) {
      // Validate row structure
      if (!row || typeof row !== 'object') {
        console.warn('Skipping invalid row:', row);
        continue;
      }
      
      const sessionId = row.session_id;
      if (!sessionId) {
        console.warn('Skipping row with missing session_id:', row);
        continue;
      }
      
      if (!conversationsMap.has(sessionId)) {
        conversationsMap.set(sessionId, []);
      }
      conversationsMap.get(sessionId)!.push(row as N8nChatHistoryRow);
    }

    // Build conversation summaries
    const summaries: WhatsappConversationSummary[] = [];

    for (const [sessionId, rows] of conversationsMap.entries()) {
      try {
        // Sort rows by idx (or id if idx doesn't exist) to find the latest message
        const sortedRows = [...rows].sort((a, b) => {
          // Try idx first, fallback to id
          const aVal = a.idx ?? a.id ?? 0;
          const bVal = b.idx ?? b.id ?? 0;
          return bVal - aVal;
        });
        const latestRow = sortedRows[0];

        if (!latestRow) {
          console.warn(`No rows found for session ${sessionId}`);
          continue;
        }

        // Parse customer info from the latest row (assuming all rows in a session have same customer)
        const customerData = latestRow.customer;
        if (!customerData) {
          console.warn(`Missing customer data for session ${sessionId}`);
        }
        const customer = parseCustomer(customerData || {});
        const customerName = customer.name || customer.number || 'Unknown';
        // Extract phone number from session_id (format: "ML- 27693475825" or "ML-27693475825")
        const phoneFromSession = sessionId.replace(/^ML-?\s*/, '');
        const customerNumber = customer.number || phoneFromSession;

        // Parse the latest message
        const messageData = latestRow.message;
        if (!messageData) {
          console.warn(`Missing message data for session ${sessionId}`);
        }
        const message = parseMessage(messageData || {});
        const lastMessageContent = message.content;

        summaries.push({
          sessionId,
          customerName,
          customerNumber,
          lastMessageContent,
          lastMessageAt: latestRow.date_time || latestRow.created_at, // Prefer date_time, fallback to created_at
          messageCount: rows.length,
        });
      } catch (rowError) {
        console.error(`Error processing session ${sessionId}:`, rowError);
        // Continue with other sessions even if one fails
      }
    }

    // Sort by lastMessageAt (if available) or by highest idx, descending
    summaries.sort((a, b) => {
      if (a.lastMessageAt && b.lastMessageAt) {
        return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
      }
      // If no timestamp, maintain the order from the query (already sorted by idx desc)
      return 0;
    });

    return summaries;
  } catch (processingError) {
    console.error('Error processing chat histories:', processingError);
    throw new Error(`Failed to process chat histories: ${processingError instanceof Error ? processingError.message : 'Unknown error'}`);
  }
}

/**
 * Fetch all messages for a specific session_id
 * Returns messages ordered chronologically (by idx ascending)
 */
export async function getWhatsappConversationBySessionId(
  sessionId: string
): Promise<WhatsappMessage[]> {
  const supabase = getSupabaseAdmin();

  let query = supabase
    .from('chatbot_history')
    .select('*')
    .eq('session_id', sessionId);
  
  // Try to order by date_time first (most reliable), fallback to id
  try {
    query = query.order('date_time', { ascending: true });
  } catch {
    try {
      query = query.order('id', { ascending: true });
    } catch {
      // If both fail, we'll sort in JS
    }
  }
  
  const { data, error } = await query;

  if (error) {
    console.error(`Error fetching conversation for session ${sessionId}:`, error);
    console.error('Full error object:', JSON.stringify(error, null, 2));
    
    // If ordering fails, try ordering by id
    if (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist')) {
      console.warn('Column ordering failed, trying with id instead');
      const { data: dataWithIdOrder, error: errorWithIdOrder } = await supabase
        .from('chatbot_history')
        .select('*')
        .eq('session_id', sessionId)
        .order('id', { ascending: true });
      
      if (errorWithIdOrder) {
        // If id ordering also fails, try without any ordering
        console.warn('id ordering also failed, fetching without order');
        const { data: dataWithoutOrder, error: errorWithoutOrder } = await supabase
          .from('chatbot_history')
          .select('*')
          .eq('session_id', sessionId);
        
        if (errorWithoutOrder) {
          throw new Error(`Failed to fetch conversation: ${errorWithoutOrder.message} (Original error: ${error.message})`);
        }
        
        // Sort in JS if we got data
        const orderedData = dataWithoutOrder ? [...(dataWithoutOrder as N8nChatHistoryRow[])].sort((a: N8nChatHistoryRow, b: N8nChatHistoryRow) => {
          const aVal = a.date_time ? new Date(a.date_time).getTime() : (a.id ?? 0);
          const bVal = b.date_time ? new Date(b.date_time).getTime() : (b.id ?? 0);
          return aVal - bVal; // Ascending for chronological order
        }) : null;
        
        if (!orderedData || orderedData.length === 0) {
          return [];
        }
        
        return processMessages(orderedData, sessionId);
      }
      
      // Use dataWithIdOrder
      return processMessages(dataWithIdOrder || [], sessionId);
    }
    
    throw new Error(`Failed to fetch conversation: ${error.message} (Code: ${error.code || 'unknown'})`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Sort by date_time if available, otherwise by id
  const orderedData = data ? [...(data as N8nChatHistoryRow[])].sort((a: N8nChatHistoryRow, b: N8nChatHistoryRow) => {
    const aVal = a.date_time ? new Date(a.date_time).getTime() : (a.id ?? 0);
    const bVal = b.date_time ? new Date(b.date_time).getTime() : (b.id ?? 0);
    return aVal - bVal; // Ascending for chronological order
  }) : null;

  if (!orderedData || orderedData.length === 0) {
    return [];
  }

  return processMessages(orderedData, sessionId);
}

// Helper function to process messages
function processMessages(data: N8nChatHistoryRow[], sessionId: string): WhatsappMessage[] {
  // Parse customer info from the first row (assuming all rows have same customer)
  const firstRow = data[0];
  const customer = parseCustomer(firstRow.customer || {});
  const customerName = customer.name || customer.number || 'Unknown';
  // Extract phone number from session_id (format: "ML- 27693475825" or "ML-27693475825")
  const phoneFromSession = sessionId.replace(/^ML-?\s*/, '');
  const customerNumber = customer.number || phoneFromSession;

  // Parse all messages
  const messages: WhatsappMessage[] = data.map((row: N8nChatHistoryRow) => {
    const message = parseMessage(row.message || {});
    return {
      id: row.id,
      idx: row.idx ?? row.id ?? 0,
      sessionId: row.session_id,
      senderType: message.type,
      content: message.content,
      customerName,
      customerNumber,
      createdAt: row.date_time || row.created_at, // Prefer date_time, fallback to created_at
    };
  });

  return messages;
}

