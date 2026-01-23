'use client';

import React, { useEffect, useState } from 'react';
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
import { Phone, ChevronDown, ChevronUp, ExternalLink, Play, Loader2, PhoneCall, TrendingUp, XCircle, CheckCircle, AlertCircle, DollarSign, Trash2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { type PeriodKey } from '@/server/admin/metrics';

type CallRating = 'WON' | 'NEXT_STEP' | 'LOST' | 'NO_RESULT';

type CallRecord = {
  id: number;
  transcript: string | null;
  cost: number | null;
  call_recording: string | null;
  summary: string | null;
  name: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  item: string | null;
  quote_number: string | null;
  quote: string | null;
  grand_total: string | null;
  rating: CallRating | null;
  rating_reason: string | null;
  created_at: string;
  updated_at: string;
};

type CallsData = {
  calls: CallRecord[];
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Johannesburg',
  });
};

const formatCost = (cost: number | null) => {
  if (cost === null) return 'N/A';
  return `$${cost.toFixed(3)}`;
};

const resolvePeriod = (period: PeriodKey, customStart?: string, customEnd?: string): { start?: Date; end?: Date } => {
  const end = new Date();

  if (period === 'ytd') {
    const start = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));
    return { start, end };
  }

  if (period === 'all' || period === 'custom') {
    if (period === 'custom' && customStart && customEnd) {
      return { start: new Date(customStart), end: new Date(customEnd) };
    }
    return { start: undefined, end };
  }

  const nowMs = end.getTime();
  const hoursMap: Partial<Record<Exclude<PeriodKey, 'ytd' | 'all' | 'custom'>, number>> = {
    '4h': 4,
    '12h': 12,
    '24h': 24,
    '7d': 24 * 7,
    '30d': 24 * 30,
    '90d': 24 * 90,
  };

  const hrs = hoursMap[period as keyof typeof hoursMap] ?? 0;
  const start = new Date(nowMs - hrs * 3600 * 1000);

  return { start, end };
};

