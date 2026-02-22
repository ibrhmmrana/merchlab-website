import { NextRequest, NextResponse } from 'next/server';
import { isAuthed, noIndexHeaders } from '@/lib/adminAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

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
    
    // Test 1: Try to query the table
    const { data, error, count } = await supabase
      .from('chatbot_history')
      .select('*', { count: 'exact' })
      .limit(1);

    if (error) {
      return NextResponse.json({
        success: false,
        error: {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        },
        suggestions: [
          error.code === '42P01' ? 'Table "chatbot_history" does not exist. Check the table name in Supabase.' : null,
          error.code === '42501' ? 'Permission denied. Check RLS policies and service role key.' : null,
          'Verify the table name matches exactly (case-sensitive)',
          'Check that SUPABASE_SERVICE_ROLE_KEY is set correctly',
        ].filter(Boolean),
      }, { status: 200, headers: noIndexHeaders() });
    }

    // Test 2: Check if we got any data
    const hasData = data && data.length > 0;
    const sampleRow = hasData ? data[0] : null;

    // Test 3: Verify expected columns exist
    const expectedColumns = ['id', 'idx', 'session_id', 'message', 'customer'];
    const actualColumns = sampleRow ? Object.keys(sampleRow) : [];
    const missingColumns = expectedColumns.filter(col => !actualColumns.includes(col));

    return NextResponse.json({
      success: true,
      tableExists: true,
      rowCount: count || 0,
      hasData,
      sampleRow: sampleRow ? {
        id: sampleRow.id,
        idx: sampleRow.idx,
        session_id: sampleRow.session_id,
        has_message: !!sampleRow.message,
        has_customer: !!sampleRow.customer,
        created_at: sampleRow.created_at,
      } : null,
      actualColumns,
      missingColumns: missingColumns.length > 0 ? missingColumns : undefined,
      allColumnsPresent: missingColumns.length === 0,
    }, { headers: noIndexHeaders() });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500, headers: noIndexHeaders() });
  }
}

