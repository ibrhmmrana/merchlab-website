import { NextRequest, NextResponse } from 'next/server';
import { isAuthed, noIndexHeaders } from '@/lib/adminAuth';
import { getInboxMessages } from '@/lib/gmailMessages';

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
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 100;
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
    const toAddress = searchParams.get('toAddress') || undefined;

    const messages = await getInboxMessages({
      search,
      limit,
      page,
      toAddress,
    });

    return NextResponse.json(
      { messages },
      {
        headers: {
          ...noIndexHeaders(),
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('Gmail inbox API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { 
        error: errorMessage,
      },
      { status: 500, headers: noIndexHeaders() }
    );
  }
}

