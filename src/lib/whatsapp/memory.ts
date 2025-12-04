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
    // Table structure: id, session_id, message (JSON string with type and content), customer
    // Note: idx column may or may not exist, so we use id for ordering
    // Get the most recent messages (DESC) then reverse to chronological order
    const query = `
      SELECT id, session_id, message, customer
      FROM n8n_chat_histories 
      WHERE session_id = $1 
      ORDER BY id DESC
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
    // Reverse to get chronological order (oldest to newest) for OpenAI context
    return chatMessages.reverse();
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
    
    // Get the next id value (use id instead of idx since idx might not exist)
    const maxIdQuery = `
      SELECT MAX(id) as max_id
      FROM n8n_chat_histories
      WHERE session_id = $1
    `;
    const maxIdResult = await pool.query(maxIdQuery, [sessionId]);
    const nextId = (maxIdResult.rows[0]?.max_id || 0) + 1;
    
    // Prepare message JSON
    const messageJson = {
      type: role,
      content: content,
      additional_kwargs: {},
      response_metadata: {},
    };
    
    // Insert new row for this message
    // Try with idx first, fallback to just id if idx doesn't exist
    try {
      const insertQueryWithIdx = `
        INSERT INTO n8n_chat_histories (session_id, idx, message, customer)
        VALUES ($1, $2, $3, NULL)
      `;
      await pool.query(insertQueryWithIdx, [sessionId, nextId, JSON.stringify(messageJson)]);
      console.log(`Successfully saved ${role} message to Postgres memory (idx: ${nextId})`);
    } catch (error) {
      // If idx column doesn't exist, insert without it
      console.log('idx column not found, inserting without idx');
      const insertQueryWithoutIdx = `
        INSERT INTO n8n_chat_histories (session_id, message, customer)
        VALUES ($1, $2, NULL)
      `;
      await pool.query(insertQueryWithoutIdx, [sessionId, JSON.stringify(messageJson)]);
      console.log(`Successfully saved ${role} message to Postgres memory (without idx)`);
    }
  } catch (error) {
    console.error('Error saving chat message to Postgres:', error);
    console.error('Memory will not be persisted, but conversation will continue');
    // Don't throw - we'll still save to Supabase
    // This is a best-effort operation
  }
}

