import { NextRequest, NextResponse } from 'next/server';
import { isAuthed, noIndexHeaders } from '@/lib/adminAuth';
import { readInvoices, parseGrandTotal, type PeriodKey } from '@/server/admin/metrics';

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

function formatPdfUrl(id: string): string {
  if (!id.startsWith('INV-')) {
    id = `INV-${id}`;
  }
  return `${STORAGE_BASE_URL}/${id}.pdf`;
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
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

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
    const invoices = await readInvoices(start, end);

    // Format invoices
    let formattedInvoices = invoices.map((inv) => {
      const p = parsePayload(inv.payload);
      // prefer payload.customer, else legacy enquiryCustomer
      const customerUnknown = (p?.customer ?? p?.enquiryCustomer) as unknown;

      const firstName = pickStr(customerUnknown, ['firstName', 'first_name']);
      const lastName = pickStr(customerUnknown, ['lastName', 'last_name']);
      const company = pickStr(customerUnknown, ['company'], '-');
      const customerName = `${firstName} ${lastName}`.trim() || '-';
      const value = parseGrandTotal(inv.payload);

      return {
        created_at: inv.created_at,
        invoice_no: inv.invoice_no,
        customer: customerName,
        company,
        value,
        pdf_url: formatPdfUrl(inv.invoice_no),
      };
    });

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      formattedInvoices = formattedInvoices.filter(
        (inv) =>
          inv.invoice_no.toLowerCase().includes(searchLower) ||
          inv.customer.toLowerCase().includes(searchLower) ||
          inv.company.toLowerCase().includes(searchLower)
      );
    }

    // Apply value filters
    if (minValue) {
      const min = parseFloat(minValue);
      if (!isNaN(min)) {
        formattedInvoices = formattedInvoices.filter((inv) => inv.value >= min);
      }
    }

    if (maxValue) {
      const max = parseFloat(maxValue);
      if (!isNaN(max)) {
        formattedInvoices = formattedInvoices.filter((inv) => inv.value <= max);
      }
    }

    // Pagination
    const total = formattedInvoices.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedInvoices = formattedInvoices.slice(startIndex, endIndex);

    return NextResponse.json(
      {
        invoices: paginatedInvoices,
        total,
        page,
        limit,
        totalPages,
      },
      {
        headers: {
          ...noIndexHeaders(),
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('Invoices API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: noIndexHeaders() }
    );
  }
}

