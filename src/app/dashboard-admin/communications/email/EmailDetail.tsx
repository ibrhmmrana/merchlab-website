'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { GmailMessage } from '@/lib/gmailMessages';

interface EmailDetailProps {
  emailId: number;
  onBack: () => void;
}

export default function EmailDetail({ emailId, onBack }: EmailDetailProps) {
  const [email, setEmail] = useState<GmailMessage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEmail() {
      setLoading(true);
      try {
        const response = await fetch(`/api/admin/gmail/messages/${emailId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch email');
        }
        const data = await response.json();
        setEmail(data.message);
      } catch (error) {
        console.error('Error fetching email:', error);
        setEmail(null);
      } finally {
        setLoading(false);
      }
    }

    fetchEmail();
  }, [emailId]);

  // Format date/time for display
  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  // Get sender display
  const getSenderDisplay = (message: GmailMessage) => {
    if (message.fromName && message.fromAddress) {
      return `${message.fromName} <${message.fromAddress}>`;
    }
    return message.fromAddress;
  };

  // Get recipient display
  const getRecipientDisplay = (message: GmailMessage) => {
    if (message.toName && message.toAddress) {
      return `${message.toName} <${message.toAddress}>`;
    }
    return message.toAddress || '';
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center text-gray-500">Loading email...</div>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Email not found</p>
          <Button onClick={onBack} variant="outline">
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to inbox
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <Button
          onClick={onBack}
          variant="ghost"
          size="sm"
          className="flex-shrink-0"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-gray-900 truncate">
            {email.subject || '(No subject)'}
          </h1>
        </div>
      </div>

      {/* Email Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {/* Email Metadata */}
          <div className="mb-6 space-y-2">
            <div>
              <span className="text-sm font-medium text-gray-700">From: </span>
              <span className="text-sm text-gray-900">{getSenderDisplay(email)}</span>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">To: </span>
              <span className="text-sm text-gray-900">{getRecipientDisplay(email)}</span>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">Date: </span>
              <span className="text-sm text-gray-900">{formatDateTime(email.dateTime)}</span>
            </div>
          </div>

          {/* Email Body */}
          <div className="border-t border-gray-200 pt-6">
            {email.textHtml ? (
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: email.textHtml }}
                style={{
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  lineHeight: '1.6',
                  color: '#1f2937',
                }}
              />
            ) : email.textPlain ? (
              <div
                className="whitespace-pre-wrap text-sm text-gray-900"
                style={{ lineHeight: '1.6' }}
              >
                {email.textPlain}
              </div>
            ) : (
              <div className="text-sm text-gray-500 italic">No content available</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

