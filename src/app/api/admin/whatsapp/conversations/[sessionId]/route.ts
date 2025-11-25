import { NextRequest, NextResponse } from 'next/server';
import { isAuthed, noIndexHeaders } from '@/lib/adminAuth';
import { getWhatsappConversationBySessionId } from '@/lib/chatHistories';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  if (!isAuthed(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: noIndexHeaders() }
    );
  }

  try {
    const { sessionId: sessionIdParam } = await params;
    const sessionId = decodeURIComponent(sessionIdParam);
    const messages = await getWhatsappConversationBySessionId(sessionId);
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
    console.error('WhatsApp conversation API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500, headers: noIndexHeaders() }
    );
  }
}

