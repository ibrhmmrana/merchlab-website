import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export type PeriodKey = '4h' | '12h' | '24h' | '7d' | '30d' | '90d' | 'ytd' | 'all' | 'custom';

function parsePayload(payload: unknown): unknown {
  if (typeof payload === 'string') {
    try {
      return JSON.parse(payload);
    } catch {
      return null;
    }
  }
  return payload;
}

export function parseGrandTotal(payload: unknown): number {
  const p = parsePayload(payload) as Record<string, unknown> | null;
  const totals = p?.totals as Record<string, unknown> | undefined;
  const total = totals?.grand_total;
  if (typeof total === 'number') return total;
  if (typeof total === 'string') {
    const parsed = parseFloat(total);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export async function readQuotes(since?: Date, until?: Date) {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from('quote_docs')
    .select('quote_no, created_at, payload')
    .order('created_at', { ascending: false });

  if (since) {
    query = query.gte('created_at', since.toISOString());
  }
  if (until) {
    query = query.lte('created_at', until.toISOString());
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error reading quotes:', error);
    return [];
  }
  return data || [];
}

export async function readInvoices(since?: Date, until?: Date) {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from('invoice_docs')
    .select('invoice_no, created_at, payload')
    .order('created_at', { ascending: false });

  if (since) {
    query = query.gte('created_at', since.toISOString());
  }
  if (until) {
    query = query.lte('created_at', until.toISOString());
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error reading invoices:', error);
    return [];
  }
  return data || [];
}

export function sumLeads(rows: Array<{ payload: unknown }>) {
  let count = 0;
  let value = 0;

  for (const row of rows) {
    count++;
    value += parseGrandTotal(row.payload);
  }

  return { count, value };
}

export function sumConversions(rows: Array<{ payload: unknown }>) {
  return sumLeads(rows);
}

export function buildTimeseries(
  quotes: Array<{ created_at: string; payload: unknown }>,
  invoices: Array<{ created_at: string; payload: unknown }>,
  days = 30
) {
  const now = new Date();
  const buckets: Record<string, { leads: number; conversions: number; lead_value: number; conversion_value: number }> = {};

  // Initialize buckets for last N days
  for (let i = 0; i < days; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dayKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
    buckets[dayKey] = { leads: 0, conversions: 0, lead_value: 0, conversion_value: 0 };
  }

  // Process quotes (leads)
  for (const quote of quotes) {
    const date = new Date(quote.created_at);
    const dayKey = date.toISOString().split('T')[0];
    if (buckets[dayKey]) {
      buckets[dayKey].leads++;
      buckets[dayKey].lead_value += parseGrandTotal(quote.payload);
    }
  }

  // Process invoices (conversions)
  for (const invoice of invoices) {
    const date = new Date(invoice.created_at);
    const dayKey = date.toISOString().split('T')[0];
    if (buckets[dayKey]) {
      buckets[dayKey].conversions++;
      buckets[dayKey].conversion_value += parseGrandTotal(invoice.payload);
    }
  }

  // Convert to array and calculate conversion rates
  return Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, data]) => ({
      day,
      leads: data.leads,
      conversions: data.conversions,
      lead_value: data.lead_value,
      conversion_value: data.conversion_value,
      conversion_rate: data.leads > 0 ? (data.conversions / data.leads) * 100 : 0,
    }));
}

export function topSoldItems(
  invoices: Array<{ payload: unknown }>,
  limit = 10
): Array<{ description: string; stock_id: number | null; colour: string | null; size: string | null; units: number; revenue: number }> {
  const items: Record<string, { description: string; stock_id: number | null; colour: string | null; size: string | null; units: number; revenue: number }> = {};

  for (const invoice of invoices) {
    const p = parsePayload(invoice.payload) as Record<string, unknown> | null;
    const invoiceItems = (p?.items as Array<Record<string, unknown>> | undefined) || [];
    for (const item of invoiceItems) {
      const stockId = (item.stock_id as number | undefined) || null;
      const description = (item.description as string | undefined) || (item.name as string | undefined) || 'Unknown';
      const colour = (item.colour as string | undefined) || null;
      const size = (item.size as string | undefined) || null;

      // Create key from stock_id or description + colour + size
      const key = stockId
        ? `${stockId}-${colour || ''}-${size || ''}`
        : `${description}-${colour || ''}-${size || ''}`;

      if (!items[key]) {
        items[key] = {
          description,
          stock_id: stockId,
          colour,
          size,
          units: 0,
          revenue: 0,
        };
      }

      const qty = typeof item.requested_qty === 'number' ? item.requested_qty : parseFloat(String(item.requested_qty || '0')) || 0;
      const lineTotal = typeof item.line_total === 'number' ? item.line_total : parseFloat(String(item.line_total || '0')) || 0;

      items[key].units += qty;
      items[key].revenue += lineTotal;
    }
  }

  return Object.values(items)
    .sort((a, b) => {
      // Sort by units first, then revenue
      if (b.units !== a.units) return b.units - a.units;
      return b.revenue - a.revenue;
    })
    .slice(0, limit);
}

