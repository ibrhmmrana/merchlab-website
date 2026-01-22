import { NextRequest, NextResponse } from 'next/server';
import { isAuthed, noIndexHeaders } from '@/lib/adminAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  if (!isAuthed(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: noIndexHeaders() }
    );
  }

  try {
    const supabase = getSupabaseAdmin();
    
    // Fetch last 5 quotes ordered by most recent first
    const { data, error } = await supabase
      .from('quote_docs')
      .select('quote_no, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Error fetching recent quotes:', error);
      return NextResponse.json(
        { error: 'Failed to fetch quotes', details: error.message },
        { status: 500, headers: noIndexHeaders() }
      );
    }

    return NextResponse.json(
      { quotes: data || [] },
      { headers: noIndexHeaders() }
    );
  } catch (err) {
    console.error('Unexpected error fetching recent quotes:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: noIndexHeaders() }
    );
  }
}
