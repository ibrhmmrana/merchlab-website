import { readQuotes, readInvoices, parseGrandTotal, topSoldItems, type PeriodKey } from '../metrics';

export type ReportTimeframe = 'last_7d' | 'last_30d' | 'all_time' | 'custom';

function resolvePeriod(timeframe: ReportTimeframe, start?: string, end?: string): { start?: Date; end?: Date } {
  const now = new Date();
  
  if (timeframe === 'all_time') {
    return { start: undefined, end: undefined };
  }
  
  if (timeframe === 'custom') {
    if (!start || !end) {
      throw new Error('Custom timeframe requires both start and end dates');
    }
    return {
      start: new Date(start),
      end: new Date(end),
    };
  }
  
  // last_7d or last_30d
  const days = timeframe === 'last_7d' ? 7 : 30;
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - days);
  
  return {
    start: startDate,
    end: now,
  };
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

function pickStr(obj: unknown, keys: string[], fallback = ''): string {
  if (!obj || typeof obj !== 'object') return fallback;
  const rec = obj as Record<string, unknown>;
  for (const k of keys) {
    const v = rec[k];
    if (typeof v === 'string' && v.trim() !== '') return v;
  }
  return fallback;
}

export async function buildExecutiveSummary(
  timeframe: ReportTimeframe,
  customStart?: string,
  customEnd?: string
) {
  const period = resolvePeriod(timeframe, customStart, customEnd);
  
  // Fetch quotes and invoices for the period
  const [quotes, invoices] = await Promise.all([
    readQuotes(period.start, period.end),
    readInvoices(period.start, period.end),
  ]);
  
  // Calculate KPIs
  const totalRevenue = invoices.reduce((sum, inv) => sum + parseGrandTotal(inv.payload), 0);
  const quotesCount = quotes.length;
  const invoicesCount = invoices.length;
  const conversionRate = quotesCount > 0 ? (invoicesCount / quotesCount) * 100 : 0;
  
  // Calculate lead value (sum of quote totals)
  const leadValue = quotes.reduce((sum, q) => sum + parseGrandTotal(q.payload), 0);
  
  // Calculate branding metrics
  let brandingCount = 0;
  let brandingRevenue = 0;
  
  for (const invoice of invoices) {
    const p = parsePayload(invoice.payload);
    const brandingStatus = pickStr(p, ['brandingStatus', 'branding_status']);
    
    if (brandingStatus?.toLowerCase() === 'branded') {
      brandingCount++;
      brandingRevenue += parseGrandTotal(invoice.payload);
    }
  }
  
  const brandingAdoptionPct = invoicesCount > 0 ? (brandingCount / invoicesCount) * 100 : 0;
  
  // Get top 5 items by revenue
  const topItems = topSoldItems(invoices, 5).map(item => ({
    description: item.description,
    stockId: item.stock_id ?? 'N/A',
    colour: item.colour ?? 'N/A',
    size: item.size ?? 'N/A',
    units: item.units,
    revenue: item.revenue,
  }));
  
  // Build daily revenue series for the period
  const revenueByDate = new Map<string, number>();
  invoices.forEach((inv) => {
    const date = inv.created_at.split('T')[0]; // YYYY-MM-DD
    const amount = parseGrandTotal(inv.payload);
    revenueByDate.set(date, (revenueByDate.get(date) ?? 0) + amount);
  });
  
  // Get all dates in the period
  const allDates: string[] = [];
  if (period.start && period.end) {
    const start = new Date(period.start);
    const end = new Date(period.end);
    // Set time to start/end of day for proper comparison
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    const current = new Date(start);
    while (current <= end) {
      allDates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
  } else {
    // For all-time, get all unique dates from invoices and quotes
    const allUniqueDates = new Set<string>();
    invoices.forEach(inv => allUniqueDates.add(inv.created_at.split('T')[0]));
    quotes.forEach(q => allUniqueDates.add(q.created_at.split('T')[0]));
    allDates.push(...Array.from(allUniqueDates).sort());
  }
  
  const dailyRevenue = allDates.map(date => ({
    date,
    revenue: revenueByDate.get(date) ?? 0,
  }));
  
  // Build cumulative conversion rate series
  const quotesByDate = new Map<string, number>();
  const invoicesByDate = new Map<string, number>();
  
  quotes.forEach((q) => {
    const date = q.created_at.split('T')[0];
    quotesByDate.set(date, (quotesByDate.get(date) ?? 0) + 1);
  });
  
  invoices.forEach((inv) => {
    const date = inv.created_at.split('T')[0];
    invoicesByDate.set(date, (invoicesByDate.get(date) ?? 0) + 1);
  });
  
  // Calculate cumulative conversion rate
  let cumQuotes = 0;
  let cumInvoices = 0;
  const conversionRateSeries = allDates.map(date => {
    cumQuotes += quotesByDate.get(date) ?? 0;
    cumInvoices += invoicesByDate.get(date) ?? 0;
    const rate = cumQuotes > 0 ? (cumInvoices / cumQuotes) * 100 : 0;
    return {
      date,
      rate: Number(rate.toFixed(2)),
    };
  });
  
  // Format period dates
  const formatDate = (date?: Date) => {
    if (!date) return 'All time';
    return date.toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };
  
  return {
    period: {
      start: formatDate(period.start),
      end: formatDate(period.end),
      generatedAt: new Date().toLocaleString('en-ZA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    },
    kpis: {
      totalRevenue,
      quotesCount,
      invoicesCount,
      conversionRate: Number(conversionRate.toFixed(1)),
      brandingAdoptionPct: Number(brandingAdoptionPct.toFixed(0)),
      brandingRevenue,
      leadValue,
    },
    topItems,
    dailyRevenue,
    conversionRateSeries,
  };
}