export default function CallsClient() {
  const router = useRouter();
  const [data, setData] = useState<CallsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [analyzingCalls, setAnalyzingCalls] = useState<Set<number>>(new Set());
  const [period, setPeriod] = useState<PeriodKey>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [ratingFilter, setRatingFilter] = useState<CallRating | 'ALL'>('ALL');
  const [testCallDialogOpen, setTestCallDialogOpen] = useState(false);
  const [testCallPhone, setTestCallPhone] = useState('');
  const [testCallFirstName, setTestCallFirstName] = useState('');
  const [testCallQuoteNumber, setTestCallQuoteNumber] = useState('');
  const [recentQuotes, setRecentQuotes] = useState<Array<{ quote_no: string; created_at: string; value: number }>>([]);
  const [loadingRecentQuotes, setLoadingRecentQuotes] = useState(false);
  const [initiatingCall, setInitiatingCall] = useState(false);
  const [pollingCall, setPollingCall] = useState(false);
  
  // Manual call state
  const [manualCallDialogOpen, setManualCallDialogOpen] = useState(false);
  const [manualCallPhone, setManualCallPhone] = useState('');
  const [manualCallFirstName, setManualCallFirstName] = useState('');
  const [manualCallQuoteNumber, setManualCallQuoteNumber] = useState('');
  const [loadingQuoteDetails, setLoadingQuoteDetails] = useState(false);
  const [initiatingManualCall, setInitiatingManualCall] = useState(false);
  const [deletingCallId, setDeletingCallId] = useState<number | null>(null);

  useEffect(() => {
    async function fetchCalls() {
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

        const response = await fetch(`/api/admin/calls?${params.toString()}`, {
          cache: 'no-store',
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            router.refresh();
            return;
          }
          throw new Error('Failed to fetch calls');
        }
        
        const callsData = await response.json();
        setData(callsData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load calls');
      } finally {
        setLoading(false);
      }
    }

    fetchCalls();
  }, [period, customStart, customEnd, router]);

  const toggleRow = (id: number) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const analyzeCall = async (callId: number) => {
    if (analyzingCalls.has(callId)) return;

    try {
      setAnalyzingCalls((prev) => new Set(prev).add(callId));
      
      const response = await fetch('/api/admin/calls/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ callId }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze call');
      }

      const result = await response.json();

      // Update the call in local state
      if (data) {
        setData({
          calls: data.calls.map((call) =>
            call.id === callId
              ? { ...call, rating: result.rating, rating_reason: result.reason }
              : call
          ),
        });
      }
    } catch (err) {
      console.error('Error analyzing call:', err);
    } finally {
      setAnalyzingCalls((prev) => {
        const newSet = new Set(prev);
        newSet.delete(callId);
        return newSet;
      });
    }
  };

  const getRatingColor = (rating: CallRating | null) => {
    switch (rating) {
      case 'WON':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'NEXT_STEP':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'LOST':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'NO_RESULT':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-300';
    }
  };

  const getRatingLabel = (rating: CallRating | null) => {
    switch (rating) {
      case 'WON':
        return 'Won';
      case 'NEXT_STEP':
        return 'Next Step';
      case 'LOST':
        return 'Lost';
      case 'NO_RESULT':
        return 'No Result';
      default:
        return 'Analyzing...';
    }
  };

  // Auto-analyze calls without ratings
  useEffect(() => {
    if (data && !loading) {
      data.calls.forEach((call) => {
        if (!call.rating && call.transcript && !analyzingCalls.has(call.id)) {
          analyzeCall(call.id);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, loading]);

  // Fetch recent quotes when dialog opens
  useEffect(() => {
    if (testCallDialogOpen) {
      fetchRecentQuotes();
    }
  }, [testCallDialogOpen]);

  // Fetch recent quotes when manual call dialog opens
  useEffect(() => {
    if (manualCallDialogOpen) {
      fetchRecentQuotes();
    }
  }, [manualCallDialogOpen]);

  const fetchRecentQuotes = async () => {
    try {
      setLoadingRecentQuotes(true);
      const response = await fetch('/api/admin/calls/recent-quotes', {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch recent quotes');
      }

      const result = await response.json();
      setRecentQuotes(result.quotes || []);
    } catch (err) {
      console.error('Error fetching recent quotes:', err);
    } finally {
      setLoadingRecentQuotes(false);
    }
  };

  const fetchQuoteDetails = async (quoteNumber: string) => {
    if (!quoteNumber) return;
    
    try {
      setLoadingQuoteDetails(true);
      const response = await fetch(`/api/admin/calls/quote-details?quoteNumber=${encodeURIComponent(quoteNumber)}`, {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch quote details');
      }

      const result = await response.json();
      if (result.firstName) {
        setManualCallFirstName(result.firstName);
      }
      if (result.phone) {
        setManualCallPhone(result.phone);
      }
    } catch (err) {
      console.error('Error fetching quote details:', err);
      alert('Failed to load quote details. You can still enter the information manually.');
    } finally {
      setLoadingQuoteDetails(false);
    }
  };

  const handleQuoteSelect = (quoteNumber: string) => {
    setManualCallQuoteNumber(quoteNumber);
    fetchQuoteDetails(quoteNumber);
  };

  const deleteCall = async (callId: number) => {
    if (!confirm('Are you sure you want to delete this call record? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingCallId(callId);
      const response = await fetch(`/api/admin/calls/${callId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete call record');
      }

      // Remove the call from the local state
      if (data) {
        setData({
          calls: data.calls.filter(call => call.id !== callId),
        });
      }

      // Remove from expanded rows if it was expanded
      setExpandedRows((prev) => {
        const newSet = new Set(prev);
        newSet.delete(callId);
        return newSet;
      });

      alert('Call record deleted successfully');
    } catch (err) {
      console.error('Error deleting call record:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete call record');
    } finally {
      setDeletingCallId(null);
    }
  };

  const initiateManualCall = async () => {
    if (!manualCallPhone || !manualCallFirstName || !manualCallQuoteNumber) {
      alert('Please fill in all fields');
      return;
    }

    try {
      setInitiatingManualCall(true);
      const response = await fetch('/api/admin/calls/manual-call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: manualCallPhone,
          firstName: manualCallFirstName,
          quoteNumber: manualCallQuoteNumber,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initiate call');
      }

      // Close dialog and start polling
      setManualCallDialogOpen(false);
      setPollingCall(true);
      
      // Normalize phone number for comparison (remove + and spaces)
      const normalizedPhone = manualCallPhone.replace(/^\+/, '').replace(/\s/g, '');
      const startTime = Date.now();
      
      // Poll for the call record (check every 2 seconds for up to 60 seconds)
      let attempts = 0;
      const maxAttempts = 30;
      const pollInterval = setInterval(async () => {
        attempts++;
        
        if (attempts > maxAttempts || Date.now() - startTime > 60000) {
          clearInterval(pollInterval);
          setPollingCall(false);
          alert('Call initiated. The call record may take a moment to appear. Please refresh the page to see it.');
          return;
        }

        try {
          const params = new URLSearchParams({
            period: 'all',
          });
          const pollResponse = await fetch(`/api/admin/calls?${params.toString()}`);
          if (pollResponse.ok) {
            const pollData = await pollResponse.json();
            const newCall = pollData.calls?.find((call: CallRecord) => {
              const callPhone = call.phone?.replace(/^\+/, '').replace(/\s/g, '') || '';
              return callPhone === normalizedPhone && 
                     call.quote_number === manualCallQuoteNumber &&
                     new Date(call.created_at).getTime() > startTime - 5000; // Allow 5 second buffer
            });

            if (newCall) {
              clearInterval(pollInterval);
              setPollingCall(false);
              // Refresh the page to show the new call
              window.location.reload();
            }
          }
        } catch (pollErr) {
          console.error('Error polling for call:', pollErr);
        }
      }, 2000);

      alert('Call initiated. The call record may take a moment to appear. Please refresh the page to see it.');
    } catch (err) {
      console.error('Error initiating manual call:', err);
      alert(err instanceof Error ? err.message : 'Failed to initiate call');
    } finally {
      setInitiatingManualCall(false);
    }
  };

  const initiateTestCall = async () => {
    if (!testCallPhone || !testCallFirstName || !testCallQuoteNumber) {
      alert('Please fill in all fields');
      return;
    }

    try {
      setInitiatingCall(true);
      const response = await fetch('/api/admin/calls/test-call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: testCallPhone,
          firstName: testCallFirstName,
          quoteNumber: testCallQuoteNumber,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initiate test call');
      }

      // Close dialog and start polling
      setTestCallDialogOpen(false);
      setPollingCall(true);
      
      // Normalize phone number for comparison (remove + and spaces)
      const normalizedPhone = testCallPhone.replace(/^\+/, '').replace(/\s/g, '');
      const startTime = Date.now();
      
      // Poll for the call record (check every 2 seconds for up to 60 seconds)
      let attempts = 0;
      const maxAttempts = 30;
      const pollInterval = setInterval(async () => {
        attempts++;
        
        try {
          const callsResponse = await fetch('/api/admin/calls?period=all', {
            cache: 'no-store',
          });
          
          if (callsResponse.ok) {
            const callsData = await callsResponse.json();
            // Find calls created in the last 2 minutes
            const recentCalls = callsData.calls?.filter((call: CallRecord) => {
              const callTime = new Date(call.created_at).getTime();
              return callTime > startTime - 120000; // 2 minutes before we started
            }) || [];
            
            // Find call matching the phone number
            const matchingCall = recentCalls.find((call: CallRecord) => {
              if (!call.phone) return false;
              const callPhone = call.phone.replace(/\s/g, '');
              return callPhone === normalizedPhone || callPhone.endsWith(normalizedPhone) || normalizedPhone.endsWith(callPhone);
            });
            
            if (matchingCall) {
              // Found the call, refresh the data
              clearInterval(pollInterval);
              setPollingCall(false);
              window.location.reload();
              return;
            }
          }
        } catch (err) {
          console.error('Error polling for call:', err);
        }

        if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          setPollingCall(false);
          alert('Test call initiated. The call record may take a moment to appear. Please refresh the page to see it.');
        }
      }, 2000);
    } catch (err) {
      console.error('Error initiating test call:', err);
      alert(err instanceof Error ? err.message : 'Failed to initiate test call');
    } finally {
      setInitiatingCall(false);
    }
  };

  // Filter calls by rating
  const filteredCalls = data?.calls.filter((call) => {
    if (ratingFilter === 'ALL') return true;
    return call.rating === ratingFilter;
  }) || [];

  // Calculate stats
  const stats = React.useMemo(() => {
    const totalCalls = filteredCalls.length;
    const wonCalls = filteredCalls.filter(c => c.rating === 'WON').length;
    const nextStepCalls = filteredCalls.filter(c => c.rating === 'NEXT_STEP').length;
    const lostCalls = filteredCalls.filter(c => c.rating === 'LOST').length;
    const noResultCalls = filteredCalls.filter(c => c.rating === 'NO_RESULT').length;
    const totalCost = filteredCalls.reduce((sum, c) => sum + (c.cost || 0), 0);
    const avgCost = totalCalls > 0 ? totalCost / totalCalls : 0;
    const conversionRate = totalCalls > 0 ? (wonCalls / totalCalls) * 100 : 0;

    return {
      totalCalls,
      wonCalls,
      nextStepCalls,
      lostCalls,
      noResultCalls,
      totalCost,
      avgCost,
      conversionRate,
    };
  }, [filteredCalls]);


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-3 text-lg">Loading calls...</span>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-red-600">
                <p className="text-lg font-semibold">Error loading calls</p>
                <p className="mt-2">{error || 'Failed to load data'}</p>
                <Button
                  onClick={() => window.location.reload()}
                  className="mt-4"
                  variant="outline"
                >
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Calls</h1>
            <p className="mt-1 text-sm text-gray-500">
              View and manage voice agent call records
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value as CallRating | 'ALL')}
              className="px-4 py-2 border border-gray-300 rounded-md bg-white text-sm"
            >
              <option value="ALL">All Ratings</option>
              <option value="WON">Won</option>
              <option value="NEXT_STEP">Next Step</option>
              <option value="LOST">Lost</option>
              <option value="NO_RESULT">No Result</option>
            </select>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as PeriodKey)}
              className="px-4 py-2 border border-gray-300 rounded-md bg-white text-sm"
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
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
                <span className="text-sm">to</span>
                <Input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            )}
            <Button
              onClick={() => setTestCallDialogOpen(true)}
              size="sm"
              variant="outline"
            >
              <PhoneCall className="w-4 h-4 mr-2" />
              Test Call
            </Button>
            <Button
              onClick={() => setManualCallDialogOpen(true)}
              size="sm"
            >
              <Phone className="w-4 h-4 mr-2" />
              Manual Call
            </Button>
          </div>
        </div>

        {/* Analysis Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
              <PhoneCall className="w-5 h-5 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCalls.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">Filtered results</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Won</CardTitle>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.wonCalls.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.totalCalls > 0 ? ((stats.wonCalls / stats.totalCalls) * 100).toFixed(1) : 0}% of total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                <div className="relative group">
                  <Info className="w-4 h-4 text-gray-400 cursor-help" />
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-10 pointer-events-none">
                    <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-normal w-64 shadow-lg relative">
                      <p>The cost shown below excludes Twilio (phone provider) costs.</p>
                      <p className="mt-1">Twilio charges $0.0270 per minute on top of the displayed cost.</p>
                      <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                </div>
              </div>
              <DollarSign className="w-5 h-5 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalCost.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Avg: ${stats.avgCost.toFixed(3)} per call
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.conversionRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground mt-1">Won / Total calls</p>
            </CardContent>
          </Card>
        </div>

        {/* Rating Breakdown Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Next Step</CardTitle>
              <AlertCircle className="w-5 h-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.nextStepCalls.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lost</CardTitle>
              <XCircle className="w-5 h-5 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.lostCalls.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">No Result</CardTitle>
              <Phone className="w-5 h-5 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">{stats.noResultCalls.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Call Records ({filteredCalls.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredCalls.length === 0 ? (
              <div className="text-center py-12">
                <Phone className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">No call records found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Quote Number</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead className="w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCalls.map((call) => {
                      const isExpanded = expandedRows.has(call.id);
                      return (
                        <React.Fragment key={call.id}>
                          <TableRow
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={() => toggleRow(call.id)}
                          >
                            <TableCell>
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </TableCell>
                            <TableCell className="font-medium">
                              {formatDate(call.created_at)}
                            </TableCell>
                            <TableCell>{call.name || 'N/A'}</TableCell>
                            <TableCell>{call.company || 'N/A'}</TableCell>
                            <TableCell>{call.phone || 'N/A'}</TableCell>
                            <TableCell>
                              {call.quote_number ? (
                                <span className="font-mono text-sm">
                                  {call.quote_number}
                                </span>
                              ) : (
                                'N/A'
                              )}
                            </TableCell>
                            <TableCell>{formatCost(call.cost)}</TableCell>
                            <TableCell>
                              {analyzingCalls.has(call.id) ? (
                                <div className="flex items-center gap-2">
                                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                                  <span className="text-sm text-gray-500">Analyzing...</span>
                                </div>
                              ) : call.rating ? (
                                <span
                                  className={cn(
                                    'px-3 py-1 rounded-full text-xs font-semibold border inline-block',
                                    getRatingColor(call.rating)
                                  )}
                                >
                                  {getRatingLabel(call.rating)}
                                </span>
                              ) : call.transcript ? (
                                <span className="text-xs text-gray-400">Pending</span>
                              ) : (
                                <span className="text-xs text-gray-400">No transcript</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent row expansion
                                  deleteCall(call.id);
                                }}
                                disabled={deletingCallId === call.id}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                {deletingCallId === call.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow key={`${call.id}-details`}>
                              <TableCell colSpan={9} className="bg-gray-50 p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  {/* Left Column */}
                                  <div className="space-y-4">
                                    <div>
                                      <h3 className="font-semibold text-sm text-gray-700 mb-2">
                                        Customer Information
                                      </h3>
                                      <div className="space-y-2 text-sm">
                                        <div>
                                          <span className="font-medium">Name:</span>{' '}
                                          {call.name || 'N/A'}
                                        </div>
                                        <div>
                                          <span className="font-medium">Company:</span>{' '}
                                          {call.company || 'N/A'}
                                        </div>
                                        <div>
                                          <span className="font-medium">Email:</span>{' '}
                                          {call.email ? (
                                            <a
                                              href={`mailto:${call.email}`}
                                              className="text-blue-600 hover:underline"
                                            >
                                              {call.email}
                                            </a>
                                          ) : (
                                            'N/A'
                                          )}
                                        </div>
                                        <div>
                                          <span className="font-medium">Phone:</span>{' '}
                                          {call.phone ? (
                                            <a
                                              href={`tel:${call.phone}`}
                                              className="text-blue-600 hover:underline"
                                            >
                                              {call.phone}
                                            </a>
                                          ) : (
                                            'N/A'
                                          )}
                                        </div>
                                        <div>
                                          <span className="font-medium">Address:</span>{' '}
                                          {call.address || 'N/A'}
                                        </div>
                                      </div>
                                    </div>

                                    <div>
                                      <h3 className="font-semibold text-sm text-gray-700 mb-2">
                                        Quote Information
                                      </h3>
                                      <div className="space-y-2 text-sm">
                                        <div>
                                          <span className="font-medium">Quote Number:</span>{' '}
                                          {call.quote_number || 'N/A'}
                                        </div>
                                        <div>
                                          <span className="font-medium">Grand Total:</span>{' '}
                                          {call.grand_total || 'N/A'}
                                        </div>
                                        {call.quote && (
                                          <div>
                                            <a
                                              href={call.quote}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                                            >
                                              View Quote PDF
                                              <ExternalLink className="w-3 h-3" />
                                            </a>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {call.rating && (
                                      <div>
                                        <h3 className="font-semibold text-sm text-gray-700 mb-2">
                                          Call Rating
                                        </h3>
                                        <div className="space-y-2 text-sm">
                                          <div>
                                            <span className="font-medium">Rating:</span>{' '}
                                            <span
                                              className={cn(
                                                'px-2 py-1 rounded-full text-xs font-semibold border inline-block ml-2',
                                                getRatingColor(call.rating)
                                              )}
                                            >
                                              {getRatingLabel(call.rating)}
                                            </span>
                                          </div>
                                          {call.rating_reason && (
                                            <div>
                                              <span className="font-medium">Reason:</span>
                                              <p className="mt-1 text-gray-600 whitespace-pre-wrap">
                                                {call.rating_reason}
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Right Column */}
                                  <div className="space-y-4">
                                    <div>
                                      <h3 className="font-semibold text-sm text-gray-700 mb-2">
                                        Items
                                      </h3>
                                      <div className="text-sm text-gray-600 whitespace-pre-wrap">
                                        {call.item || 'No items listed'}
                                      </div>
                                    </div>

                                    <div>
                                      <h3 className="font-semibold text-sm text-gray-700 mb-2">
                                        Call Recording
                                      </h3>
                                      {call.call_recording ? (
                                        <div className="flex items-center gap-2">
                                          <audio
                                            controls
                                            className="w-full max-w-md"
                                            src={call.call_recording}
                                          >
                                            Your browser does not support the audio element.
                                          </audio>
                                          <a
                                            href={call.call_recording}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:underline"
                                            title="Download recording"
                                          >
                                            <ExternalLink className="w-4 h-4" />
                                          </a>
                                        </div>
                                      ) : (
                                        <p className="text-sm text-gray-500">No recording available</p>
                                      )}
                                    </div>

                                    <div>
                                      <h3 className="font-semibold text-sm text-gray-700 mb-2">
                                        Summary
                                      </h3>
                                      <p className="text-sm text-gray-600 whitespace-pre-wrap">
                                        {call.summary || 'No summary available'}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {/* Transcript Section - Full Width */}
                                {call.transcript && (
                                  <div className="mt-6 pt-6 border-t border-gray-200">
                                    <h3 className="font-semibold text-sm text-gray-700 mb-3">
                                      Full Transcript
                                    </h3>
                                    <div className="bg-white border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                                      <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans">
                                        {call.transcript}
                                      </pre>
                                    </div>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Test Call Dialog */}
      <Dialog 
        open={testCallDialogOpen} 
        onOpenChange={(open) => {
          setTestCallDialogOpen(open);
          if (!open) {
            // Reset form when dialog closes
            setTestCallPhone('');
            setTestCallFirstName('');
            setTestCallQuoteNumber('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Initiate Test Call</DialogTitle>
            <DialogDescription>
              Enter the details to initiate a test call with the AI voice agent.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Phone Number</label>
              <Input
                type="tel"
                value={testCallPhone}
                onChange={(e) => setTestCallPhone(e.target.value)}
                disabled={initiatingCall}
              />
              <p className="text-xs text-gray-500 mt-1">
                Number can start with either +27 or 0
              </p>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">First Name</label>
              <Input
                type="text"
                value={testCallFirstName}
                onChange={(e) => setTestCallFirstName(e.target.value)}
                disabled={initiatingCall}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Quote Number</label>
              {loadingRecentQuotes ? (
                <div className="flex items-center gap-2 p-2 border rounded">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-gray-500">Loading quotes...</span>
                </div>
              ) : (
                <>
                  <Input
                    type="text"
                    list="recent-quotes-list"
                    value={testCallQuoteNumber}
                    onChange={(e) => setTestCallQuoteNumber(e.target.value)}
                    disabled={initiatingCall}
                    placeholder="Enter quote number or select from recent"
                  />
                  <datalist id="recent-quotes-list">
                    {recentQuotes.map((quote) => {
                      const formattedValue = new Intl.NumberFormat('en-ZA', {
                        style: 'currency',
                        currency: 'ZAR',
                      }).format(quote.value);
                      return (
                        <option key={quote.quote_no} value={quote.quote_no}>
                          {quote.quote_no} - {formattedValue} ({new Date(quote.created_at).toLocaleDateString()})
                        </option>
                      );
                    })}
                  </datalist>
                </>
              )}
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <p className="text-xs text-yellow-800">
                <strong>Note:</strong> Payment links do not work for test calls.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTestCallDialogOpen(false)}
              disabled={initiatingCall}
            >
              Cancel
            </Button>
            <Button
              onClick={initiateTestCall}
              disabled={initiatingCall || !testCallPhone || !testCallFirstName || !testCallQuoteNumber}
            >
              {initiatingCall ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Initiating...
                </>
              ) : (
                <>
                  <PhoneCall className="w-4 h-4 mr-2" />
                  Initiate Call
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Call Dialog */}
      <Dialog 
        open={manualCallDialogOpen} 
        onOpenChange={(open) => {
          setManualCallDialogOpen(open);
          if (!open) {
            // Reset form when dialog closes
            setManualCallPhone('');
            setManualCallFirstName('');
            setManualCallQuoteNumber('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Initiate Manual Call</DialogTitle>
            <DialogDescription>
              Select a quote to automatically fill customer information, or enter details manually.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Quote Number</label>
              {loadingRecentQuotes ? (
                <div className="flex items-center gap-2 p-2 border rounded">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-gray-500">Loading quotes...</span>
                </div>
              ) : (
                <>
                  <Select
                    value={manualCallQuoteNumber}
                    onValueChange={handleQuoteSelect}
                    disabled={initiatingManualCall || loadingQuoteDetails}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a quote from recent quotes" />
                    </SelectTrigger>
                  <SelectContent>
                    {recentQuotes.map((quote) => {
                      const formattedValue = new Intl.NumberFormat('en-ZA', {
                        style: 'currency',
                        currency: 'ZAR',
                      }).format(quote.value);
                      return (
                        <SelectItem key={quote.quote_no} value={quote.quote_no}>
                          {quote.quote_no} - {formattedValue} ({new Date(quote.created_at).toLocaleDateString()})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                  </Select>
                  <Input
                    type="text"
                    value={manualCallQuoteNumber}
                    onChange={(e) => {
                      setManualCallQuoteNumber(e.target.value);
                      if (e.target.value) {
                        fetchQuoteDetails(e.target.value);
                      }
                    }}
                    disabled={initiatingManualCall || loadingQuoteDetails}
                    placeholder="Or enter quote number manually"
                    className="mt-2"
                  />
                </>
              )}
              {loadingQuoteDetails && (
                <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading quote details...</span>
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Phone Number</label>
              <Input
                type="tel"
                value={manualCallPhone}
                onChange={(e) => setManualCallPhone(e.target.value)}
                disabled={initiatingManualCall}
                placeholder="Phone number will be auto-filled from quote"
              />
              <p className="text-xs text-gray-500 mt-1">
                Number can start with either +27 or 0. You can edit this value.
              </p>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">First Name</label>
              <Input
                type="text"
                value={manualCallFirstName}
                onChange={(e) => setManualCallFirstName(e.target.value)}
                disabled={initiatingManualCall}
                placeholder="First name will be auto-filled from quote"
              />
              <p className="text-xs text-gray-500 mt-1">
                You can edit this value.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setManualCallDialogOpen(false)}
              disabled={initiatingManualCall}
            >
              Cancel
            </Button>
            <Button
              onClick={initiateManualCall}
              disabled={initiatingManualCall || !manualCallPhone || !manualCallFirstName || !manualCallQuoteNumber}
            >
              {initiatingManualCall ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Initiating...
                </>
              ) : (
                <>
                  <Phone className="w-4 h-4 mr-2" />
                  Initiate Call
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Polling Indicator */}
      {pollingCall && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Waiting for call record...</span>
        </div>
      )}
    </div>
  );
}
