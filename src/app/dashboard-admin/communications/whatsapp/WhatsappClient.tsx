'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Search, MessageSquare } from 'lucide-react';
import { Input } from '@/components/ui/input';
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
  const [isMobile, setIsMobile] = useState(false);
  const subscriptionRef = useRef<RealtimeChannel | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
                return JSON.parse(data);
              } catch {
                return {};
              }
            }
            return data;
          };

          // Parse the new message
          const messageData = parseJsonb(newRow.message);
          const customerData = parseJsonb(newRow.customer);
          
          const messageType = messageData.type === 'human' || messageData.type === 'ai' 
            ? messageData.type 
            : 'human';
          const messageContent = messageData.content || '[New message]';
          
          const customerName = customerData.name || customerData.number || 'Unknown';
          const customerNumber = customerData.number || sessionId.replace(/^ML-?\s*/, '');

          // Create new message object
          const newMessage: WhatsappMessage = {
            id: newRow.id,
            idx: newRow.idx ?? newRow.id ?? 0,
            sessionId: sessionId,
            senderType: messageType,
            content: messageContent,
            customerName,
            customerNumber,
            createdAt: newRow.created_at,
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

  // Format timestamp
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

  // Truncate message preview
  const truncateMessage = (text: string, maxLength: number = 50) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] bg-gray-50">
      {/* Mobile: Show back button when conversation is selected */}
      {isMobile && selectedSessionId && (
        <div className="flex items-center gap-3 p-4 bg-white border-b border-gray-200 flex-shrink-0">
          <button
            onClick={() => setSelectedSessionId(null)}
            className="p-2 hover:bg-gray-100 rounded-lg"
            aria-label="Back to conversations"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="font-semibold text-gray-900">
              {selectedConversation?.customerName || 'Unknown'}
            </h2>
            <p className="text-sm text-gray-500">{selectedConversation?.customerNumber}</p>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Left Column: Conversation List */}
        {(!isMobile || !selectedSessionId) && (
          <div className="w-full lg:w-[35%] bg-white border-r border-gray-200 flex flex-col min-h-0">
            {/* Search Bar */}
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading conversations...</div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  {searchQuery ? 'No conversations found' : 'No WhatsApp conversations yet'}
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredConversations.map((conv) => {
                    const isSelected = conv.sessionId === selectedSessionId;
                    return (
                      <button
                        key={conv.sessionId}
                        onClick={() => setSelectedSessionId(conv.sessionId)}
                        className={`
                          w-full text-left p-4 hover:bg-gray-50 transition-colors
                          ${isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''}
                        `}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate">
                              {conv.customerName}
                            </h3>
                            <p className="text-sm text-gray-500 truncate">{conv.customerNumber}</p>
                            <p className="text-sm text-gray-600 mt-1 truncate">
                              {truncateMessage(conv.lastMessageContent)}
                            </p>
                          </div>
                          {conv.lastMessageAt && (
                            <span className="text-xs text-gray-400 whitespace-nowrap">
                              {formatTime(conv.lastMessageAt)}
                            </span>
                          )}
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
          <div className="flex-1 flex flex-col bg-gray-50 min-h-0">
            {!selectedSessionId ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">Select a conversation</p>
                  <p className="text-sm mt-2">Choose a conversation from the list to view messages</p>
                </div>
              </div>
            ) : (
              <>
                {/* Desktop Header */}
                {!isMobile && (
                  <div className="bg-white border-b border-gray-200 p-4 flex-shrink-0">
                    <h2 className="font-semibold text-gray-900">
                      {selectedConversation?.customerName || 'Unknown'}
                    </h2>
                    <p className="text-sm text-gray-500">{selectedConversation?.customerNumber}</p>
                  </div>
                )}

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4">
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
                    <div className="space-y-4 max-w-4xl mx-auto">
                      {messages.map((message) => {
                        const isHuman = message.senderType === 'human';
                        return (
                          <div
                            key={`${message.id}-${message.idx}`}
                            className={`flex ${isHuman ? 'justify-start' : 'justify-end'}`}
                          >
                            <div
                              className={`
                                max-w-[70%] rounded-lg px-4 py-2 shadow-sm
                                ${
                                  isHuman
                                    ? 'bg-gray-100 text-gray-900'
                                    : 'bg-blue-500 text-white'
                                }
                              `}
                            >
                              <div className="text-sm whitespace-pre-wrap break-words">
                                {message.content}
                              </div>
                              {message.createdAt && (
                                <div
                                  className={`text-xs mt-1 ${
                                    isHuman ? 'text-gray-500' : 'text-blue-100'
                                  }`}
                                >
                                  {formatTime(message.createdAt)}
                                </div>
                              )}
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

