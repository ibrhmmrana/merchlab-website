'use client';

import { useState, useEffect } from 'react';
import { FileText, Receipt, Building2, User, DollarSign, ExternalLink, Loader2, Mail, Phone } from 'lucide-react';
import type { CustomerActivity } from '@/lib/customerActivity';
import { Button } from '@/components/ui/button';

interface CustomerActivityProps {
  phoneNumber: string;
}

export default function CustomerActivityPanel({ phoneNumber }: CustomerActivityProps) {
  const [activity, setActivity] = useState<CustomerActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchActivity() {
      if (!phoneNumber) {
        setActivity(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/admin/whatsapp/customer-activity?phoneNumber=${encodeURIComponent(phoneNumber)}`);
        if (!response.ok) {
          throw new Error('Failed to fetch customer activity');
        }
        const data = await response.json();
        setActivity(data.activity);
      } catch (err) {
        console.error('Error fetching customer activity:', err);
        setError(err instanceof Error ? err.message : 'Failed to load activity');
        setActivity(null);
      } finally {
        setLoading(false);
      }
    }

    fetchActivity();
  }, [phoneNumber]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  // Format phone number to "012 345 6789" format
  const formatPhoneNumber = (phone: string): string => {
    if (!phone) return '';
    
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // If it starts with 27, remove it (country code)
    let cleaned = digits;
    if (digits.startsWith('27') && digits.length === 11) {
      cleaned = '0' + digits.substring(2);
    } else if (digits.startsWith('27') && digits.length > 11) {
      // Keep the last 10 digits if it's longer
      cleaned = '0' + digits.substring(digits.length - 9);
    } else if (digits.length === 9) {
      // If it's 9 digits, add leading 0
      cleaned = '0' + digits;
    } else if (digits.length === 10 && !digits.startsWith('0')) {
      // If it's 10 digits without leading 0, add it
      cleaned = '0' + digits;
    }
    
    // Format as "012 345 6789" (3-3-4)
    if (cleaned.length === 10) {
      return `${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6, 10)}`;
    }
    
    // If we can't format it properly, return as is
    return phone;
  };

  if (loading) {
    return (
      <div className="w-full lg:w-[25%] bg-white border-l border-gray-200 flex flex-col">
        <div className="hidden lg:block p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Customer Activity</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full lg:w-[25%] bg-white border-l border-gray-200 flex flex-col">
        <div className="hidden lg:block p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Customer Activity</h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-sm text-red-600 text-center">{error}</p>
        </div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="w-full lg:w-[25%] bg-white border-l border-gray-200 flex flex-col">
        <div className="hidden lg:block p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Customer Activity</h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No quotes or invoices found</p>
            <p className="text-xs text-gray-400 mt-1">This customer hasn&apos;t requested a quote yet</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full lg:w-[25%] bg-white border-l border-gray-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Customer Activity</h2>
        
        {/* Customer Info */}
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <User className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{activity.customerName}</p>
            </div>
          </div>
          {activity.company && activity.company !== '-' && (
            <div className="flex items-start gap-2">
              <Building2 className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm text-gray-600 truncate">{activity.company}</p>
              </div>
            </div>
          )}
          {activity.email && (
            <div className="flex items-start gap-2">
              <Mail className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm text-gray-600 truncate">{activity.email}</p>
              </div>
            </div>
          )}
          {activity.phone && (
            <div className="flex items-start gap-2">
              <Phone className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm text-gray-600 truncate">{formatPhoneNumber(activity.phone)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">Total Spent</span>
            <span className="text-sm font-semibold text-gray-900">{formatCurrency(activity.totalSpent)}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{activity.totalQuotes} {activity.totalQuotes === 1 ? 'Quote' : 'Quotes'}</span>
            <span>{activity.totalInvoices} {activity.totalInvoices === 1 ? 'Invoice' : 'Invoices'}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Quotes Section */}
        {activity.quotes.length > 0 && (
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-900">Quotes ({activity.quotes.length})</h3>
            </div>
            <div className="space-y-2">
              {activity.quotes.slice(0, 10).map((quote) => (
                <div
                  key={quote.quoteNo}
                  className="p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">{quote.quoteNo}</p>
                      <p className="text-xs text-gray-500">{formatDate(quote.createdAt)}</p>
                    </div>
                    <a
                      href={quote.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="w-3 h-3 text-gray-400 hover:text-gray-600" />
                    </a>
                  </div>
                  <p className="text-xs font-medium text-gray-700">{formatCurrency(quote.value)}</p>
                </div>
              ))}
              {activity.quotes.length > 10 && (
                <p className="text-xs text-gray-400 text-center pt-1">
                  +{activity.quotes.length - 10} more
                </p>
              )}
            </div>
          </div>
        )}

        {/* Invoices Section */}
        {activity.invoices.length > 0 && (
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Receipt className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-900">Invoices ({activity.invoices.length})</h3>
            </div>
            <div className="space-y-2">
              {activity.invoices.slice(0, 10).map((invoice) => (
                <div
                  key={invoice.invoiceNo}
                  className="p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">{invoice.invoiceNo}</p>
                      <p className="text-xs text-gray-500">{formatDate(invoice.createdAt)}</p>
                    </div>
                    <a
                      href={invoice.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="w-3 h-3 text-gray-400 hover:text-gray-600" />
                    </a>
                  </div>
                  <p className="text-xs font-medium text-green-600">{formatCurrency(invoice.value)}</p>
                </div>
              ))}
              {activity.invoices.length > 10 && (
                <p className="text-xs text-gray-400 text-center pt-1">
                  +{activity.invoices.length - 10} more
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

