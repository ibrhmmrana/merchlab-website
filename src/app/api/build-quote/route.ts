import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const WEBHOOK_URL_SEND = 'https://ai.intakt.co.za/webhook/build-a-quote';
const WEBHOOK_URL_SAVE = 'https://ai.intakt.co.za/webhook/build-and-save';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { payload, action } = body;

    if (!payload) {
      return NextResponse.json(
        { error: 'Payload is required' },
        { status: 400 }
      );
    }

    if (!action || (action !== 'save' && action !== 'send')) {
      return NextResponse.json(
        { error: 'Action must be "save" or "send"' },
        { status: 400 }
      );
    }

    // Use different webhook based on action
    const webhookUrl = action === 'save' ? WEBHOOK_URL_SAVE : WEBHOOK_URL_SEND;

    // Send to webhook
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Webhook error:', errorText);
      return NextResponse.json(
        { error: `Webhook failed: ${errorText}` },
        { status: response.status }
      );
    }

    const result = await response.json().catch(() => ({}));

    return NextResponse.json({
      success: true,
      action,
      message: action === 'save' ? 'Quote saved successfully' : 'Quote sent successfully',
      data: result,
    });
  } catch (error) {
    console.error('Build quote error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

