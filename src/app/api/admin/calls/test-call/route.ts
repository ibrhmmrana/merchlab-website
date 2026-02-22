import { NextRequest, NextResponse } from 'next/server';
import { isAuthed, noIndexHeaders } from '@/lib/adminAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ASSISTANT_ID = 'e3f1f186-ac3d-46dd-9aa5-2c13aae25bc6';
const PHONE_NUMBER_ID = 'e724f88a-4364-4ba4-a070-1dd183b77594';
const WEBHOOK_URL = 'https://ai.intakt.co.za/webhook/test-ai-call';
const STORAGE_BASE_URL = 'https://fxsqdpmmddcidjwzxtpc.supabase.co/storage/v1/object/audit-reports';

function formatPdfUrl(quoteNo: string): string {
  return `${STORAGE_BASE_URL}/${quoteNo}.pdf`;
}

function formatItemsSummary(items: Array<{
  description: string;
  colour: string;
  size: string;
  requested_qty: number;
}>): string {
  return items.map(item => 
    `${item.description} (${item.colour} - ${item.size} - ${item.requested_qty})`
  ).join(', ');
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
  }).format(value).replace(/\s/g, '');
}

function parsePayload(payload: unknown): Record<string, unknown> | null {
  if (typeof payload === 'string') {
    try {
      return JSON.parse(payload) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  return (payload && typeof payload === 'object') ? payload as Record<string, unknown> : null;
}

export async function POST(request: NextRequest) {
  if (!(await isAuthed())) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: noIndexHeaders() }
    );
  }

  try {
    const { phoneNumber, firstName, quoteNumber } = await request.json();

    if (!phoneNumber || !firstName || !quoteNumber) {
      return NextResponse.json(
        { error: 'Missing required fields: phoneNumber, firstName, quoteNumber' },
        { status: 400, headers: noIndexHeaders() }
      );
    }

    // Fetch quote details from quote_docs
    const supabase = getSupabaseAdmin();
    let quoteData: { quote_no: string; payload: unknown } | null = null;
    
    const { data: initialQuoteData, error: quoteError } = await supabase
      .from('quote_docs')
      .select('quote_no, payload')
      .eq('quote_no', quoteNumber)
      .single();

    if (quoteError || !initialQuoteData) {
      // Try with different formats
      const variations = [
        quoteNumber,
        quoteNumber.toUpperCase(),
        quoteNumber.toLowerCase(),
      ];

      for (const variation of variations) {
        const { data: altData } = await supabase
          .from('quote_docs')
          .select('quote_no, payload')
          .eq('quote_no', variation)
          .single();

        if (altData) {
          quoteData = altData;
          break;
        }
      }

      if (!quoteData) {
        return NextResponse.json(
          { error: 'Quote not found' },
          { status: 404, headers: noIndexHeaders() }
        );
      }
    } else {
      quoteData = initialQuoteData;
    }

    const payload = parsePayload(quoteData.payload);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid quote payload' },
        { status: 400, headers: noIndexHeaders() }
      );
    }

    // Extract quote details
    const items = (payload.items as Array<{
      description: string;
      colour: string;
      size: string;
      requested_qty: number;
    }>) || [];

    const totals = payload.totals as { grand_total: number } | undefined;
    const grandTotal = totals?.grand_total || 0;

    // Format phone number (remove +, spaces, and other non-digit characters)
    let callerNumber = phoneNumber.replace(/[^\d]/g, '');
    
    // Ensure it starts with country code 27
    if (!callerNumber.startsWith('27')) {
      // If it starts with 0, replace with 27
      if (callerNumber.startsWith('0')) {
        callerNumber = '27' + callerNumber.substring(1);
      } else {
        // Otherwise, prepend 27
        callerNumber = '27' + callerNumber;
      }
    }

    // Build the webhook payload
    const webhookPayload = {
      assistantId: ASSISTANT_ID,
      phoneNumberId: PHONE_NUMBER_ID,
      customer: {
        number: `+${callerNumber}`,
        name: firstName,
      },
      assistantOverrides: {
        variableValues: {
          callerNumber: callerNumber,
          quoteNumber: quoteData.quote_no,
          quoteTotal: formatCurrency(grandTotal),
          quotePdfUrl: formatPdfUrl(quoteData.quote_no),
          itemsSummary: formatItemsSummary(items),
        },
      },
    };

    // Send to webhook
    const webhookResponse = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload),
    });

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error('Webhook error:', errorText);
      return NextResponse.json(
        { error: 'Failed to initiate test call', details: errorText },
        { status: 500, headers: noIndexHeaders() }
      );
    }

    return NextResponse.json(
      { 
        success: true,
        message: 'Test call initiated successfully',
        payload: webhookPayload,
      },
      { headers: noIndexHeaders() }
    );
  } catch (err) {
    console.error('Unexpected error initiating test call:', err);
    return NextResponse.json(
      { error: 'Internal server error', details: err instanceof Error ? err.message : String(err) },
      { status: 500, headers: noIndexHeaders() }
    );
  }
}