export async function getAllTimeSeries() {
  const supabase = getSupabaseAdmin();
  
  const [quotesResult, invoicesResult] = await Promise.all([
    supabase.from('quote_docs').select('created_at').order('created_at', { ascending: true }),
    supabase.from('invoice_docs').select('payload, created_at').order('created_at', { ascending: true }),
  ]);

  const quotes = quotesResult.data || [];
  const invoices = invoicesResult.data || [];

  // Revenue all-time series: daily sum of invoice grand_total
  const revByDate = new Map<string, number>();
  invoices.forEach((r) => {
    const d = (r.created_at ?? '').slice(0, 10);
    const amt = parseGrandTotal(r.payload);
    revByDate.set(d, (revByDate.get(d) ?? 0) + amt);
  });

  const revenueAllTimeSeries = Array.from(revByDate.entries())
    .map(([date, revenue]) => ({ date, revenue }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Conversion rate cumulative all-time
  const countByDate = (rows: Array<{ created_at: string }>) => {
    const m = new Map<string, number>();
    rows.forEach((r) => {
      const d = (r.created_at ?? '').slice(0, 10);
      m.set(d, (m.get(d) ?? 0) + 1);
    });
    return m;
  };

  const qByDate = countByDate(quotes);
  const iByDate = countByDate(invoices);

  const allDatesSorted = Array.from(new Set([...qByDate.keys(), ...iByDate.keys()])).sort();

  let cumQ = 0;
  let cumI = 0;

  const conversionRateCumulativeAllTime = allDatesSorted.map((date) => {
    cumQ += qByDate.get(date) ?? 0;
    cumI += iByDate.get(date) ?? 0;
    const ratePct = cumQ === 0 ? 0 : (cumI / cumQ) * 100;
    return { date, ratePct: Number(ratePct.toFixed(2)) };
  });

  return {
    conversionRateCumulativeAllTime,
    revenueAllTimeSeries,
  };
}

// Helper to safely extract string from unknown object
function pickStr(obj: unknown, keys: string[], fallback = ''): string {
  if (!obj || typeof obj !== 'object') return fallback;
  const rec = obj as Record<string, unknown>;
  for (const k of keys) {
    const v = rec[k];
    if (typeof v === 'string' && v.trim() !== '') return v;
  }
  return fallback;
}

export function topCustomers(
  invoices: Array<{ created_at: string; payload: unknown }>,
  limit = 50
): Array<{ customer: string; company: string; totalValue: number; orderCount: number; lastOrderDate: string }> {
  const customers: Record<string, { customer: string; company: string; totalValue: number; orderCount: number; lastOrderDate: string }> = {};

  for (const invoice of invoices) {
    const p = parsePayload(invoice.payload) as Record<string, unknown> | null;
    const customerUnknown = (p?.customer ?? p?.enquiryCustomer) as unknown;
    
    // Extract customer info using pickStr helper
    const firstName = pickStr(customerUnknown, ['firstName', 'first_name']);
    const lastName = pickStr(customerUnknown, ['lastName', 'last_name']);
    const company = pickStr(customerUnknown, ['company'], '-');
    
    const customerName = `${firstName} ${lastName}`.trim() || 'Unknown';
    const customerKey = `${customerName}|${company}`.toLowerCase();
    
    const value = parseGrandTotal(invoice.payload);
    const orderDate = invoice.created_at;

    if (!customers[customerKey]) {
      customers[customerKey] = {
        customer: customerName,
        company: company || '-',
        totalValue: 0,
        orderCount: 0,
        lastOrderDate: orderDate,
      };
    }

    customers[customerKey].totalValue += value;
    customers[customerKey].orderCount += 1;
    
    // Update last order date if this invoice is more recent
    if (orderDate > customers[customerKey].lastOrderDate) {
      customers[customerKey].lastOrderDate = orderDate;
    }
  }

  return Object.values(customers)
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, limit);
}

export function buildTimeseriesForPeriod(
  quotes: Array<{ created_at: string; payload: unknown }>,
  invoices: Array<{ created_at: string; payload: unknown }>,
  start?: Date,
  end?: Date
) {
  // Filter by date range if provided
  let filteredQuotes = quotes;
  let filteredInvoices = invoices;

  if (start) {
    const startStr = start.toISOString().split('T')[0];
    filteredQuotes = quotes.filter((q) => q.created_at >= startStr);
    filteredInvoices = invoices.filter((inv) => inv.created_at >= startStr);
  }

  if (end) {
    const endStr = end.toISOString().split('T')[0];
    filteredQuotes = filteredQuotes.filter((q) => q.created_at.split('T')[0] <= endStr);
    filteredInvoices = filteredInvoices.filter((inv) => inv.created_at.split('T')[0] <= endStr);
  }

  // Get all unique dates in the filtered data
  const allDates = new Set<string>();
  filteredQuotes.forEach((q) => allDates.add(q.created_at.split('T')[0]));
  filteredInvoices.forEach((inv) => allDates.add(inv.created_at.split('T')[0]));

  const datesSorted = Array.from(allDates).sort();

  // Build revenue series (daily sum)
  const revByDate = new Map<string, number>();
  filteredInvoices.forEach((inv) => {
    const d = inv.created_at.split('T')[0];
    const amt = parseGrandTotal(inv.payload);
    revByDate.set(d, (revByDate.get(d) ?? 0) + amt);
  });

  const revenueSeries = datesSorted.map((date) => ({
    date,
    revenue: revByDate.get(date) ?? 0,
  }));

  // Build conversion rate cumulative series
  const countByDate = (rows: Array<{ created_at: string }>) => {
    const m = new Map<string, number>();
    rows.forEach((r) => {
      const d = r.created_at.split('T')[0];
      m.set(d, (m.get(d) ?? 0) + 1);
    });
    return m;
  };

  const qByDate = countByDate(filteredQuotes);
  const iByDate = countByDate(filteredInvoices);

  let cumQ = 0;
  let cumI = 0;

  const conversionRateCumulative = datesSorted.map((date) => {
    cumQ += qByDate.get(date) ?? 0;
    cumI += iByDate.get(date) ?? 0;
    const ratePct = cumQ === 0 ? 0 : (cumI / cumQ) * 100;
    return { date, ratePct: Number(ratePct.toFixed(2)) };
  });

  return {
    conversionRateCumulativeAllTime: conversionRateCumulative,
    revenueAllTimeSeries: revenueSeries,
  };
}
