import { NextRequest, NextResponse } from 'next/server';
import { isAuthed, noIndexHeaders } from '@/lib/adminAuth';

// TODO: Update this URL once the resend-invoice webhook is created and active
// For now, using the quotes webhook as a fallback - it may need to be updated to handle invoices
const WEBHOOK_RESEND_INVOICE_URL = process.env.WEBHOOK_RESEND_INVOICE_URL || 'https://ai.intakt.co.za/webhook/resend-quote';

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
    const { invoiceNo } = body;

    if (!invoiceNo || typeof invoiceNo !== 'string') {
      return NextResponse.json({ error: 'Invoice number is required' }, { status: 400 });
    }

    // Send invoice number to webhook
    // Note: Currently using the quotes webhook as fallback - may need to send as quoteNo for compatibility
    // Once the resend-invoice webhook is created, this should be updated
    const response = await fetch(WEBHOOK_RESEND_INVOICE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        invoiceNo,
        // Also send as quoteNo for compatibility with quotes webhook if needed
        ...(WEBHOOK_RESEND_INVOICE_URL.includes('resend-quote') ? { quoteNo: invoiceNo } : {})
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      return NextResponse.json(
        { error: `Webhook request failed: ${response.status} ${errorText}` },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, message: 'Invoice resent successfully' });
  } catch (error) {
    console.error('Error resending invoice:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to resend invoice' },
      { status: 500 }
    );
  }
}

