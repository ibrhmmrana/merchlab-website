import { getPostgresPool } from '../postgres';

const CONTEXT_WINDOW_LENGTH = 20;

export interface ChatMessage {
  role: 'human' | 'ai';
  content: string;
}

/**
 * Get chat history from Postgres n8n_chat_histories table
 * Returns the last N messages for a given session
 */
export async function getChatHistory(sessionId: string): Promise<ChatMessage[]> {
  const pool = getPostgresPool();
  
  try {
    // Query the n8n_chat_histories table
    // Based on error hint, the column is likely "message" (singular), not "messages"
    // Try different possible column names for messages
    const query = `
      SELECT message, messages, history, chat_history
      FROM n8n_chat_histories 
      WHERE session_id = $1 
      ORDER BY created_at DESC NULLS LAST, updated_at DESC NULLS LAST
      LIMIT 1
    `;
    
    const result = await pool.query(query, [sessionId]);
    
    if (result.rows.length === 0) {
      return [];
    }
    
    // Try to get messages from different possible column names
    const row = result.rows[0] as Record<string, unknown>;
    let messages: unknown[] = [];
    
    // Try "message" first (singular, as suggested by error hint)
    if (row.message) {
      if (Array.isArray(row.message)) {
        messages = row.message;
      } else if (typeof row.message === 'string') {
        try {
          const parsed = JSON.parse(row.message);
          messages = Array.isArray(parsed) ? parsed : [];
        } catch {
          messages = [];
        }
      }
    } else if (row.messages && Array.isArray(row.messages)) {
      messages = row.messages;
    } else if (row.history && Array.isArray(row.history)) {
      messages = row.history;
    } else if (row.chat_history && Array.isArray(row.chat_history)) {
      messages = row.chat_history;
    } else if (row.messages && typeof row.messages === 'string') {
      // If it's a JSON string, parse it
      try {
        const parsed = JSON.parse(row.messages);
        if (Array.isArray(parsed)) {
          messages = parsed;
        }
      } catch {
        messages = [];
      }
    }
    
    if (!Array.isArray(messages)) {
      return [];
    }
    
    // Get the last N messages (context window)
    const recentMessages = messages.slice(-CONTEXT_WINDOW_LENGTH);
    
    // Convert to ChatMessage format
    // Handle different possible message structures
    return recentMessages.map((msg: unknown) => {
      if (!msg || typeof msg !== 'object') {
        return null;
      }
      const msgObj = msg as Record<string, unknown>;
      // Try different possible field names
      const content = msgObj.content || msgObj.text || msgObj.message || '';
      const role = msgObj.role === 'ai' || msgObj.type === 'ai' ? 'ai' : 'human';
      
      return {
        role,
        content: String(content),
      };
    }).filter((msg): msg is ChatMessage => msg !== null && msg.content.length > 0);
  } catch (error) {
    console.error('Error fetching chat history:', error);
    // If table doesn't exist or query fails, return empty array
    // This allows the system to work even without Postgres memory
    return [];
  }
}

/**
 * Save a message to Postgres n8n_chat_histories table
 */
export async function saveChatMessage(sessionId: string, role: 'human' | 'ai', content: string): Promise<void> {
  const pool = getPostgresPool();
  
  try {
    // First, try to get existing messages for this session
    // Based on error hint, the column is likely "message" (singular)
    const selectQuery = `
      SELECT message, messages, history, chat_history, created_at, updated_at
      FROM n8n_chat_histories 
      WHERE session_id = $1 
      ORDER BY created_at DESC NULLS LAST, updated_at DESC NULLS LAST
      LIMIT 1
    `;
    
    const selectResult = await pool.query(selectQuery, [sessionId]);
    
    let messages: unknown[] = [];
    let messagesColumn = 'message'; // Default to singular (as per error hint)
    
    if (selectResult.rows.length > 0) {
      const row = selectResult.rows[0] as Record<string, unknown>;
      // Try to find which column has the messages - try "message" first
      if (row.message) {
        if (Array.isArray(row.message)) {
          messages = row.message;
        } else if (typeof row.message === 'string') {
          try {
            const parsed = JSON.parse(row.message);
            messages = Array.isArray(parsed) ? parsed : [];
          } catch {
            messages = [];
          }
        }
        messagesColumn = 'message';
      } else if (row.messages) {
        if (Array.isArray(row.messages)) {
          messages = row.messages;
        } else if (typeof row.messages === 'string') {
          try {
            const parsed = JSON.parse(row.messages);
            messages = Array.isArray(parsed) ? parsed : [];
          } catch {
            messages = [];
          }
        }
        messagesColumn = 'messages';
      } else if (row.history) {
        if (Array.isArray(row.history)) {
          messages = row.history;
        } else if (typeof row.history === 'string') {
          try {
            const parsed = JSON.parse(row.history);
            messages = Array.isArray(parsed) ? parsed : [];
          } catch {
            messages = [];
          }
        }
        messagesColumn = 'history';
      } else if (row.chat_history) {
        if (Array.isArray(row.chat_history)) {
          messages = row.chat_history;
        } else if (typeof row.chat_history === 'string') {
          try {
            const parsed = JSON.parse(row.chat_history);
            messages = Array.isArray(parsed) ? parsed : [];
          } catch {
            messages = [];
          }
        }
        messagesColumn = 'chat_history';
      }
    }
    
    // Add the new message
    messages.push({
      role,
      content,
      timestamp: new Date().toISOString(),
    });
    
    // Update or insert
    if (selectResult.rows.length > 0) {
      // Update existing record
      const updateQuery = `
        UPDATE n8n_chat_histories 
        SET ${messagesColumn} = $1, updated_at = NOW() 
        WHERE session_id = $2
      `;
      await pool.query(updateQuery, [JSON.stringify(messages), sessionId]);
    } else {
      // Insert new record
      const insertQuery = `
        INSERT INTO n8n_chat_histories (session_id, ${messagesColumn}, created_at, updated_at)
        VALUES ($1, $2, NOW(), NOW())
      `;
      await pool.query(insertQuery, [sessionId, JSON.stringify(messages)]);
    }
  } catch (error) {
    console.error('Error saving chat message to Postgres:', error);
    // Don't throw - we'll still save to Supabase
    // This is a best-effort operation
  }
}

