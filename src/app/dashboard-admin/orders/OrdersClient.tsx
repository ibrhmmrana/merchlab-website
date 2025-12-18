'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ShoppingCart, RefreshCw, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  sellingPrice: number | null;
  profit: number | null;
  profitMargin: number | null;
  customer: {
    name: string;
    company: string;
    email: string;
    phone: string;
  } | null;
  invoiceNo: string | null;
};

type OrdersData = {
  orders: Order[];
  total: number;
  warning?: string;
};

const formatCurrency = (value: number | null) => {
  if (value === null) return 'N/A';
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2,
  }).format(value);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const STORAGE_BASE_URL = 'https://fxsqdpmmddcidjwzxtpc.supabase.co/storage/v1/object/public/audit-reports';

// Extract quote number from customerReference and format as invoice URL
const getInvoicePdfUrl = (customerReference: string): string | null => {
  if (!customerReference) return null;
  
  let cleaned = customerReference.trim();
  cleaned = cleaned.replace(/^[\s*:]+|[\s*:]+$/g, '');
  
  // Pattern: Q###-XXXXX or Q#########-XXXXX
  let quoteNo: string | null = null;
  if (cleaned.startsWith('Q')) {
    const match = cleaned.match(/^(Q\d+[-]\w+)/);
    if (match) {
      quoteNo = match[1];
    } else {
      const match2 = cleaned.match(/^(Q\d+[-][A-Z0-9]+)/);
      if (match2) {
        quoteNo = match2[1];
      }
    }
  } else {
    // If it doesn't start with Q, use the cleaned value as is
    quoteNo = cleaned || null;
  }
  
  if (!quoteNo) return null;
  
  // Format as invoice: INV-[quote number]
  const invoiceNo = `INV-${quoteNo}`;
  return `${STORAGE_BASE_URL}/${invoiceNo}.pdf`;
};

const getStatusColor = (status: string) => {
  const statusLower = status.toLowerCase();
  if (statusLower.includes('delivered')) {
    return 'text-green-600 bg-green-50';
  }
  if (statusLower.includes('transit')) {
    return 'text-blue-600 bg-blue-50';
  }
  if (statusLower.includes('invoiced')) {
    return 'text-purple-600 bg-purple-50';
  }
  if (statusLower.includes('error')) {
    return 'text-red-600 bg-red-50';
  }
  return 'text-gray-600 bg-gray-50';
};

export default function OrdersClient() {
  const router = useRouter();
  const [data, setData] = useState<OrdersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/orders');
      if (!response.ok) {
        if (response.status === 401) {
          router.refresh();
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch orders');
      }
      const ordersData = await response.json();
      setData(ordersData);
      
      // Log warning if present
      if (ordersData.warning) {
        console.warn('Orders API warning:', ordersData.warning);
      }
      
      // Debug: Log invoice numbers
      if (ordersData.orders && ordersData.orders.length > 0) {
        const ordersWithInvoice = ordersData.orders.filter((o: Order) => o.invoiceNo);
        const ordersWithoutInvoice = ordersData.orders.filter((o: Order) => !o.invoiceNo);
        console.log(`Orders with invoice: ${ordersWithInvoice.length}, without: ${ordersWithoutInvoice.length}`);
        if (ordersWithoutInvoice.length > 0) {
          console.log('Sample orders without invoice:', ordersWithoutInvoice.slice(0, 3).map((o: Order) => ({
            orderId: o.orderId,
            customerReference: o.customerReference,
            invoiceNo: o.invoiceNo,
          })));
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [router]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  async function handleExportPdf() {
    try {
      setGeneratingPdf(true);
      setError(null);

      const response = await fetch('/api/admin/orders/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
      a.download = `MerchLab-Orders-Report_${dateStr}.pdf`;
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

  if (loading && !data) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">Loading orders...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    const isTokenError = error.includes('expired') || error.includes('invalid') || error.includes('token');
    
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center max-w-2xl mx-auto">
              <div className="mb-4">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {isTokenError ? 'Authentication Error' : 'Error Loading Orders'}
                </h3>
                <p className="text-red-600 mb-4">{error}</p>
                {isTokenError && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 text-left">
                    <p className="text-sm text-yellow-800 mb-2">
                      <strong>To fix this:</strong>
                    </p>
                    <ol className="text-sm text-yellow-800 list-decimal list-inside space-y-1">
                      <li>Contact an administrator to update the BARRON_REFRESH_TOKEN environment variable</li>
                      <li>Or use the API endpoint <code className="bg-yellow-100 px-1 rounded">/api/admin/orders/get-refresh-token</code> to obtain a new refresh token</li>
                    </ol>
                  </div>
                )}
              </div>
              <Button onClick={handleRefresh} disabled={refreshing}>
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShoppingCart className="w-6 h-6" />
              <CardTitle>Orders</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleExportPdf}
                disabled={generatingPdf || loading || !data || data.orders.length === 0}
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
                    Export PDF
                  </>
                )}
              </Button>
              <Button onClick={handleRefresh} disabled={refreshing} variant="outline" size="sm">
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {data && data.orders.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 mb-2">No orders found</p>
              {data.warning && (
                <p className="text-sm text-amber-600 mt-2">{data.warning}</p>
              )}
              <p className="text-xs text-gray-400 mt-4">
                Check the server console logs for more details.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer Reference</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Cost Price</TableHead>
                    <TableHead className="text-right">Selling Price</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.orders.map((order) => (
                    <TableRow key={order.orderId}>
                      <TableCell className="font-medium">{order.orderId}</TableCell>
                      <TableCell>{formatDate(order.orderDate)}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {(() => {
                          // Always use invoice format: INV-[quote number from customer reference]
                          const pdfUrl = getInvoicePdfUrl(order.customerReference);
                          
                          if (pdfUrl) {
                            return (
                              <a
                                href={pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline font-medium"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  window.open(pdfUrl, '_blank', 'noopener,noreferrer');
                                }}
                              >
                                {order.customerReference || '-'}
                              </a>
                            );
                          }
                          return <span className="text-gray-500">{order.customerReference || '-'}</span>;
                        })()}
                      </TableCell>
                      <TableCell>
                        {order.customer ? (
                          <div className="min-w-[200px]">
                            <div className="font-medium text-gray-900">{order.customer.name}</div>
                            <div className="text-sm text-gray-600">{order.customer.company}</div>
                            {order.customer.email && order.customer.email !== '-' && (
                              <div className="text-xs text-gray-500">{order.customer.email}</div>
                            )}
                            {order.customer.phone && order.customer.phone !== '-' && (
                              <div className="text-xs text-gray-500">{order.customer.phone}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}
                        >
                          {order.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(order.totalIncVat)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(order.sellingPrice)}
                      </TableCell>
                      <TableCell className="text-right">
                        {order.profit !== null ? (
                          <span
                            className={order.profit >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}
                          >
                            {formatCurrency(order.profit)}
                          </span>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {order.profitMargin !== null ? (
                          <span
                            className={order.profitMargin >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}
                          >
                            {order.profitMargin.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {data && data.total > 0 && (
            <div className="mt-4 text-sm text-gray-500">
              Total: {data.total} order{data.total !== 1 ? 's' : ''}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

