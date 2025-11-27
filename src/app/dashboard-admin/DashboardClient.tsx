'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { LogOut, TrendingUp, Users, DollarSign, FileText } from 'lucide-react';

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
  timeframes: {
    all: { leads: number; lead_value: number; conversions: number; conversion_value: number; conversion_rate: number };
    h24: { leads: number; lead_value: number; conversions: number; conversion_value: number; conversion_rate: number };
    h12: { leads: number; lead_value: number; conversions: number; conversion_value: number; conversion_rate: number };
    h4: { leads: number; lead_value: number; conversions: number; conversion_value: number; conversion_rate: number };
  };
  timeseries30d: Array<{
    day: string;
    leads: number;
    conversions: number;
    conversion_rate: number;
    lead_value: number;
    conversion_value: number;
  }>;
  top_items: Array<{
    key: string;
    description: string;
    stock_id: number | null;
    colour: string | null;
    size: string | null;
    units: number;
    revenue: number;
  }>;
  quotes: Array<{
    quote_no: string;
    created_at: string;
    grand_total: number;
    pdf_url: string;
    customer: string | null;
  }>;
  invoices: Array<{
    invoice_no: string;
    created_at: string;
    grand_total: number;
    pdf_url: string;
    customer: string | null;
  }>;
};

export default function DashboardClient() {
  const router = useRouter();
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const response = await fetch('/api/admin/metrics');
        if (!response.ok) {
          if (response.status === 401) {
            router.push('/dashboard-admin');
            return;
          }
          throw new Error('Failed to fetch metrics');
        }
        const metrics = await response.json();
        setData(metrics);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load metrics');
      } finally {
        setLoading(false);
      }
    }
    fetchMetrics();
  }, [router]);

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.refresh();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-600">Error: {error || 'Failed to load data'}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <Button onClick={handleLogout} variant="outline" size="sm">
            <LogOut className="w-4 h-4 mr-2" />
            Log out
          </Button>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MetricCard
            title="Leads (4h)"
            count={data.timeframes.h4.leads}
            value={data.timeframes.h4.lead_value}
            icon={<Users className="w-5 h-5" />}
          />
          <MetricCard
            title="Leads (24h)"
            count={data.timeframes.h24.leads}
            value={data.timeframes.h24.lead_value}
            icon={<Users className="w-5 h-5" />}
          />
          <MetricCard
            title="Conversions (24h)"
            count={data.timeframes.h24.conversions}
            value={data.timeframes.h24.conversion_value}
            icon={<TrendingUp className="w-5 h-5" />}
            conversionRate={data.timeframes.h24.conversion_rate}
            isConversion={true}
          />
          <MetricCard
            title="All Time"
            count={data.timeframes.all.leads}
            value={data.timeframes.all.lead_value}
            icon={<DollarSign className="w-5 h-5" />}
            conversionRate={data.timeframes.all.conversion_rate}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Conversion Rate (30 days)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.timeseries30d}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="conversion_rate" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Revenue (30 days)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data.timeseries30d}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Area type="monotone" dataKey="conversion_value" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
                  <Area type="monotone" dataKey="lead_value" stackId="2" stroke="#8884d8" fill="#8884d8" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Top Items Table */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Top Sold Items</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Stock ID</TableHead>
                  <TableHead>Colour</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Units</TableHead>
                  <TableHead>Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.top_items.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>{item.stock_id || '-'}</TableCell>
                    <TableCell>{item.colour || '-'}</TableCell>
                    <TableCell>{item.size || '-'}</TableCell>
                    <TableCell>{item.units}</TableCell>
                    <TableCell>{formatCurrency(item.revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent Quotes */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Recent Quotes</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Quote #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>PDF</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.quotes.map((quote) => (
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
                      <TableCell>{formatCurrency(quote.grand_total)}</TableCell>
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
          </CardContent>
        </Card>

        {/* Recent Invoices */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>PDF</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.invoices.map((invoice) => (
                  <TableRow key={invoice.invoice_no}>
                    <TableCell>{formatDate(invoice.created_at)}</TableCell>
                    <TableCell>{invoice.invoice_no}</TableCell>
                    <TableCell>{invoice.customer || '-'}</TableCell>
                    <TableCell>{formatCurrency(invoice.grand_total)}</TableCell>
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
          </CardContent>
        </Card>
      </div>

    </div>
  );
}

function MetricCard({
  title,
  count,
  value,
  icon,
  conversionRate,
  isConversion = false,
}: {
  title: string;
  count: number;
  value: number;
  icon: React.ReactNode;
  conversionRate?: number;
  isConversion?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{count.toLocaleString()}</div>
        <p className="text-xs text-muted-foreground mt-1">{formatCurrency(value)}</p>
        {conversionRate !== undefined && (
          <p className="text-xs text-muted-foreground mt-1">
            {isConversion ? 'Conversion Rate' : 'Lead Value'}: {conversionRate.toFixed(1)}%
          </p>
        )}
      </CardContent>
    </Card>
  );
}

