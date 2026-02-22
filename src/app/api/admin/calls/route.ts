import { NextRequest, NextResponse } from 'next/server';
import { isAuthed, noIndexHeaders } from '@/lib/adminAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { type PeriodKey } from '@/server/admin/metrics';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function resolvePeriod(period: PeriodKey, customStart?: string, customEnd?: string): { start?: Date; end?: Date } {
  // Add 1 hour buffer to end time to ensure we include calls made right now
  const end = new Date(Date.now() + 60 * 60 * 1000);

  if (period === 'ytd') {
    const start = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));
    return { start, end };
  }

  if (period === 'all' || period === 'custom') {
    if (period === 'custom' && customStart && customEnd) {
      // For custom, add buffer to end date
      const customEndDate = new Date(customEnd);
      customEndDate.setHours(customEndDate.getHours() + 1);
      return { start: new Date(customStart), end: customEndDate };
    }
    // For 'all', return undefined for end so we don't filter by end date
    return { start: undefined, end: undefined };
  }

  const nowMs = Date.now();
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
  if (!(await isAuthed())) {
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
    // Apply end filter if provided (for 'all', end is undefined so no filter is applied)
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
