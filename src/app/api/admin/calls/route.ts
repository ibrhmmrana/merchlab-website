import { NextRequest, NextResponse } from 'next/server';
import { isAuthed, noIndexHeaders } from '@/lib/adminAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { type PeriodKey } from '@/server/admin/metrics';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function resolvePeriod(period: PeriodKey, customStart?: string, customEnd?: string): { start?: Date; end?: Date } {
  const end = new Date();

  if (period === 'ytd') {
    const start = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));
    return { start, end };
  }

  if (period === 'all' || period === 'custom') {
    if (period === 'custom' && customStart && customEnd) {
      return { start: new Date(customStart), end: new Date(customEnd) };
    }
    return { start: undefined, end };
  }

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

    const { start, end } = resolvePeriod(period, customStart || undefined, customEnd || undefined);

    const supabase = getSupabaseAdmin();
    
    let query = supabase
      .from('call_records')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply date filters
    if (start) {
      query = query.gte('created_at', start.toISOString());
    }
    if (end) {
      query = query.lte('created_at', end.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching call records:', error);
      return NextResponse.json(
        { error: 'Failed to fetch call records', details: error.message },
        { status: 500, headers: noIndexHeaders() }
      );
    }

    return NextResponse.json(
      { calls: data || [] },
      { headers: noIndexHeaders() }
    );
  } catch (err) {
    console.error('Unexpected error fetching call records:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: noIndexHeaders() }
    );
  }
}
