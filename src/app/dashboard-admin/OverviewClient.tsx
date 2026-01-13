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
import { LogOut, Users, TrendingUp, DollarSign, FileText, Download, Loader2, AlertTriangle, Package, CheckCircle, Truck, Box, Wrench, ClipboardCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type PeriodKey } from '@/server/admin/metrics';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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

type OrderStatusData = {
  statusCounts: Array<{
    status: string;
    count: number;
    hasStuckOrders: boolean;
  }>;
  ordersByStatus: Record<string, Array<{
    orderId: string;
    contactPersonId: string;
    customerReference: string;
    orderDate: string;
    totalIncVat: number;
    sample: boolean;
    cartId: string;
    branded: boolean;
    status: string;
    hexCode: string;
    orderTaker: string;
    isDelivery: boolean;
    isStuck: boolean;
  }>>;
};

type Order = {
  orderId: string;
  contactPersonId: string;
  customerReference: string;
  orderDate: string;
  totalIncVat: number;
  sample: boolean;
  cartId: string;
  branded: boolean;
  status: string;
  hexCode: string;
  orderTaker: string;
  isDelivery: boolean;
  isStuck: boolean;
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
  const [orderStatusData, setOrderStatusData] = useState<OrderStatusData | null>(null);
  const [loadingOrderStatus, setLoadingOrderStatus] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderDeliveryDetails, setOrderDeliveryDetails] = useState<{
    waybills: Array<{
      waybillNumber: string;
      events: Array<{
        description: string;
        branch: string;
        datetime: string;
      }>;
      podDetails: Array<{
        podDate: string;
        podTime: string;
        name: string;
        podComments: string;
        podFileAttached: boolean;
      }>;
    }>;
  } | null>(null);
  const [loadingDeliveryDetails, setLoadingDeliveryDetails] = useState(false);

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

  useEffect(() => {
    async function fetchOrderStatusCounts() {
      try {
        setLoadingOrderStatus(true);
        const response = await fetch('/api/admin/orders/status-counts');
        if (!response.ok) {
          if (response.status === 401) {
            router.refresh();
            return;
          }
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('Failed to fetch order status counts:', response.status, errorData);
          // Set empty data structure to prevent UI errors
          setOrderStatusData({
            statusCounts: [],
            ordersByStatus: {},
          });
          return;
        }
        const statusData = await response.json();
        setOrderStatusData(statusData);
      } catch (err) {
        console.error('Error fetching order status counts:', err);
        // Set empty data structure to prevent UI errors
        setOrderStatusData({
          statusCounts: [],
          ordersByStatus: {},
        });
      } finally {
        setLoadingOrderStatus(false);
      }
    }
    fetchOrderStatusCounts();
  }, [router]);

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

      {/* Order Status Blocks */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Order Status</h2>
        {loadingOrderStatus ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Card key={index} className="animate-pulse">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="h-4 w-24 bg-gray-200 rounded"></div>
                  <div className="w-5 h-5 bg-gray-200 rounded"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 w-12 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 w-16 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : orderStatusData ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
            {orderStatusData.statusCounts.map((statusInfo) => {
              const getStatusIcon = (status: string) => {
                switch (status) {
                  case 'Accepted into network':
                    return <Package className="w-5 h-5" />;
                  case 'Tracking created':
                    return <FileText className="w-5 h-5" />;
                  case 'Received at origin branch':
                    return <Box className="w-5 h-5" />;
                  case 'Loaded onto vehicle':
                    return <Truck className="w-5 h-5" />;
                  case 'Line haul in transit':
                    return <Truck className="w-5 h-5" />;
                  case 'Arrived at branch (hub)':
                    return <Box className="w-5 h-5" />;
                  case 'Out for delivery':
                    return <Truck className="w-5 h-5" />;
                  case 'Delivered':
                    return <CheckCircle className="w-5 h-5" />;
                  default:
                    return <Package className="w-5 h-5" />;
                }
              };

              return (
                <Card
                  key={statusInfo.status}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setSelectedStatus(statusInfo.status)}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{statusInfo.status}</CardTitle>
                    <div className="flex items-center gap-2">
                      {statusInfo.hasStuckOrders && (
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                      )}
                      {getStatusIcon(statusInfo.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{statusInfo.count}</div>
                    <p className="text-xs text-muted-foreground mt-1">orders</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : null}
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

      {/* Orders by Status Dialog */}
      <Dialog open={selectedStatus !== null} onOpenChange={(open) => !open && setSelectedStatus(null)}>
        <DialogContent className="w-[95vw] max-w-6xl max-h-[80vh] overflow-y-auto overflow-x-hidden p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="break-words">{selectedStatus} - Orders</DialogTitle>
            <DialogDescription>
              {orderStatusData && selectedStatus && orderStatusData.ordersByStatus[selectedStatus]?.length || 0} order(s) in this status
            </DialogDescription>
          </DialogHeader>
          {selectedStatus && orderStatusData && orderStatusData.ordersByStatus[selectedStatus] && (
            <div className="mt-4 w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[20%]">Order ID</TableHead>
                    <TableHead className="w-[15%]">Date</TableHead>
                    <TableHead className="w-[25%]">Customer Reference</TableHead>
                    <TableHead className="text-right w-[15%]">Total</TableHead>
                    <TableHead className="w-[25%]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderStatusData.ordersByStatus[selectedStatus].map((order) => (
                    <TableRow
                      key={order.orderId}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={async () => {
                        setSelectedOrder(order);
                        setLoadingDeliveryDetails(true);
                        setOrderDeliveryDetails(null);
                        
                        try {
                          const response = await fetch(`/api/admin/orders/delivery-status/${order.orderId}`);
                          if (response.ok) {
                            const data = await response.json();
                            setOrderDeliveryDetails({
                              waybills: data.waybills || [],
                            });
                          }
                        } catch (err) {
                          console.error('Error fetching delivery details:', err);
                        } finally {
                          setLoadingDeliveryDetails(false);
                        }
                      }}
                    >
                      <TableCell className="font-medium break-all text-xs sm:text-sm">{order.orderId}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs sm:text-sm">{new Date(order.orderDate).toLocaleDateString('en-ZA')}</TableCell>
                      <TableCell className="font-mono text-xs sm:text-sm break-all">{order.customerReference}</TableCell>
                      <TableCell className="text-right font-medium whitespace-nowrap text-xs sm:text-sm">{formatCurrency(order.totalIncVat)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs sm:text-sm break-words">{order.status}</span>
                          {order.isStuck && (
                            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Order Detail Dialog */}
      <Dialog open={selectedOrder !== null} onOpenChange={(open) => {
        if (!open) {
          setSelectedOrder(null);
          setOrderDeliveryDetails(null);
        }
      }}>
        <DialogContent className="w-[95vw] max-w-5xl max-h-[80vh] overflow-y-auto overflow-x-hidden p-4 sm:p-6">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="break-words">Order Details - {selectedOrder.orderId}</DialogTitle>
                <DialogDescription>
                  {selectedOrder.isStuck && (
                    <div className="flex items-center gap-2 text-amber-600 mt-2">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span className="break-words">This order has been in this status for more than 3 days</span>
                    </div>
                  )}
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4 space-y-6 w-full">
                {/* Order Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Order ID</p>
                    <p className="text-base break-all">{selectedOrder.orderId}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Order Date</p>
                    <p className="text-base break-words">{new Date(selectedOrder.orderDate).toLocaleDateString('en-ZA', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Customer Reference</p>
                    <p className="text-base font-mono break-all">{selectedOrder.customerReference}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Cart ID</p>
                    <p className="text-base font-mono break-all">{selectedOrder.cartId}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Status</p>
                    <p className="text-base break-words">{selectedOrder.status}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total (Inc. VAT)</p>
                    <p className="text-base font-semibold break-words">{formatCurrency(selectedOrder.totalIncVat)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Branded</p>
                    <p className="text-base break-words">{selectedOrder.branded ? 'Yes' : 'No'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Delivery</p>
                    <p className="text-base break-words">{selectedOrder.isDelivery ? 'Yes' : 'No'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Days in Status</p>
                    <p className="text-base break-words">
                      {(() => {
                        const statusDate = (selectedOrder as any).statusDate || selectedOrder.orderDate;
                        let statusDateTime: Date;
                        
                        // Check if date is in format "DD/MM/YYYY HH:mm:ss" (from delivery events)
                        if (typeof statusDate === 'string' && statusDate.includes('/')) {
                          const [datePart, timePart] = statusDate.split(' ');
                          if (datePart && timePart) {
                            const [day, month, year] = datePart.split('/');
                            statusDateTime = new Date(`${year}-${month}-${day} ${timePart}`);
                          } else {
                            const [day, month, year] = datePart.split('/');
                            statusDateTime = new Date(`${year}-${month}-${day}`);
                          }
                        } else {
                          statusDateTime = new Date(statusDate);
                        }
                        
                        const days = Math.floor((new Date().getTime() - statusDateTime.getTime()) / (1000 * 60 * 60 * 24));
                        return `${days} days`;
                      })()}
                    </p>
                  </div>
                </div>

                {/* Delivery Status Stages */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Delivery Status Stages</h3>
                  {loadingDeliveryDetails ? (
                    <div className="text-center py-4">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                      <p className="text-sm text-gray-500 mt-2">Loading delivery details...</p>
                    </div>
                  ) : orderDeliveryDetails && orderDeliveryDetails.waybills.length > 0 ? (
                    <div className="space-y-4 overflow-x-auto">
                      {orderDeliveryDetails.waybills.map((waybill, waybillIndex) => {
                        // Collect all events and sort by datetime (oldest first)
                        const allEvents = waybill.events || [];
                        const parseDate = (dateStr: string) => {
                          const [datePart, timePart] = dateStr.split(' ');
                          const [day, month, year] = datePart.split('/');
                          return new Date(`${year}-${month}-${day} ${timePart}`);
                        };
                        
                        const sortedEvents = [...allEvents].sort((a, b) => {
                          const dateA = parseDate(a.datetime);
                          const dateB = parseDate(b.datetime);
                          return dateA.getTime() - dateB.getTime();
                        });

                        return (
                          <div key={waybillIndex} className="border border-gray-200 rounded-lg p-4 min-w-[600px]">
                            {orderDeliveryDetails.waybills.length > 1 && (
                              <div className="mb-3">
                                <p className="text-xs font-medium text-gray-500">Waybill: {waybill.waybillNumber}</p>
                              </div>
                            )}
                            <div className="space-y-2">
                              {sortedEvents.map((event, eventIndex) => (
                                <div
                                  key={eventIndex}
                                  className="flex items-start gap-4 p-2 bg-gray-50 rounded border border-gray-100"
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-gray-900 text-sm break-words">{event.description}</div>
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600 mt-1">
                                      <span className="whitespace-nowrap">
                                        <span className="font-medium">Branch:</span> {event.branch}
                                      </span>
                                      <span className="whitespace-nowrap">
                                        <span className="font-medium">Date & Time:</span> {event.datetime}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                            
                            {/* POD Details */}
                            {waybill.podDetails && waybill.podDetails.length > 0 && (
                              <div className="mt-4 pt-4 border-t border-gray-200">
                                <h4 className="text-xs font-semibold text-gray-900 mb-2">Proof of Delivery (POD)</h4>
                                {waybill.podDetails.map((pod, podIndex) => (
                                  <div
                                    key={podIndex}
                                    className="p-3 bg-green-50 rounded border border-green-200"
                                  >
                                    <div className="space-y-1 text-xs">
                                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                        <span className="text-gray-600 whitespace-nowrap">
                                          <span className="font-medium">Date:</span> {pod.podDate}
                                        </span>
                                        <span className="text-gray-600 whitespace-nowrap">
                                          <span className="font-medium">Time:</span> {pod.podTime}
                                        </span>
                                      </div>
                                      <div className="text-gray-600 break-words">
                                        <span className="font-medium">Signed by:</span> {pod.name}
                                      </div>
                                      {pod.podComments && (
                                        <div className="text-gray-600 break-words">
                                          <span className="font-medium">Comments:</span> {pod.podComments}
                                        </div>
                                      )}
                                      {pod.podFileAttached && (
                                        <div className="text-blue-600 text-xs font-medium">
                                          ✓ POD file attached
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      No delivery tracking information available for this order.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}

