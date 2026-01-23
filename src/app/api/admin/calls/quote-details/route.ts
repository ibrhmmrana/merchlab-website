import { NextRequest, NextResponse } from 'next/server';
import { isAuthed, noIndexHeaders } from '@/lib/adminAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

function pickStr(obj: unknown, keys: string[]): string {
  if (!obj || typeof obj !== 'object') return '';
  for (const key of keys) {
    const value = (obj as Record<string, unknown>)[key];
    if (typeof value === 'string' && value) return value;
  }
  return '';
}

export async function GET(request: NextRequest) {
  if (!isAuthed(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: noIndexHeaders() }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const quoteNumber = searchParams.get('quoteNumber');

    if (!quoteNumber) {
      return NextResponse.json(
        { error: 'Quote number is required' },
        { status: 400, headers: noIndexHeaders() }
      );
    }

    const supabase = getSupabaseAdmin();
    
    const { data: quoteData, error: quoteError } = await supabase
      .from('quote_docs')
      .select('quote_no, payload, created_at')
      .eq('quote_no', quoteNumber)
      .single();

    if (quoteError || !quoteData) {
      // Try with different formats
      const variations = [
        quoteNumber,
        quoteNumber.toUpperCase(),
        quoteNumber.toLowerCase(),
      ];

      for (const variation of variations) {
        const { data: altData } = await supabase
          .from('quote_docs')
          .select('quote_no, payload, created_at')
          .eq('quote_no', variation)
          .single();

        if (altData) {
          const payload = parsePayload(altData.payload);
          if (!payload) {
            return NextResponse.json(
              { error: 'Invalid quote payload' },
              { status: 400, headers: noIndexHeaders() }
            );
          }

          // Extract customer info
          const customerUnknown = (payload?.enquiryCustomer ?? payload?.customer) as unknown;
          const firstName = pickStr(customerUnknown, ['firstName', 'first_name']);
          const phone = pickStr(customerUnknown, ['telephoneNumber', 'telephone', 'phone', 'phoneNumber']);

          return NextResponse.json(
            {
              quoteNumber: altData.quote_no,
              firstName: firstName || '',
              phone: phone || '',
              createdAt: altData.created_at,
            },
            { headers: noIndexHeaders() }
          );
        }
      }

      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404, headers: noIndexHeaders() }
      );
    }

    const payload = parsePayload(quoteData.payload);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid quote payload' },
        { status: 400, headers: noIndexHeaders() }
      );
    }

    // Extract customer info
    const customerUnknown = (payload?.enquiryCustomer ?? payload?.customer) as unknown;
    const firstName = pickStr(customerUnknown, ['firstName', 'first_name']);
    const phone = pickStr(customerUnknown, ['telephoneNumber', 'telephone', 'phone', 'phoneNumber']);

    return NextResponse.json(
      {
        quoteNumber: quoteData.quote_no,
        firstName: firstName || '',
        phone: phone || '',
        createdAt: quoteData.created_at,
      },
      { headers: noIndexHeaders() }
    );
  } catch (err) {
    console.error('Unexpected error fetching quote details:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: noIndexHeaders() }
    );
  }
}
