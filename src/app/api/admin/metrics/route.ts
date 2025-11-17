import { NextRequest, NextResponse } from 'next/server';
import { isAuthed, noIndexHeaders } from '@/lib/adminAuth';
import {
  readQuotes,
  readInvoices,
  sumLeads,
  sumConversions,
  topSoldItems,
  buildTimeseriesForPeriod,
  parseGrandTotal,
  type PeriodKey,
} from '@/server/admin/metrics';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const STORAGE_BASE_URL = 'https://fxsqdpmmddcidjwzxtpc.supabase.co/storage/v1/object/public/audit-reports';

// --- helpers ---
const pickStr = (obj: unknown, keys: string[], fallback = ''): string => {
  if (!obj || typeof obj !== 'object') return fallback;
  const rec = obj as Record<string, unknown>;
  for (const k of keys) {
    const v = rec[k];
    if (typeof v === 'string' && v.trim() !== '') return v;
  }
  return fallback;
};

function formatPdfUrl(type: 'quote' | 'invoice', id: string): string {
  if (type === 'invoice' && !id.startsWith('INV-')) {
    id = `INV-${id}`;
  }
  return `${STORAGE_BASE_URL}/${id}.pdf`;
}

function resolvePeriod(period: PeriodKey): { start?: Date; end?: Date } {
  const end = new Date();

  if (period === 'ytd') {
    const start = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));
    return { start, end };
  }

  if (period === 'all' || period === 'custom') return { start: undefined, end };

  const nowMs = end.getTime();
  const hoursMap: Partial<Record<Exclude<PeriodKey, 'ytd' | 'all' | 'custom'>, number>> = {
    '4h': 4,
    '12h': 12,
    '24h': 24,
    '7d': 24 * 7,
    '30d': 24 * 30,
    '90d': 24 * 90,
  };

  const hrs = hoursMap[period as keyof typeof hoursMap] ?? 0;
  const start = new Date(nowMs - hrs * 3600 * 1000);

  return { start, end };
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

export async function GET(request: NextRequest) {
  if (!isAuthed(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: noIndexHeaders() }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get('period') || '30d') as PeriodKey;
    const customStart = searchParams.get('customStart');
    const customEnd = searchParams.get('customEnd');

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

    // Fetch period data
    const [quotes, invoices] = await Promise.all([
      readQuotes(start, end),
      readInvoices(start, end),
    ]);

    // Calculate period metrics
    const leads = sumLeads(quotes);
    const conversions = sumConversions(invoices);
    const conversionRatePct = leads.count === 0 ? 0 : Number(((conversions.count / leads.count) * 100).toFixed(2));

    // Top items for period
    const topItems = topSoldItems(invoices, 10);

    // Recent quotes (max 50)
    const recentQuotes = quotes.slice(0, 50).map((q) => {
      const p = parsePayload(q.payload);
      // prefer payload.enquiryCustomer, else legacy customer
      const customerUnknown = (p?.enquiryCustomer ?? p?.customer) as unknown;

      const firstName = pickStr(customerUnknown, ['firstName', 'first_name']);
      const lastName = pickStr(customerUnknown, ['lastName', 'last_name']);
      const company = pickStr(customerUnknown, ['company'], '-');
      const customerName = `${firstName} ${lastName}`.trim() || '-';

      return {
        created_at: q.created_at,
        quote_no: q.quote_no,
        customer: customerName,
        company,
        value: parseGrandTotal(q.payload),
        pdf_url: formatPdfUrl('quote', q.quote_no),
      };
    });

    // Recent invoices (max 50)
    const recentInvoices = invoices.slice(0, 50).map((inv) => {
      const p = parsePayload(inv.payload);
      // prefer payload.customer, else legacy enquiryCustomer
      const customerUnknown = (p?.customer ?? p?.enquiryCustomer) as unknown;

      const firstName = pickStr(customerUnknown, ['firstName', 'first_name']);
      const lastName = pickStr(customerUnknown, ['lastName', 'last_name']);
      const company = pickStr(customerUnknown, ['company'], '-');
      const customerName = `${firstName} ${lastName}`.trim() || '-';

      return {
        created_at: inv.created_at,
        invoice_no: inv.invoice_no,
        customer: customerName,
        company,
        value: parseGrandTotal(inv.payload),
        pdf_url: formatPdfUrl('invoice', inv.invoice_no),
      };
    });

    // Timeseries for the selected period
    const timeseries = buildTimeseriesForPeriod(quotes, invoices, start, end);

    return NextResponse.json(
      {
        period,
        periodMetrics: {
          leads: { count: leads.count, value: leads.value },
          conversions: { count: conversions.count, value: conversions.value },
          leadValue: leads.value,
          conversionRatePct,
        },
        topItems,
        recentQuotes,
        recentInvoices,
        timeseries,
      },
      {
        headers: {
          ...noIndexHeaders(),
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('Metrics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: noIndexHeaders() }
    );
  }
}
