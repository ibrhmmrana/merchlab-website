import { NextRequest, NextResponse } from 'next/server';
import { isAuthed, noIndexHeaders } from '@/lib/adminAuth';
import { readInvoices, topCustomers, type PeriodKey } from '@/server/admin/metrics';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
    const limit = parseInt(searchParams.get('limit') || '50', 10);

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
    const customers = topCustomers(invoices, limit);

    return NextResponse.json(
      {
        customers,
        total: customers.length,
        period,
      },
      {
        headers: {
          ...noIndexHeaders(),
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('Customers API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: noIndexHeaders() }
    );
  }
}

