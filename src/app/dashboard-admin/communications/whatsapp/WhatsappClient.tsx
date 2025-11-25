'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Search, MessageSquare, Search as SearchIcon, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

// Component to highlight search terms in text
function HighlightText({ text, searchTerm }: { text: string; searchTerm: string }) {
  if (!searchTerm.trim()) return <>{text}</>;

  const parts = text.split(new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  
  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === searchTerm.toLowerCase() ? (
          <mark key={index} className="bg-yellow-300 text-gray-900 px-0.5 rounded">
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  );
}
import { supabase } from '@/lib/supabase/browser';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { WhatsappConversationSummary, WhatsappMessage, N8nChatHistoryRow } from '@/lib/chatHistories';

export default function WhatsappClient() {
  const [conversations, setConversations] = useState<WhatsappConversationSummary[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<WhatsappConversationSummary[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<WhatsappMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [isSearchingMessages, setIsSearchingMessages] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const subscriptionRef = useRef<RealtimeChannel | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchMatchRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Check if mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch conversations
  useEffect(() => {
    async function fetchConversations() {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/whatsapp/conversations');
        if (!response.ok) {
          throw new Error('Failed to fetch conversations');
        }
        const data = await response.json();
        setConversations(data.conversations || []);
        setFilteredConversations(data.conversations || []);
      } catch (error) {
        console.error('Error fetching conversations:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchConversations();
  }, []);

  // Filter conversations based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredConversations(conversations);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = conversations.filter(
      (conv) =>
        conv.customerName.toLowerCase().includes(query) ||
        conv.customerNumber.includes(query) ||
        conv.lastMessageContent.toLowerCase().includes(query)
    );
    setFilteredConversations(filtered);
  }, [searchQuery, conversations]);

  // Find messages that match the search query
  const searchMatches = messageSearchQuery.trim()
    ? messages
        .map((msg, index) => ({
          message: msg,
          index,
          matches: msg.content.toLowerCase().includes(messageSearchQuery.toLowerCase()),
        }))
        .filter((item) => item.matches)
    : [];

  // Scroll to search match when search query or match index changes
  useEffect(() => {
    if (messageSearchQuery.trim() && searchMatches.length > 0 && currentMatchIndex >= 0 && currentMatchIndex < searchMatches.length) {
      const match = searchMatches[currentMatchIndex];
      // Use a small delay to ensure DOM is updated
      setTimeout(() => {
        const element = searchMatchRefs.current.get(match.message.id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);
    }
  }, [messageSearchQuery, currentMatchIndex, searchMatches]);

  // Reset match index when search query changes
  useEffect(() => {
    if (messageSearchQuery.trim()) {
      setCurrentMatchIndex(0);
    }
  }, [messageSearchQuery]);

  // Fetch messages for selected conversation
  useEffect(() => {
    if (!selectedSessionId) {
      setMessages([]);
      return;
    }

    async function fetchMessages() {
      try {
        setLoadingMessages(true);
        const encodedSessionId = encodeURIComponent(selectedSessionId!); // Non-null assertion is safe here due to the check above
        const response = await fetch(`/api/admin/whatsapp/conversations/${encodedSessionId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch messages');
        }
        const data = await response.json();
        setMessages(data.messages || []);
      } catch (error) {
        console.error('Error fetching messages:', error);
        setMessages([]);
      } finally {
        setLoadingMessages(false);
      }
    }

    fetchMessages();
  }, [selectedSessionId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages.length]);

  // Set up realtime subscription for new messages
  useEffect(() => {
    // Clean up any existing subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }

    // Set up realtime subscription
    const channel = supabase
      .channel('chatbot_history_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chatbot_history',
        },
        async (payload) => {
          console.log('New message received:', payload);
          
          const newRow = payload.new as N8nChatHistoryRow;
          const sessionId = newRow.session_id;

          if (!sessionId) {
            console.warn('Received message without session_id');
            return;
          }

          // Helper to parse JSONB fields
          const parseJsonb = (data: string | object | null | undefined): Record<string, unknown> => {
            if (!data) return {};
            if (typeof data === 'string') {
              try {
                return JSON.parse(data) as Record<string, unknown>;
              } catch {
                return {};
              }
            }
            return data as Record<string, unknown>;
          };

          // Parse the new message
          const messageData = parseJsonb(newRow.message);
          const customerData = parseJsonb(newRow.customer);
          
          const messageType = (messageData.type === 'human' || messageData.type === 'ai' 
            ? messageData.type 
            : 'human') as 'human' | 'ai';
          const messageContent = (typeof messageData.content === 'string' 
            ? messageData.content 
            : '[New message]') as string;
          
          const customerName = (typeof customerData.name === 'string' 
            ? customerData.name 
            : typeof customerData.number === 'string' 
              ? customerData.number 
              : 'Unknown') as string;
          const customerNumber = (typeof customerData.number === 'string' 
            ? customerData.number 
            : sessionId.replace(/^ML-?\s*/, '')) as string;

          // Create new message object
          const newMessage: WhatsappMessage = {
            id: newRow.id,
            idx: newRow.idx ?? newRow.id ?? 0,
            sessionId: sessionId,
            senderType: messageType,
            content: messageContent,
            customerName,
            customerNumber,
            createdAt: newRow.date_time || newRow.created_at, // Prefer date_time, fallback to created_at
          };

          // If this message is for the currently selected conversation, add it to messages
          if (selectedSessionId === sessionId) {
            setMessages((prevMessages) => {
              // Check if message already exists (avoid duplicates)
              const exists = prevMessages.some(m => m.id === newMessage.id);
              if (exists) return prevMessages;
              
              // Add new message and sort by idx
              const updated = [...prevMessages, newMessage].sort((a, b) => a.idx - b.idx);
              
              // Auto-scroll to bottom after a short delay to allow DOM update
              setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
              }, 100);
              
              return updated;
            });
          }

          // Refresh conversations list to update last message preview
          // We'll fetch the updated conversation list
          try {
            const response = await fetch('/api/admin/whatsapp/conversations');
            if (response.ok) {
              const data = await response.json();
              setConversations(data.conversations || []);
              // Filtered conversations will update automatically via the useEffect
            }
          } catch (error) {
            console.error('Error refreshing conversations:', error);
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    subscriptionRef.current = channel;

    // Cleanup on unmount
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [selectedSessionId]);

  const selectedConversation = conversations.find((c) => c.sessionId === selectedSessionId);

  // Format timestamp for chat list (relative time)
  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch {
      return '';
    }
  };

  // Format timestamp for messages (HH:MM format)
  const formatMessageTime = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    } catch {
      return '';
    }
  };

  // Format date separator (day name if within a week, otherwise full date)
  const formatDateSeparator = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      // If within a week, show day name
      if (diffDays < 7) {
        return date.toLocaleDateString('en-US', { weekday: 'long' });
      }
      
      // Otherwise show full date (MM/DD/YYYY)
      return date.toLocaleDateString('en-US', { 
        month: '2-digit', 
        day: '2-digit', 
        year: 'numeric' 
      });
    } catch {
      return '';
    }
  };

  // Check if two dates are on the same day
  const isSameDay = (date1?: string, date2?: string) => {
    if (!date1 || !date2) return false;
    try {
      const d1 = new Date(date1);
      const d2 = new Date(date2);
      return (
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate()
      );
    } catch {
      return false;
    }
  };

  // Truncate message preview
  const truncateMessage = (text: string, maxLength: number = 50) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] bg-[#f0f2f5] overflow-hidden">
      {/* Mobile: Show back button when conversation is selected */}
      {isMobile && selectedSessionId && (
        <div className="flex items-center gap-3 p-3 bg-[#008069] flex-shrink-0">
          <button
            onClick={() => setSelectedSessionId(null)}
            className="p-2 hover:bg-[#006b57] rounded-lg text-white"
            aria-label="Back to conversations"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h2 className="font-semibold text-white">
              {selectedConversation?.customerName || 'Unknown'}
            </h2>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Left Column: Conversation List */}
        {(!isMobile || !selectedSessionId) && (
          <div className="w-full lg:w-[30%] bg-white flex flex-col min-h-0 border-r border-gray-300">
            {/* Search Bar */}
            <div className="px-3 py-2 bg-white border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  type="text"
                  placeholder="Search or start new chat"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-[#f0f2f5] border-0 rounded-lg h-9 text-sm"
                />
              </div>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto bg-white">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading conversations...</div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  {searchQuery ? 'No conversations found' : 'No WhatsApp conversations yet'}
                </div>
              ) : (
                <div>
                  {filteredConversations.map((conv) => {
                    const isSelected = conv.sessionId === selectedSessionId;
                    return (
                      <button
                        key={conv.sessionId}
                        onClick={() => setSelectedSessionId(conv.sessionId)}
                        className={`
                          w-full text-left px-4 py-3 hover:bg-[#f5f6f6] transition-colors border-b border-[#e9edef]
                          ${isSelected ? 'bg-[#f0f2f5]' : 'bg-white'}
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-medium text-gray-900 truncate text-[17px]">
                                {conv.customerName}
                              </h3>
                              {conv.lastMessageAt && (
                                <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                                  {formatMessageTime(conv.lastMessageAt)}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm text-gray-600 truncate flex-1">
                                {truncateMessage(conv.lastMessageContent, 40)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Right Column: Chat View */}
        {(!isMobile || selectedSessionId) && (
          <div className="flex-1 flex flex-col bg-[#efeae2] min-h-0 relative">
            {/* WhatsApp pattern background */}
            <div 
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                backgroundSize: '60px 60px'
              }}
            />
            
            {!selectedSessionId ? (
              <div className="flex-1 flex items-center justify-center relative z-10">
                <div className="text-center text-gray-500">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">Select a conversation</p>
                  <p className="text-sm mt-2">Choose a conversation from the list to view messages</p>
                </div>
              </div>
            ) : (
              <>
                {/* Chat Header */}
                <div className="bg-[#008069] px-4 py-3 flex items-center justify-between flex-shrink-0 relative z-10">
                  <div className="flex items-center gap-3 flex-1">
                    {isMobile && (
                      <button
                        onClick={() => {
                          setSelectedSessionId(null);
                          setIsSearchingMessages(false);
                          setMessageSearchQuery('');
                        }}
                        className="p-2 hover:bg-[#006b57] rounded-full text-white flex-shrink-0"
                        aria-label="Back to conversations"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                    )}
                    {isSearchingMessages ? (
                      <div className="flex-1 flex items-center gap-2">
                        <button
                          onClick={() => {
                            setIsSearchingMessages(false);
                            setMessageSearchQuery('');
                          }}
                          className="p-1 hover:bg-[#006b57] rounded-full text-white flex-shrink-0"
                          aria-label="Close search"
                        >
                          <ArrowLeft className="w-5 h-5" />
                        </button>
                        <Input
                          type="text"
                          placeholder="Search messages..."
                          value={messageSearchQuery}
                          onChange={(e) => setMessageSearchQuery(e.target.value)}
                          className="flex-1 bg-transparent text-white placeholder:text-white/80 h-9 text-sm px-4 rounded-lg border border-white/50 focus:ring-2 focus:ring-white focus:border-white focus:outline-none focus-visible:ring-white focus-visible:border-white focus-visible:ring-offset-0 [&:focus-visible]:border-white [&:focus-visible]:ring-white"
                          autoFocus
                        />
                      </div>
                    ) : (
                      <div className="w-full">
                        <div className="max-w-4xl mx-auto px-4">
                          <h2 className="font-bold text-white text-2xl">
                            {selectedConversation?.customerName || 'Unknown'}
                          </h2>
                        </div>
                      </div>
                    )}
                  </div>
                  {!isSearchingMessages && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => setIsSearchingMessages(true)}
                        className="p-2 hover:bg-[#006b57] rounded-full text-white"
                        aria-label="Search messages"
                      >
                        <SearchIcon className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto px-4 py-2 relative z-10">
                  {loadingMessages ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-gray-500">Loading messages...</div>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center text-gray-500">
                        <p>No messages in this conversation yet</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1 max-w-4xl mx-auto">
                      {messageSearchQuery.trim() && searchMatches.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <p>No messages found matching "{messageSearchQuery}"</p>
                        </div>
                      )}
                      {messageSearchQuery.trim() && searchMatches.length > 0 && (
                        <div className="sticky top-0 bg-[#008069] text-white px-4 py-2 text-sm flex items-center justify-between z-20 mb-2 rounded-b-lg">
                          <span>
                            {currentMatchIndex + 1} of {searchMatches.length}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                if (currentMatchIndex > 0) {
                                  setCurrentMatchIndex(currentMatchIndex - 1);
                                } else {
                                  setCurrentMatchIndex(searchMatches.length - 1);
                                }
                              }}
                              className="p-1 hover:bg-[#006b57] rounded"
                              aria-label="Previous match"
                            >
                              <ArrowLeft className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (currentMatchIndex < searchMatches.length - 1) {
                                  setCurrentMatchIndex(currentMatchIndex + 1);
                                } else {
                                  setCurrentMatchIndex(0);
                                }
                              }}
                              className="p-1 hover:bg-[#006b57] rounded"
                              aria-label="Next match"
                            >
                              <ArrowLeft className="w-4 h-4 rotate-180" />
                            </button>
                            <button
                              onClick={() => {
                                setIsSearchingMessages(false);
                                setMessageSearchQuery('');
                              }}
                              className="p-1 hover:bg-[#006b57] rounded"
                              aria-label="Close search"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                      {messages.map((message, messageIndex) => {
                        const isHuman = message.senderType === 'human';
                        const isMatch = messageSearchQuery.trim()
                          ? message.content.toLowerCase().includes(messageSearchQuery.toLowerCase())
                          : false;
                        const matchIndex = isMatch
                          ? searchMatches.findIndex((m) => m.message.id === message.id)
                          : -1;
                        const isCurrentMatch = matchIndex === currentMatchIndex;

                        // Check if we need to show a date separator
                        const prevMessage = messageIndex > 0 ? messages[messageIndex - 1] : null;
                        const showDateSeparator = !prevMessage || !isSameDay(message.createdAt, prevMessage.createdAt);
                        
                        // Check if message type changed (incoming vs outgoing)
                        const prevIsHuman = prevMessage?.senderType === 'human';
                        const messageTypeChanged = prevMessage && prevIsHuman !== isHuman;

                        return (
                          <div key={`${message.id}-${message.idx}`}>
                            {/* Date Separator */}
                            {showDateSeparator && message.createdAt && (
                              <div className="flex justify-center my-4">
                                <div className="bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full text-xs text-gray-600 font-medium">
                                  {formatDateSeparator(message.createdAt)}
                                </div>
                              </div>
                            )}
                            
                            <div
                              ref={(el) => {
                                if (el && isMatch) {
                                  searchMatchRefs.current.set(message.id, el);
                                } else {
                                  searchMatchRefs.current.delete(message.id);
                                }
                              }}
                              className={`flex ${isHuman ? 'justify-start' : 'justify-end'} ${messageTypeChanged ? 'mt-3' : 'mt-1'} mb-1 ${
                                isCurrentMatch ? 'ring-2 ring-[#008069] ring-offset-2 rounded-lg' : ''
                              }`}
                            >
                            <div
                              className={`
                                max-w-[65%] rounded-lg px-2 py-1 shadow-sm
                                ${
                                  isHuman
                                    ? 'bg-white text-gray-900 rounded-tl-none'
                                    : 'bg-[#d9fdd3] text-gray-900 rounded-tr-none'
                                }
                                ${isCurrentMatch ? 'ring-2 ring-[#008069]' : ''}
                              `}
                            >
                              <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                                {messageSearchQuery.trim() && isMatch ? (
                                  <HighlightText text={message.content} searchTerm={messageSearchQuery} />
                                ) : (
                                  message.content
                                )}
                              </div>
                              {message.createdAt && (
                                <div className="flex items-center justify-end gap-1 mt-1">
                                  <span className={`text-[11px] ${
                                    isHuman ? 'text-gray-500' : 'text-gray-600'
                                  }`}>
                                    {formatMessageTime(message.createdAt)}
                                  </span>
                                </div>
                              )}
                            </div>
                            </div>
                          </div>
                        );
                      })}
                      {/* Invisible element to scroll to */}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

