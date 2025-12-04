import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Debug endpoint to test webhook reception
 * GET /api/whatsapp/debug - Returns recent webhook logs (if stored)
 * POST /api/whatsapp/debug - Echoes the request body for testing
 */
export async function GET() {
  return NextResponse.json({
    message: 'WhatsApp webhook debug endpoint',
    status: 'active',
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Log and return the received data
    console.log('=== Debug Webhook Test ===');
    console.log('Received body:', JSON.stringify(body, null, 2));
    
    return NextResponse.json({
      success: true,
      received: body,
      timestamp: new Date().toISOString(),
      parsed: {
        hasEvent: !!body.event,
        hasEventValue: !!body.event?.value,
        hasBodyEvent: !!body.body?.event?.value,
        eventKeys: body.event ? Object.keys(body.event) : [],
        bodyKeys: Object.keys(body),
      },
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 400 });
  }
}

