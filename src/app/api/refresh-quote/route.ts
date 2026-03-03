import { NextRequest, NextResponse } from 'next/server';

const WEBHOOK_RESEND_QUOTE_URL = 'https://ai.intakt.co.za/webhook/resend-quote';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const quoteNo = body.quoteNo;

    if (!quoteNo || typeof quoteNo !== 'string') {
      return NextResponse.json({ error: 'Quote number is required' }, { status: 400 });
    }

    const response = await fetch(WEBHOOK_RESEND_QUOTE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quoteNo }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      return NextResponse.json(
        { error: `Failed to resend quote: ${response.status} ${errorText}` },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, message: 'Quote resent successfully' });
  } catch (error) {
    console.error('Refresh quote error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to resend quote' },
      { status: 500 }
    );
  }
}
