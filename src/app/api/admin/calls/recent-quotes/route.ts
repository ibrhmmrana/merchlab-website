import { NextRequest, NextResponse } from 'next/server';
import { isAuthed, noIndexHeaders } from '@/lib/adminAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { parseGrandTotal } from '@/server/admin/metrics';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  if (!(await isAuthed())) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: noIndexHeaders() }
    );
  }

  try {
    const supabase = getSupabaseAdmin();
    
    // Fetch all quotes ordered by most recent first
    const { data, error } = await supabase
      .from('quote_docs')
      .select('quote_no, created_at, payload')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching quotes:', error);
      return NextResponse.json(
        { error: 'Failed to fetch quotes', details: error.message },
        { status: 500, headers: noIndexHeaders() }
      );
    }

    // Extract total value from each quote's payload
    const quotesWithValue = (data || []).map((quote) => {
      const value = parseGrandTotal(quote.payload);
      return {
        quote_no: quote.quote_no,
        created_at: quote.created_at,
        value: value || 0,
      };
    });

    return NextResponse.json(
      { quotes: quotesWithValue },
      { headers: noIndexHeaders() }
    );
  } catch (err) {
    console.error('Unexpected error fetching quotes:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: noIndexHeaders() }
    );
  }
}
