'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Users, ChevronDown, ChevronRight, Mail, Phone, MapPin, FileText } from 'lucide-react';
import { type PeriodKey } from '@/server/admin/metrics';

type Customer = {
  customer: string;
  company: string;
  email: string;
  phone: string;
  address: {
    street: string;
    suburb: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
  } | null;
  totalValue: number;
  orderCount: number;
  lastOrderDate: string;
};

type CustomersData = {
  customers: Customer[];
  total: number;
  period: PeriodKey;
};

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
  });
};

export default function CustomersClient() {
  const router = useRouter();
  const [period, setPeriod] = useState<PeriodKey>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [data, setData] = useState<CustomersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [customerInvoices, setCustomerInvoices] = useState<Record<number, Array<{
    created_at: string;
    invoice_no: string;
    value: number;
    pdf_url: string;
  }>>>({});
  const [loadingInvoices, setLoadingInvoices] = useState<Set<number>>(new Set());

  useEffect(() => {
    async function fetchCustomers() {
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
          limit: '100',
        });

        const response = await fetch(`/api/admin/customers?${params.toString()}`);
        if (!response.ok) {
          if (response.status === 401) {
            router.refresh();
            return;
          }
          throw new Error('Failed to fetch customers');
        }
        const customersData = await response.json();
        setData(customersData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load customers');
      } finally {
        setLoading(false);
      }
    }

    fetchCustomers();
  }, [period, customStart, customEnd, router]);

  async function fetchCustomerInvoices(customer: Customer, idx: number) {
    // Create a customer key for the API
    const customerKey = encodeURIComponent(`${customer.customer}|${customer.company}`);
    
    // Check if we already have invoices for this customer
    if (customerInvoices[idx]) {
      return;
    }

    setLoadingInvoices(prev => new Set(prev).add(idx));
    
    try {
      const response = await fetch(`/api/admin/customers/${customerKey}/invoices`);
      if (!response.ok) {
        throw new Error('Failed to fetch invoices');
      }
      const data = await response.json();
      setCustomerInvoices(prev => ({
        ...prev,
        [idx]: data.invoices || [],
      }));
    } catch (err) {
      console.error('Error fetching customer invoices:', err);
      setCustomerInvoices(prev => ({
        ...prev,
        [idx]: [],
      }));
    } finally {
      setLoadingInvoices(prev => {
        const next = new Set(prev);
        next.delete(idx);
        return next;
      });
    }
  }

  if (loading && !data) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 lg:pt-16 pt-20">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 lg:pt-16 pt-20">
        <div className="text-lg text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 lg:pt-16 pt-16">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 sm:w-8 sm:h-8" />
            Top Customers
          </h1>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Time Period</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-2">Period</label>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as PeriodKey)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm sm:text-base"
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
              </div>
              {period === 'custom' && (
                <div className="flex flex-col sm:flex-row gap-2 flex-1">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-2">Start Date</label>
                    <Input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-2">End Date</label>
                    <Input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle>
            Customer Rankings {data && `(${data.total} ${data.total === 1 ? 'customer' : 'customers'})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data && data.customers.length > 0 ? (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Rank</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead className="text-right">Total Value</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead>Last Order</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.customers.map((customer, idx) => {
                      const isExpanded = expandedRows.has(idx);
                      const hasDetails = customer.email || customer.phone || customer.address;
                      const rowKey = `${customer.customer}-${customer.company}-${idx}`;
                      
                      return (
                        <React.Fragment key={rowKey}>
                          <TableRow 
                            className={hasDetails ? 'cursor-pointer hover:bg-gray-50' : ''}
                            onClick={() => {
                              if (hasDetails) {
                                const willExpand = !expandedRows.has(idx);
                                setExpandedRows(prev => {
                                  const next = new Set(prev);
                                  if (next.has(idx)) {
                                    next.delete(idx);
                                  } else {
                                    next.add(idx);
                                    // Fetch invoices when expanding
                                    if (willExpand) {
                                      fetchCustomerInvoices(customer, idx);
                                    }
                                  }
                                  return next;
                                });
                              }
                            }}
                          >
                            <TableCell className="font-medium">
                              {hasDetails && (
                                <span className="inline-block mr-2">
                                  {isExpanded ? (
                                    <ChevronDown className="w-4 h-4" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4" />
                                  )}
                                </span>
                              )}
                              #{idx + 1}
                            </TableCell>
                            <TableCell className="font-medium">{customer.customer}</TableCell>
                            <TableCell>{customer.company}</TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatCurrency(customer.totalValue)}
                            </TableCell>
                            <TableCell className="text-right">{customer.orderCount}</TableCell>
                            <TableCell>{formatDate(customer.lastOrderDate)}</TableCell>
                          </TableRow>
                          {isExpanded && hasDetails && (
                            <TableRow>
                              <TableCell colSpan={6} className="bg-gray-50 p-4">
                                <div className="space-y-6">
                                  {/* Contact Information */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {customer.email && (
                                      <div className="flex items-start gap-2">
                                        <Mail className="w-4 h-4 mt-0.5 text-gray-500 flex-shrink-0" />
                                        <div>
                                          <div className="text-xs text-gray-500 mb-0.5">Email</div>
                                          <div className="text-sm font-medium">{customer.email}</div>
                                        </div>
                                      </div>
                                    )}
                                    {customer.phone && (
                                      <div className="flex items-start gap-2">
                                        <Phone className="w-4 h-4 mt-0.5 text-gray-500 flex-shrink-0" />
                                        <div>
                                          <div className="text-xs text-gray-500 mb-0.5">Phone</div>
                                          <div className="text-sm font-medium">{customer.phone}</div>
                                        </div>
                                      </div>
                                    )}
                                    {customer.address && (
                                      <div className="flex items-start gap-2 md:col-span-2">
                                        <MapPin className="w-4 h-4 mt-0.5 text-gray-500 flex-shrink-0" />
                                        <div>
                                          <div className="text-xs text-gray-500 mb-0.5">Address</div>
                                          <div className="text-sm font-medium">
                                            {[
                                              customer.address.street,
                                              customer.address.suburb,
                                              customer.address.city,
                                              customer.address.province,
                                              customer.address.postalCode,
                                              customer.address.country,
                                            ].filter(Boolean).join(', ')}
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Invoices Section */}
                                  <div className="border-t pt-4">
                                    <div className="flex items-center gap-2 mb-3">
                                      <FileText className="w-4 h-4 text-gray-500" />
                                      <h3 className="text-sm font-semibold text-gray-700">
                                        Invoices ({customerInvoices[idx]?.length ?? 0})
                                      </h3>
                                    </div>
                                    {loadingInvoices.has(idx) ? (
                                      <div className="text-sm text-gray-500 py-2">Loading invoices...</div>
                                    ) : customerInvoices[idx] && customerInvoices[idx].length > 0 ? (
                                      <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                          <thead>
                                            <tr className="border-b text-left">
                                              <th className="pb-2 pr-4 text-gray-600">Date</th>
                                              <th className="pb-2 pr-4 text-gray-600">Invoice #</th>
                                              <th className="pb-2 pr-4 text-right text-gray-600">Value</th>
                                              <th className="pb-2 text-gray-600">PDF</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {customerInvoices[idx].map((invoice) => (
                                              <tr key={invoice.invoice_no} className="border-b">
                                                <td className="py-2 pr-4">{formatDate(invoice.created_at)}</td>
                                                <td className="py-2 pr-4 font-medium">{invoice.invoice_no}</td>
                                                <td className="py-2 pr-4 text-right font-semibold">
                                                  {formatCurrency(invoice.value)}
                                                </td>
                                                <td className="py-2">
                                                  <a
                                                    href={invoice.pdf_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-primary hover:underline inline-flex items-center gap-1"
                                                  >
                                                    <FileText className="w-3 h-3" />
                                                    View
                                                  </a>
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    ) : (
                                      <div className="text-sm text-gray-500 py-2">No invoices found</div>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">No customers found</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

