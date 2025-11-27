'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { LogOut, Users, TrendingUp, DollarSign, FileText, Download, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type PeriodKey } from '@/server/admin/metrics';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
  }).format(value);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

type MetricsData = {
  period: PeriodKey;
  periodMetrics: {
    leads: { count: number; value: number };
    conversions: { count: number; value: number };
    leadValue: number;
    conversionRatePct: number;
  };
  topItems: Array<{
    description: string;
    stock_id: number | null;
    colour: string | null;
    size: string | null;
    units: number;
    revenue: number;
  }>;
  recentQuotes: Array<{
    created_at: string;
    quote_no: string;
    customer: string;
    company: string;
    value: number;
    pdf_url: string;
  }>;
  recentInvoices: Array<{
    created_at: string;
    invoice_no: string;
    customer: string;
    company: string;
    value: number;
    pdf_url: string;
  }>;
  timeseries: {
    conversionRateCumulativeAllTime: Array<{ date: string; ratePct: number }>;
    revenueAllTimeSeries: Array<{ date: string; revenue: number }>;
  };
};

export default function OverviewClient() {
  const router = useRouter();
  const [period, setPeriod] = useState<PeriodKey>('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  useEffect(() => {
    async function fetchMetrics() {
      // Don't fetch if custom is selected but dates aren't set
      if (period === 'custom' && (!customStart || !customEnd)) {
        return;
      }

      try {
        setLoading(true);
        const params = new URLSearchParams({
          period,
          ...(period === 'custom' && customStart && { customStart }),
          ...(period === 'custom' && customEnd && { customEnd }),
        });

        const response = await fetch(`/api/admin/metrics?${params.toString()}`);
        if (!response.ok) {
          if (response.status === 401) {
            router.refresh();
            return;
          }
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to fetch metrics');
        }
        const metrics = await response.json();
        setData(metrics);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load metrics');
      } finally {
        setLoading(false);
      }
    }
    fetchMetrics();
  }, [period, customStart, customEnd, router]);

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.refresh();
  }

  async function handleGeneratePdf() {
    try {
      setGeneratingPdf(true);
      
      // Map period to timeframe format
      let timeframe: 'last_7d' | 'last_30d' | 'all_time' | 'custom' = 'last_30d';
      if (period === '7d') timeframe = 'last_7d';
      else if (period === '30d') timeframe = 'last_30d';
      else if (period === 'all') timeframe = 'all_time';
      else if (period === 'custom') timeframe = 'custom';
      
      const response = await fetch('/api/admin/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timeframe,
          ...(period === 'custom' && customStart && { start: customStart }),
          ...(period === 'custom' && customEnd && { end: customEnd }),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to generate PDF' }));
        throw new Error(errorData.error || 'Failed to generate PDF');
      }

      // Get PDF blob
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      a.download = `MerchLab-Executive-Report_${dateStr}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate PDF');
    } finally {
      setGeneratingPdf(false);
    }
  }

  // Show message if custom is selected but dates aren't set
  if (period === 'custom' && (!customStart || !customEnd)) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 lg:pt-16 pt-20">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">Overview</h1>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as PeriodKey)}
                className="px-4 py-2 border border-gray-300 rounded-md bg-white text-sm sm:text-base"
              >
                <option value="4h">4h</option>
                <option value="12h">12h</option>
                <option value="24h">24h</option>
                <option value="7d">7d</option>
                <option value="30d">30d</option>
                <option value="90d">90d</option>
                <option value="ytd">YTD</option>
                <option value="all">All</option>
                <option value="custom">Custom</option>
              </select>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <Input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm sm:text-base"
                />
                <span className="hidden sm:inline">to</span>
                <Input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm sm:text-base"
                />
              </div>
            </div>
            <Button onClick={handleLogout} variant="outline" size="sm" className="w-full sm:w-auto">
              <LogOut className="w-4 h-4 mr-2" />
              Log out
            </Button>
          </div>
        </div>
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">Please select a start date and end date to view metrics</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 lg:pt-16 pt-20">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 lg:pt-16 pt-20">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">Overview</h1>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as PeriodKey)}
                className="px-4 py-2 border border-gray-300 rounded-md bg-white text-sm sm:text-base"
              >
                <option value="4h">4h</option>
                <option value="12h">12h</option>
                <option value="24h">24h</option>
                <option value="7d">7d</option>
                <option value="30d">30d</option>
                <option value="90d">90d</option>
                <option value="ytd">YTD</option>
                <option value="all">All</option>
                <option value="custom">Custom</option>
              </select>
              {period === 'custom' && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <Input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm sm:text-base"
                  />
                  <span className="hidden sm:inline">to</span>
                  <Input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm sm:text-base"
                  />
                </div>
              )}
            </div>
            <Button onClick={handleLogout} variant="outline" size="sm" className="w-full sm:w-auto">
              <LogOut className="w-4 h-4 mr-2" />
              Log out
            </Button>
          </div>
        </div>
        <div className="text-lg text-red-600">Error: {error || 'Failed to load data'}</div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 lg:pt-16 pt-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Overview</h1>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          <Button
            onClick={handleGeneratePdf}
            disabled={generatingPdf || loading}
            className="flex items-center gap-2"
          >
            {generatingPdf ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Generate PDF
              </>
            )}
          </Button>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as PeriodKey)}
              className="px-4 py-2 border border-gray-300 rounded-md bg-white text-sm sm:text-base"
            >
              <option value="4h">4h</option>
              <option value="12h">12h</option>
              <option value="24h">24h</option>
              <option value="7d">7d</option>
              <option value="30d">30d</option>
              <option value="90d">90d</option>
              <option value="ytd">YTD</option>
              <option value="all">All</option>
              <option value="custom">Custom</option>
            </select>
            {period === 'custom' && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <Input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm sm:text-base"
                />
                <span className="hidden sm:inline">to</span>
                <Input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm sm:text-base"
                />
              </div>
            )}
          </div>
          <Button onClick={handleLogout} variant="outline" size="sm" className="w-full sm:w-auto">
            <LogOut className="w-4 h-4 mr-2" />
            Log out
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads ({period})</CardTitle>
            <Users className="w-5 h-5" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.periodMetrics.leads.count.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">R {data.periodMetrics.leads.value.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversions ({period})</CardTitle>
            <TrendingUp className="w-5 h-5" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.periodMetrics.conversions.count.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">R {data.periodMetrics.conversions.value.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue ({period})</CardTitle>
            <DollarSign className="w-5 h-5" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.periodMetrics.conversions.value)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conv. Rate ({period})</CardTitle>
            <TrendingUp className="w-5 h-5" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.periodMetrics.conversionRatePct}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Conversion Rate ({period === 'custom' ? 'Selected Period' : period === 'all' ? 'All-time' : period + ' cumulative'})</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.timeseries.conversionRateCumulativeAllTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis 
                  tick={{ fontSize: 12 }} 
                  domain={[
                    (dataMin: number) => Math.max(0, Math.floor(dataMin)),
                    (dataMax: number) => Math.ceil(dataMax) + 1
                  ]}
                  tickFormatter={(value) => Math.round(value).toString()}
                />
                <Tooltip />
                <Line type="monotone" dataKey="ratePct" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue ({period === 'custom' ? 'Selected Period' : period === 'all' ? 'All-time' : period})</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.timeseries.revenueAllTimeSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' });
                  }}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  tickFormatter={(value) => {
                    if (value >= 1000000) return `R${(value / 1000000).toFixed(1)}M`;
                    if (value >= 1000) return `R${(value / 1000).toFixed(0)}K`;
                    return `R${value}`;
                  }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                  labelFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString('en-ZA', { 
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    });
                  }}
                  formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  fill="url(#revenueGradient)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#10b981' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Quotes */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Recent Quotes</CardTitle>
            <a href="/dashboard-admin/quotes" className="text-sm text-primary hover:underline">
              View all →
            </a>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle px-4 sm:px-0">
              <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Quote #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>PDF</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.recentQuotes.slice(0, 10).map((quote) => (
                <TableRow key={quote.quote_no}>
                  <TableCell>{formatDate(quote.created_at)}</TableCell>
                  <TableCell>{quote.quote_no}</TableCell>
                  <TableCell>
                    {quote.customer && quote.customer !== '-' ? (
                      <span className="font-medium">{quote.customer}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>{quote.company}</TableCell>
                  <TableCell>{formatCurrency(quote.value)}</TableCell>
                  <TableCell>
                    <a
                      href={quote.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      <FileText className="w-4 h-4 inline" />
                    </a>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Invoices */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Recent Invoices</CardTitle>
            <a href="/dashboard-admin/invoices" className="text-sm text-primary hover:underline">
              View all →
            </a>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle px-4 sm:px-0">
              <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Invoice #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>PDF</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.recentInvoices.slice(0, 10).map((invoice) => (
                <TableRow key={invoice.invoice_no}>
                  <TableCell>{formatDate(invoice.created_at)}</TableCell>
                  <TableCell>{invoice.invoice_no}</TableCell>
                  <TableCell>{invoice.customer}</TableCell>
                  <TableCell>{invoice.company}</TableCell>
                  <TableCell>{formatCurrency(invoice.value)}</TableCell>
                  <TableCell>
                    <a
                      href={invoice.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      <FileText className="w-4 h-4 inline" />
                    </a>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}

