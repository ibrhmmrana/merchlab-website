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
import { FileText, ChevronLeft, ChevronRight, Send, Trash2 } from 'lucide-react';
import { type PeriodKey } from '@/server/admin/metrics';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

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
  page: number;
  limit: number;
  totalPages: number;
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
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [clickedPage, setClickedPage] = useState<number | null>(null);
  const [resendingQuote, setResendingQuote] = useState<string | null>(null);
  const [resentQuotes, setResentQuotes] = useState<Map<string, number>>(new Map());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedQuotes, setSelectedQuotes] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

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
          page: page.toString(),
          limit: limit.toString(),
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
  }, [period, customStart, customEnd, search, minValue, maxValue, page, limit, router, refreshTrigger]);

  // Reset to page 1 and clear selections when filters change
  useEffect(() => {
    setPage(1);
    setSelectedQuotes(new Set());
  }, [period, customStart, customEnd, search, minValue, maxValue]);

  // Clear selections when page changes
  useEffect(() => {
    setSelectedQuotes(new Set());
  }, [page]);

  // Load resent quotes from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem('resentQuotes');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          setResentQuotes(new Map(Object.entries(parsed)));
        }
      }
    } catch (error) {
      console.error('Error loading resent quotes from localStorage:', error);
      // Clear invalid data
      try {
        localStorage.removeItem('resentQuotes');
      } catch {
        // Ignore
      }
    }
  }, []);

  // Save resent quotes to localStorage whenever it changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      if (resentQuotes.size > 0) {
        const obj = Object.fromEntries(resentQuotes);
        localStorage.setItem('resentQuotes', JSON.stringify(obj));
      } else {
        // Clear localStorage if no resent quotes
        localStorage.removeItem('resentQuotes');
      }
    } catch (error) {
      console.error('Error saving resent quotes to localStorage:', error);
    }
  }, [resentQuotes]);

  const handleResendQuote = async (quoteNo: string) => {
    try {
      setResendingQuote(quoteNo);
      const response = await fetch('/api/admin/quotes/resend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ quoteNo }),
      });

      if (!response.ok) {
        // Silently fail - button will remain enabled
        console.error('Failed to resend quote:', await response.json().catch(() => ({})));
        return;
      }

      // Increment resend count for this quote
      setResentQuotes(prev => {
        const newMap = new Map(prev);
        const currentCount = newMap.get(quoteNo) || 0;
        newMap.set(quoteNo, currentCount + 1);
        return newMap;
      });
    } catch (error) {
      console.error('Error resending quote:', error);
      // Silently fail - button will remain enabled
    } finally {
      setResendingQuote(null);
    }
  };

  const handleDeleteClick = (quoteNo: string) => {
    setQuoteToDelete(quoteNo);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!quoteToDelete) return;

    try {
      setDeleting(true);
      setError(null); // Clear any previous errors
      const response = await fetch(`/api/admin/quotes/${encodeURIComponent(quoteToDelete)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.refresh();
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete quote');
      }

      // Close dialog
      setDeleteDialogOpen(false);
      setQuoteToDelete(null);
      
      // Refresh the quotes list by triggering a refetch
      // If we're on a page with only one quote and we delete it, go to previous page
      if (data && data.quotes.length === 1 && data.page > 1) {
        setPage(data.page - 1);
      } else {
        // Trigger a refetch by updating refreshTrigger
        setRefreshTrigger(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error deleting quote:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete quote');
      // Keep dialog open on error so user can try again
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setQuoteToDelete(null);
  };

  const handleSelectQuote = (quoteNo: string) => {
    setSelectedQuotes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(quoteNo)) {
        newSet.delete(quoteNo);
      } else {
        newSet.add(quoteNo);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (!data) return;
    if (selectedQuotes.size === data.quotes.length) {
      // Deselect all
      setSelectedQuotes(new Set());
    } else {
      // Select all on current page
      setSelectedQuotes(new Set(data.quotes.map(q => q.quote_no)));
    }
  };

  const handleBulkDeleteClick = () => {
    if (selectedQuotes.size === 0) return;
    setBulkDeleteDialogOpen(true);
  };

  const handleBulkDeleteConfirm = async () => {
    if (selectedQuotes.size === 0) return;

    // Save the count and selected quotes before clearing
    const selectedCount = selectedQuotes.size;
    const selectedQuotesArray = Array.from(selectedQuotes);

    try {
      setBulkDeleting(true);
      setError(null);

      // Delete all selected quotes
      const deletePromises = selectedQuotesArray.map(quoteNo =>
        fetch(`/api/admin/quotes/${encodeURIComponent(quoteNo)}`, {
          method: 'DELETE',
        })
      );

      const results = await Promise.allSettled(deletePromises);
      
      // Check for failures
      const failures = results.filter(
        (result) => result.status === 'rejected' || 
        (result.status === 'fulfilled' && !result.value.ok)
      );

      if (failures.length > 0) {
        console.error('Some quotes failed to delete:', failures);
        // Still show success if at least some were deleted
        if (failures.length < selectedCount) {
          setError(`Failed to delete ${failures.length} of ${selectedCount} quotes`);
        } else {
          setError('Failed to delete quotes');
          setBulkDeleteDialogOpen(false);
          return;
        }
      }

      // Clear selection and refresh
      setSelectedQuotes(new Set());
      setBulkDeleteDialogOpen(false);
      
      // Refresh the quotes list
      if (data && selectedCount >= data.quotes.length && data.page > 1) {
        // If we deleted all quotes on the page, go to previous page
        setPage(data.page - 1);
      } else {
        // Otherwise, just refetch current page
        setRefreshTrigger(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error in bulk delete:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete quotes');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleBulkDeleteCancel = () => {
    setBulkDeleteDialogOpen(false);
  };

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
    <div className="p-4 sm:p-6 lg:p-8 lg:pt-16 pt-20">
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                All Quotes {data && `(${data.total} ${data.total === 1 ? 'result' : 'results'})`}
              </CardTitle>
              {data && data.total > 0 && (
                <div className="text-sm text-gray-600 mt-1">
                  Showing {((data.page - 1) * data.limit) + 1} to {Math.min(data.page * data.limit, data.total)} of {data.total}
                </div>
              )}
            </div>
            {selectedQuotes.size > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">
                  {selectedQuotes.size} {selectedQuotes.size === 1 ? 'quote' : 'quotes'} selected
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDeleteClick}
                  disabled={bulkDeleting}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete Selected
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {data && data.quotes.length > 0 ? (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={data && data.quotes.length > 0 && selectedQuotes.size === data.quotes.length}
                        onChange={handleSelectAll}
                        className="cursor-pointer"
                        aria-label="Select all quotes"
                      />
                    </TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Quote #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>PDF</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.quotes.map((quote) => (
                    <TableRow key={quote.quote_no}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedQuotes.has(quote.quote_no)}
                          onChange={() => handleSelectQuote(quote.quote_no)}
                          className="cursor-pointer"
                          aria-label={`Select quote ${quote.quote_no}`}
                        />
                      </TableCell>
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
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="relative inline-block">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleResendQuote(quote.quote_no)}
                              disabled={resendingQuote === quote.quote_no}
                              className="transition-all duration-150 hover:scale-105 hover:shadow-md active:scale-95 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none"
                            >
                              <Send className="w-4 h-4 mr-1" />
                              {resendingQuote === quote.quote_no ? 'Sending...' : 'Resend'}
                            </Button>
                            {resentQuotes.has(quote.quote_no) && (
                              <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center shadow-md">
                                x{resentQuotes.get(quote.quote_no)}
                              </span>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteClick(quote.quote_no)}
                            className="transition-all duration-150 hover:scale-105 hover:shadow-md active:scale-95 cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
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

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t">
              <div className="text-sm text-gray-600">
                Page {data.page} of {data.totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPage(p => Math.max(1, p - 1));
                    setClickedPage(-1);
                    setTimeout(() => setClickedPage(null), 200);
                  }}
                  disabled={data.page === 1 || loading}
                  className="transition-all duration-150 active:scale-95 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (data.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (data.page <= 3) {
                      pageNum = i + 1;
                    } else if (data.page >= data.totalPages - 2) {
                      pageNum = data.totalPages - 4 + i;
                    } else {
                      pageNum = data.page - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={data.page === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setPage(pageNum);
                          setClickedPage(pageNum);
                          setTimeout(() => setClickedPage(null), 200);
                        }}
                        disabled={loading}
                        className={`min-w-[40px] transition-all duration-150 cursor-pointer ${
                          clickedPage === pageNum ? 'scale-90 bg-primary/80' : 'active:scale-95'
                        }`}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPage(p => Math.min(data.totalPages, p + 1));
                    setClickedPage(-2);
                    setTimeout(() => setClickedPage(null), 200);
                  }}
                  disabled={data.page === data.totalPages || loading}
                  className="transition-all duration-150 active:scale-95 cursor-pointer"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Quote</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete quote <strong>{quoteToDelete}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleDeleteCancel}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Multiple Quotes</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{selectedQuotes.size}</strong> {selectedQuotes.size === 1 ? 'quote' : 'quotes'}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleBulkDeleteCancel}
              disabled={bulkDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDeleteConfirm}
              disabled={bulkDeleting}
            >
              {bulkDeleting ? 'Deleting...' : `Delete ${selectedQuotes.size}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

