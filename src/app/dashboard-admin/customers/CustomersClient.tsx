'use client';

import { useEffect, useState } from 'react';
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
import { Users } from 'lucide-react';
import { type PeriodKey } from '@/server/admin/metrics';

type Customer = {
  customer: string;
  company: string;
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

  if (loading && !data) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 lg:pt-16 pt-16">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 lg:pt-16 pt-16">
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
                    {data.customers.map((customer, idx) => (
                      <TableRow key={`${customer.customer}-${customer.company}-${idx}`}>
                        <TableCell className="font-medium">#{idx + 1}</TableCell>
                        <TableCell className="font-medium">{customer.customer}</TableCell>
                        <TableCell>{customer.company}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(customer.totalValue)}
                        </TableCell>
                        <TableCell className="text-right">{customer.orderCount}</TableCell>
                        <TableCell>{formatDate(customer.lastOrderDate)}</TableCell>
                      </TableRow>
                    ))}
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

