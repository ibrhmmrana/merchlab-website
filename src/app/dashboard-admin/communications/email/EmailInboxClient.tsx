'use client';

import { useState, useEffect } from 'react';
import { Search, Star, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { GmailMessage } from '@/lib/gmailMessages';
import EmailDetail from './EmailDetail';

export default function EmailInboxClient() {
  const [messages, setMessages] = useState<GmailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmailId, setSelectedEmailId] = useState<number | null>(null);
  const [starredIds, setStarredIds] = useState<Set<number>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Fetch messages
  useEffect(() => {
    async function fetchMessages() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (searchQuery.trim()) {
          params.append('search', searchQuery.trim());
        }
        params.append('limit', '100');

        const response = await fetch(`/api/admin/gmail/inbox?${params.toString()}`);
        if (!response.ok) {
          throw new Error('Failed to fetch emails');
        }
        const data = await response.json();
        setMessages(data.messages || []);
      } catch (error) {
        console.error('Error fetching emails:', error);
        setMessages([]);
      } finally {
        setLoading(false);
      }
    }

    fetchMessages();
  }, [searchQuery]);

  // Format time for display
  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      // Same day: show HH:mm
      if (diffDays === 0) {
        return date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
      }

      // Otherwise: show dd MMM
      return date.toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
      });
    } catch {
      return '';
    }
  };

  // Toggle star
  const toggleStar = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setStarredIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Toggle selection
  const toggleSelection = (id: number, e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Handle row click
  const handleRowClick = (id: number) => {
    setSelectedEmailId(id);
  };

  // Get sender display name
  const getSenderName = (message: GmailMessage) => {
    return message.fromName || message.fromAddress;
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 flex-shrink-0">
        <div className="flex items-center gap-2 flex-shrink-0">
          <h1 className="text-lg font-medium text-gray-900">Inbox</h1>
        </div>
        <div className="flex-1 min-w-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              type="text"
              placeholder="Search mail"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-50 border-0 rounded-lg h-9 text-sm w-full"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0"
            aria-label="Filter"
          >
            <Filter className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Inbox List */}
        {!selectedEmailId ? (
          <div className="flex-1 overflow-y-auto bg-white">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading emails...</div>
            ) : messages.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                {searchQuery ? 'No emails found' : 'No emails in inbox'}
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    onClick={() => handleRowClick(message.id)}
                    className="flex items-center gap-2 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors group"
                  >
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedIds.has(message.id)}
                      onChange={(e) => toggleSelection(message.id, e)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />

                    {/* Star */}
                    <button
                      onClick={(e) => toggleStar(message.id, e)}
                      className="p-1 hover:bg-gray-200 rounded-full transition-colors flex-shrink-0"
                      aria-label={starredIds.has(message.id) ? 'Unstar' : 'Star'}
                    >
                      <Star
                        className={`w-4 h-4 ${
                          starredIds.has(message.id)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-400 group-hover:text-gray-600'
                        }`}
                      />
                    </button>

                    {/* Sender */}
                    <div className="hidden sm:block min-w-[150px] max-w-[150px] truncate">
                      <span className="text-sm font-medium text-gray-900">
                        {getSenderName(message)}
                      </span>
                    </div>

                    {/* Subject + Snippet */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-semibold text-gray-900 truncate">
                            {message.subject || '(No subject)'}
                          </span>
                          {/* Show sender on mobile */}
                          <span className="sm:hidden text-xs text-gray-500 truncate">
                            {getSenderName(message)}
                          </span>
                        </div>
                        {message.snippet && (
                          <>
                            <span className="hidden sm:inline text-gray-400">—</span>
                            <span className="text-sm text-gray-600 truncate">
                              {message.snippet}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Time */}
                    <div className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0 ml-2">
                      {formatTime(message.dateTime)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <EmailDetail
            emailId={selectedEmailId}
            onBack={() => setSelectedEmailId(null)}
          />
        )}
      </div>
    </div>
  );
}

