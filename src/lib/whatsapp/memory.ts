import { getPostgresPool } from '../postgres';

const CONTEXT_WINDOW_LENGTH = 20;

export interface ChatMessage {
  role: 'human' | 'ai';
  content: string;
}

/**
 * Get chat history from Postgres n8n_chat_histories table
 * Returns the last N messages for a given session
 * The table structure: idx, id, session_id, message (JSON string), customer
 */
export async function getChatHistory(sessionId: string): Promise<ChatMessage[]> {
  const pool = getPostgresPool();
  
  try {
    console.log(`Fetching chat history from Postgres for session: ${sessionId}`);
    // Query the n8n_chat_histories table
    // Table structure: idx, id, session_id, message (JSON string with type and content), customer
    const query = `
      SELECT idx, id, session_id, message, customer
      FROM n8n_chat_histories 
      WHERE session_id = $1 
      ORDER BY idx ASC
      LIMIT $2
    `;
    
    const result = await pool.query(query, [sessionId, CONTEXT_WINDOW_LENGTH]);
    
    if (result.rows.length === 0) {
      console.log(`No chat history found in Postgres for session: ${sessionId}`);
      return [];
    }
    
    console.log(`Found ${result.rows.length} chat history records in Postgres for session: ${sessionId}`);
    
    // Convert rows to ChatMessage format
    const chatMessages: ChatMessage[] = [];
    
    for (const row of result.rows) {
      try {
        // Parse the message JSON string
        const messageData = typeof row.message === 'string' 
          ? JSON.parse(row.message) 
          : row.message;
        
        if (!messageData || typeof messageData !== 'object') {
          continue;
        }
        
        // Extract content and type from message
        const content = messageData.content || '';
        const messageType = messageData.type || 'human';
        const role = messageType === 'ai' ? 'ai' : 'human';
        
        if (content && typeof content === 'string' && content.trim().length > 0) {
          chatMessages.push({
            role,
            content: content.trim(),
          });
        }
      } catch (error) {
        console.error('Error parsing message from row:', error);
        // Skip this message and continue
      }
    }
    
    console.log(`Parsed ${chatMessages.length} messages from Postgres history`);
    return chatMessages;
  } catch (error) {
    console.error('Error fetching chat history from Postgres:', error);
    console.error('Falling back to empty history - memory will not be available');
    // If table doesn't exist or query fails, return empty array
    // This allows the system to work even without Postgres memory
    return [];
  }
}

/**
 * Save a message to Postgres n8n_chat_histories table
 * Table structure: idx, id, session_id, message (JSON string), customer
 * Each message is stored as a separate row
 */
export async function saveChatMessage(sessionId: string, role: 'human' | 'ai', content: string): Promise<void> {
  const pool = getPostgresPool();
  
  try {
    console.log(`Saving ${role} message to Postgres memory for session: ${sessionId}`);
    
    // Get the next idx value
    const maxIdxQuery = `
      SELECT MAX(idx) as max_idx
      FROM n8n_chat_histories
      WHERE session_id = $1
    `;
    const maxIdxResult = await pool.query(maxIdxQuery, [sessionId]);
    const nextIdx = (maxIdxResult.rows[0]?.max_idx || 0) + 1;
    
    // Prepare message JSON
    const messageJson = {
      type: role,
      content: content,
      additional_kwargs: {},
      response_metadata: {},
    };
    
    // Insert new row for this message
    const insertQuery = `
      INSERT INTO n8n_chat_histories (session_id, idx, message, customer)
      VALUES ($1, $2, $3, NULL)
    `;
    
    await pool.query(insertQuery, [sessionId, nextIdx, JSON.stringify(messageJson)]);
    console.log(`Successfully saved ${role} message to Postgres memory (idx: ${nextIdx})`);
  } catch (error) {
    console.error('Error saving chat message to Postgres:', error);
    console.error('Memory will not be persisted, but conversation will continue');
    // Don't throw - we'll still save to Supabase
    // This is a best-effort operation
  }
}

