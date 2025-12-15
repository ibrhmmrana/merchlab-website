import { NextRequest, NextResponse } from 'next/server';
import { isAuthed, noIndexHeaders } from '@/lib/adminAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { quoteNo: string } }
) {
  if (!isAuthed(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: noIndexHeaders() }
    );
  }

  try {
    const quoteNo = params.quoteNo;

    if (!quoteNo) {
      return NextResponse.json(
        { error: 'Quote number is required' },
        { status: 400, headers: noIndexHeaders() }
      );
    }

    const supabase = getSupabaseAdmin();

    // Delete the quote from the database
    const { error } = await supabase
      .from('quote_docs')
      .delete()
      .eq('quote_no', quoteNo);

    if (error) {
      console.error('Error deleting quote:', error);
      return NextResponse.json(
        { error: 'Failed to delete quote' },
        { status: 500, headers: noIndexHeaders() }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Quote deleted successfully' },
      { status: 200, headers: noIndexHeaders() }
    );
  } catch (error) {
    console.error('Error in DELETE /api/admin/quotes/[quoteNo]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: noIndexHeaders() }
    );
  }
}

