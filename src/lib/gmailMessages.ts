import { getSupabaseAdmin } from './supabaseAdmin';

// Raw database row type
export type GmailMessageRow = {
  id: number;
  gmail_id: string;
  thread_id: string;
  from_address: string;
  from_name: string | null;
  to_address: string | null;
  to_name: string | null;
  subject: string | null;
  snippet: string | null;
  date_time: string; // timestamptz
  text_plain: string | null;
  text_html: string | null;
};

// Clean, typed message type
export type GmailMessage = {
  id: number;
  gmailId: string;
  threadId: string;
  fromAddress: string;
  fromName: string | null;
  toAddress: string | null;
  toName: string | null;
  subject: string | null;
  snippet: string | null;
  dateTime: string;
  textPlain: string | null;
  textHtml: string | null;
};

// Options for fetching inbox messages
export type InboxOptions = {
  search?: string;
  limit?: number;
  page?: number;
  toAddress?: string; // Default: 'hello@merchlab.io'
};

/**
 * Fetch inbox messages from gmail_messages table
 * Filters to inbound emails to hello@merchlab.io by default
 */
export async function getInboxMessages(options: InboxOptions = {}): Promise<GmailMessage[]> {
  const {
    search,
    limit = 100,
    page = 1,
    toAddress = 'hello@merchlab.io',
  } = options;

  try {
    const supabase = getSupabaseAdmin();

    // Build query
    let query = supabase
      .from('gmail_messages')
      .select('*')
      .eq('to_address', toAddress)
      .order('date_time', { ascending: false });

    // Apply search filter if provided
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      // Use or() with proper PostgREST syntax
      query = query.or(`subject.ilike.${searchTerm},from_name.ilike.${searchTerm},from_address.ilike.${searchTerm}`);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching Gmail messages:', error);
      
      // Handle specific error codes
      if (error.code === '42P01') {
        throw new Error(`Table "gmail_messages" does not exist. Please create the table in Supabase.`);
      }
      if (error.code === '42501') {
        throw new Error(`Permission denied. Please check Supabase RLS policies and service role key permissions.`);
      }
      
      throw new Error(`Failed to fetch Gmail messages: ${error.message}`);
    }

    // Transform rows to clean GmailMessage type
    const messages: GmailMessage[] = (data || []).map((row: GmailMessageRow) => ({
      id: row.id,
      gmailId: row.gmail_id,
      threadId: row.thread_id,
      fromAddress: row.from_address,
      fromName: row.from_name,
      toAddress: row.to_address,
      toName: row.to_name,
      subject: row.subject,
      snippet: row.snippet,
      dateTime: row.date_time,
      textPlain: row.text_plain,
      textHtml: row.text_html,
    }));

    return messages;
  } catch (error) {
    console.error('getInboxMessages error:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to fetch Gmail messages: ${String(error)}`);
  }
}

/**
 * Fetch a single email by ID
 */
export async function getEmailById(id: number): Promise<GmailMessage | null> {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('gmail_messages')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching email by ID:', error);
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      throw new Error(`Failed to fetch email: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    const row = data as GmailMessageRow;
    return {
      id: row.id,
      gmailId: row.gmail_id,
      threadId: row.thread_id,
      fromAddress: row.from_address,
      fromName: row.from_name,
      toAddress: row.to_address,
      toName: row.to_name,
      subject: row.subject,
      snippet: row.snippet,
      dateTime: row.date_time,
      textPlain: row.text_plain,
      textHtml: row.text_html,
    };
  } catch (error) {
    console.error('getEmailById error:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to fetch email: ${String(error)}`);
  }
}

