import { NextRequest, NextResponse } from 'next/server';
import { isAuthed, noIndexHeaders } from '@/lib/adminAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ callId: string }> }
) {
  if (!isAuthed(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: noIndexHeaders() }
    );
  }

  try {
    const { callId } = await params;
    const callIdNum = parseInt(callId, 10);

    if (isNaN(callIdNum)) {
      return NextResponse.json(
        { error: 'Invalid call ID' },
        { status: 400, headers: noIndexHeaders() }
      );
    }

    const supabase = getSupabaseAdmin();

    // Delete the call record
    const { error } = await supabase
      .from('call_records')
      .delete()
      .eq('id', callIdNum);

    if (error) {
      console.error('Error deleting call record:', error);
      return NextResponse.json(
        { error: 'Failed to delete call record', details: error.message },
        { status: 500, headers: noIndexHeaders() }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Call record deleted successfully' },
      { headers: noIndexHeaders() }
    );
  } catch (err) {
    console.error('Unexpected error deleting call record:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: noIndexHeaders() }
    );
  }
}
