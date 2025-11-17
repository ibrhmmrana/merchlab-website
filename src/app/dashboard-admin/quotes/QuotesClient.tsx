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
import { FileText } from 'lucide-react';
import { type PeriodKey } from '@/server/admin/metrics';

type Quote = {
  created_at: string;
  quote_no: string;
  customer: string;
  company: string;
  value: number;
  pdf_url: string;
};

type QuotesData = {
  quotes: Quote[];
  total: number;
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
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function QuotesClient() {
  const router = useRouter();
  const [period, setPeriod] = useState<PeriodKey>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [search, setSearch] = useState('');
  const [minValue, setMinValue] = useState('');
  const [maxValue, setMaxValue] = useState('');
  const [data, setData] = useState<QuotesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchQuotes() {
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
          ...(search && { search }),
          ...(minValue && { minValue }),
          ...(maxValue && { maxValue }),
        });

        const response = await fetch(`/api/admin/quotes?${params.toString()}`);
        if (!response.ok) {
          if (response.status === 401) {
            router.refresh();
            return;
          }
          throw new Error('Failed to fetch quotes');
        }
        const quotesData = await response.json();
        setData(quotesData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load quotes');
      } finally {
        setLoading(false);
      }
    }

    const timeoutId = setTimeout(() => {
      fetchQuotes();
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [period, customStart, customEnd, search, minValue, maxValue, router]);

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
        <h1 className="text-2xl sm:text-3xl font-bold mb-6">Quotes</h1>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Time Period</label>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as PeriodKey)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
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
                  <div className="mt-2 space-y-2">
                    <Input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      placeholder="Start date"
                      className="w-full"
                    />
                    <Input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      placeholder="End date"
                      className="w-full"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Search</label>
                <Input
                  type="text"
                  placeholder="Quote #, Customer, Company..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Min Value (R)</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={minValue}
                  onChange={(e) => setMinValue(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Max Value (R)</label>
                <Input
                  type="number"
                  placeholder="No limit"
                  value={maxValue}
                  onChange={(e) => setMaxValue(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle>
            All Quotes {data && `(${data.total} ${data.total === 1 ? 'result' : 'results'})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data && data.quotes.length > 0 ? (
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
                  {data.quotes.map((quote) => (
                    <TableRow key={quote.quote_no}>
                      <TableCell>{formatDate(quote.created_at)}</TableCell>
                      <TableCell>{quote.quote_no}</TableCell>
                      <TableCell>{quote.customer}</TableCell>
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
          ) : (
            <div className="text-center py-8 text-gray-500">No quotes found</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

