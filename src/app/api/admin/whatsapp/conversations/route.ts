import { NextRequest, NextResponse } from 'next/server';
import { isAuthed, noIndexHeaders } from '@/lib/adminAuth';
import { getWhatsappConversations } from '@/lib/chatHistories';

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
    const conversations = await getWhatsappConversations();
    return NextResponse.json(
      { conversations },
      {
        headers: {
          ...noIndexHeaders(),
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('WhatsApp conversations API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Full error:', error);
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500, headers: noIndexHeaders() }
    );
  }
}

