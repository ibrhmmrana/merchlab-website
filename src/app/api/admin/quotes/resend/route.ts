import { NextRequest, NextResponse } from 'next/server';
import { isAuthed, noIndexHeaders } from '@/lib/adminAuth';

const WEBHOOK_RESEND_QUOTE_URL = 'https://ai.intakt.co.za/webhook/resend-quote';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    if (!isAuthed(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: noIndexHeaders() }
      );
    }

    const body = await request.json();
    const { quoteNo } = body;

    if (!quoteNo || typeof quoteNo !== 'string') {
      return NextResponse.json({ error: 'Quote number is required' }, { status: 400 });
    }

    // Send quote number to webhook
    const response = await fetch(WEBHOOK_RESEND_QUOTE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ quoteNo }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      return NextResponse.json(
        { error: `Webhook request failed: ${response.status} ${errorText}` },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, message: 'Quote resent successfully' });
  } catch (error) {
    console.error('Error resending quote:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to resend quote' },
      { status: 500 }
    );
  }
}

