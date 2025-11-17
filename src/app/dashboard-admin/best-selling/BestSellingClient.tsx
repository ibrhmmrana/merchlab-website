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
import { type PeriodKey } from '@/server/admin/metrics';

type MetricsData = {
  period: PeriodKey;
  topItems: Array<{
    description: string;
    stock_id: number | null;
    colour: string | null;
    size: string | null;
    units: number;
    revenue: number;
  }>;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export default function BestSellingClient() {
  const router = useRouter();
  const [period, setPeriod] = useState<PeriodKey>('30d');
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        setLoading(true);
        const response = await fetch(`/api/admin/metrics?period=${period}`);
        if (!response.ok) {
          if (response.status === 401) {
            router.refresh();
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
  }, [period, router]);

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 lg:pt-16 pt-20">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 lg:pt-16 pt-20">
        <div className="text-lg text-red-600">Error: {error || 'Failed to load data'}</div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 lg:pt-16 pt-16">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Best Selling Items</h1>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as PeriodKey)}
          className="px-4 py-2 border border-gray-300 rounded-md bg-white text-sm sm:text-base w-full sm:w-auto"
        >
          <option value="4h">4h</option>
          <option value="12h">12h</option>
          <option value="24h">24h</option>
          <option value="7d">7d</option>
          <option value="30d">30d</option>
          <option value="90d">90d</option>
          <option value="ytd">YTD</option>
          <option value="all">All</option>
        </select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Sold Items ({period})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle px-4 sm:px-0">
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
              {data.topItems.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell>{item.description}</TableCell>
                  <TableCell>{item.stock_id || '-'}</TableCell>
                  <TableCell>{item.colour || '-'}</TableCell>
                  <TableCell>{item.size || '-'}</TableCell>
                  <TableCell>{item.units.toLocaleString()}</TableCell>
                  <TableCell>{formatCurrency(item.revenue)}</TableCell>
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

