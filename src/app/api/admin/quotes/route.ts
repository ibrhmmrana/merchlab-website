import { NextRequest, NextResponse } from 'next/server';
import { isAuthed, noIndexHeaders } from '@/lib/adminAuth';
import { readQuotes, parseGrandTotal, type PeriodKey } from '@/server/admin/metrics';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const STORAGE_BASE_URL = 'https://fxsqdpmmddcidjwzxtpc.supabase.co/storage/v1/object/public/audit-reports';

function formatPdfUrl(id: string): string {
  return `${STORAGE_BASE_URL}/${id}.pdf`;
}

function parsePayload(payload: any): any {
  if (typeof payload === 'string') {
    try {
      return JSON.parse(payload);
    } catch {
      return null;
    }
  }
  return payload;
}

function resolvePeriod(period: PeriodKey): { start?: Date; end?: Date } {
  const end = new Date();

  if (period === 'ytd') {
    const start = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));
    return { start, end };
  }

  if (period === 'all' || period === 'custom') return { start: undefined, end };

  const nowMs = end.getTime();
  const hoursMap: Record<Exclude<PeriodKey, 'ytd' | 'all' | 'custom'>, number> = {
    '4h': 4,
    '12h': 12,
    '24h': 24,
    '7d': 24 * 7,
    '30d': 24 * 30,
    '90d': 24 * 90,
  };

  const hrs = hoursMap[period as keyof typeof hoursMap];
  const start = new Date(nowMs - hrs * 3600 * 1000);

  return { start, end };
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
    const period = (searchParams.get('period') || 'all') as PeriodKey;
    const customStart = searchParams.get('customStart');
    const customEnd = searchParams.get('customEnd');
    const search = searchParams.get('search') || '';
    const minValue = searchParams.get('minValue');
    const maxValue = searchParams.get('maxValue');

    let start: Date | undefined;
    let end: Date | undefined;

    if (period === 'custom') {
      if (!customStart || !customEnd) {
        return NextResponse.json(
          { error: 'Custom period requires both start and end dates' },
          { status: 400, headers: noIndexHeaders() }
        );
      }
      start = new Date(customStart);
      end = new Date(customEnd);
      
      // Validate dates
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return NextResponse.json(
          { error: 'Invalid date format' },
          { status: 400, headers: noIndexHeaders() }
        );
      }
      
      // Set end to end of day
      end.setHours(23, 59, 59, 999);
    } else {
      const resolved = resolvePeriod(period);
      start = resolved.start ? new Date(resolved.start) : undefined;
      end = resolved.end ? new Date(resolved.end) : undefined;
    }
    const quotes = await readQuotes(start, end);

    // Format quotes
    let formattedQuotes = quotes.map((q) => {
      const p = parsePayload(q.payload);
      const customer = p?.enquiryCustomer || p?.customer;
      const firstName = customer?.firstName || customer?.first_name || '';
      const lastName = customer?.lastName || customer?.last_name || '';
      const customerName = `${firstName} ${lastName}`.trim() || '-';
      const company = customer?.company || '-';
      const value = parseGrandTotal(q.payload);

      return {
        created_at: q.created_at,
        quote_no: q.quote_no,
        customer: customerName,
        company,
        value,
        pdf_url: formatPdfUrl(q.quote_no),
      };
    });

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      formattedQuotes = formattedQuotes.filter(
        (q) =>
          q.quote_no.toLowerCase().includes(searchLower) ||
          q.customer.toLowerCase().includes(searchLower) ||
          q.company.toLowerCase().includes(searchLower)
      );
    }

    // Apply value filters
    if (minValue) {
      const min = parseFloat(minValue);
      if (!isNaN(min)) {
        formattedQuotes = formattedQuotes.filter((q) => q.value >= min);
      }
    }

    if (maxValue) {
      const max = parseFloat(maxValue);
      if (!isNaN(max)) {
        formattedQuotes = formattedQuotes.filter((q) => q.value <= max);
      }
    }

    return NextResponse.json(
      {
        quotes: formattedQuotes,
        total: formattedQuotes.length,
      },
      {
        headers: {
          ...noIndexHeaders(),
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('Quotes API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: noIndexHeaders() }
    );
  }
}

