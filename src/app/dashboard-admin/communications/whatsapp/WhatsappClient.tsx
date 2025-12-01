'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Search, MessageSquare, Search as SearchIcon, X, User, Send } from 'lucide-react';
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

// Function to parse quote message and extract quote number and URL
function parseQuoteMessage(content: string): { isQuoteMessage: boolean; quoteNumber?: string; quoteUrl?: string; restOfMessage?: string } {
  // Pattern to match both URL formats:
  // 1. https://fxsqdpmmddcidjwzxtpc.supabase.co/storage/v1/object/public/audit-reports/[QUOTE NUMBER].pdf
  // 2. https://fxsqdpmmddcidjwzxtpc.supabase.co/storage/v1/object/audit-reports/[QUOTE NUMBER].pdf
  const quoteUrlPatterns = [
    /https:\/\/fxsqdpmmddcidjwzxtpc\.supabase\.co\/storage\/v1\/object\/public\/audit-reports\/([A-Z0-9-]+)\.pdf/i,
    /https:\/\/fxsqdpmmddcidjwzxtpc\.supabase\.co\/storage\/v1\/object\/audit-reports\/([A-Z0-9-]+)\.pdf/i,
  ];
  
  let match: RegExpMatchArray | null = null;
  let quoteUrl = '';
  let quoteNumber = '';
  
  // Try to match either URL pattern
  for (const pattern of quoteUrlPatterns) {
    match = content.match(pattern);
    if (match) {
      quoteUrl = match[0];
      quoteNumber = match[1];
      break;
    }
  }
  
  if (!match) {
    return { isQuoteMessage: false };
  }
  
  // Check if the message follows the expected pattern
  // The URL can appear anywhere in the message
  const urlIndex = content.indexOf(quoteUrl);
  if (urlIndex === -1) {
    return { isQuoteMessage: false };
  }
  
  // Extract the rest of the message after the URL
  const restOfMessage = content.substring(urlIndex + quoteUrl.length).trim();
  
  // Check the entire message content for quote message indicators
  // If it contains a quote URL and mentions MerchLab, it's likely a quote message
  const fullContentLower = content.toLowerCase();
  const hasMerchLab = fullContentLower.includes('merchlab');
  
  // Accept if it has MerchLab (most quote messages from MerchLab will have this)
  // This is a quote message if it contains the quote URL pattern
  if (!hasMerchLab) {
    return { isQuoteMessage: false };
  }
  
  // If URL is at the start, use restOfMessage. Otherwise, reconstruct the message without the URL
  let displayMessage = restOfMessage;
  if (urlIndex > 0) {
    // URL is in the middle or end, reconstruct message by removing URL
    const beforeUrl = content.substring(0, urlIndex).trim();
    const afterUrl = content.substring(urlIndex + quoteUrl.length).trim();
    displayMessage = (beforeUrl + '\n' + afterUrl).trim();
  }
  
  return {
    isQuoteMessage: true,
    quoteNumber,
    quoteUrl,
    restOfMessage: displayMessage,
  };
}

// Component to render quote message with clickable quote number
function QuoteMessageContent({ content, searchTerm }: { content: string; searchTerm: string }) {
  const quoteInfo = parseQuoteMessage(content);
  
  if (!quoteInfo.isQuoteMessage || !quoteInfo.quoteNumber || !quoteInfo.quoteUrl || !quoteInfo.restOfMessage) {
    // Not a quote message, render normally
    if (searchTerm.trim()) {
      return <HighlightText text={content} searchTerm={searchTerm} />;
    }
    return <>{content}</>;
  }
  
  // Render quote message with clickable link
  // Split the rest of message by lines to preserve formatting
  const messageLines = quoteInfo.restOfMessage.split('\n');
  const displayLines = [`${quoteInfo.quoteNumber}.pdf`, '', ...messageLines];
  
  if (searchTerm.trim()) {
    // If searching, we need to handle highlighting with the link
    return (
      <>
        {displayLines.map((line, lineIndex) => {
          if (lineIndex === 0 && line === `${quoteInfo.quoteNumber}.pdf`) {
            // First line is the quote number - make it a link
            return (
              <span key={lineIndex}>
                <a
                  href={quoteInfo.quoteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline font-medium"
                  onClick={(e) => e.stopPropagation()}
                >
                  {quoteInfo.quoteNumber}.pdf
                </a>
                {lineIndex < displayLines.length - 1 && <br />}
              </span>
            );
          }
          
          // For other lines, check if they contain the search term
          if (line.toLowerCase().includes(searchTerm.toLowerCase())) {
            const parts = line.split(new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
            return (
              <span key={lineIndex}>
                {parts.map((part, partIndex) =>
                  part.toLowerCase() === searchTerm.toLowerCase() ? (
                    <mark key={partIndex} className="bg-yellow-300 text-gray-900 px-0.5 rounded">
                      {part}
                    </mark>
                  ) : (
                    <span key={partIndex}>{part}</span>
                  )
                )}
                {lineIndex < displayLines.length - 1 && <br />}
              </span>
            );
          }
          
          return (
            <span key={lineIndex}>
              {line}
              {lineIndex < displayLines.length - 1 && <br />}
            </span>
          );
        })}
      </>
    );
  }
  
  // Not searching, render normally with link
  return (
    <>
      {displayLines.map((line, index) => {
        if (index === 0 && line === `${quoteInfo.quoteNumber}.pdf`) {
          return (
            <span key={index}>
              <a
                href={quoteInfo.quoteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline font-medium"
                onClick={(e) => e.stopPropagation()}
              >
                {quoteInfo.quoteNumber}.pdf
              </a>
              {index < displayLines.length - 1 && <br />}
            </span>
          );
        }
        return (
          <span key={index}>
            {line}
            {index < displayLines.length - 1 && <br />}
          </span>
        );
      })}
    </>
  );
}
import { supabase } from '@/lib/supabase/browser';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { WhatsappConversationSummary, WhatsappMessage, N8nChatHistoryRow } from '@/lib/chatHistories';
import CustomerActivityPanel from './CustomerActivity';

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
  const [isActivityPanelOpen, setIsActivityPanelOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [isHumanInControl, setIsHumanInControl] = useState(false);
  const [takingOver, setTakingOver] = useState(false);
  const [handingOver, setHandingOver] = useState(false);
  const subscriptionRef = useRef<RealtimeChannel | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchMatchRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const [viewedMessageIds, setViewedMessageIds] = useState<Set<number>>(new Set());
  const [conversationsWithUnread, setConversationsWithUnread] = useState<Set<string>>(new Set());
  const viewedMessageIdsRef = useRef<Set<number>>(new Set());

  // Load viewed message IDs from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('whatsapp-viewed-messages');
      if (stored) {
        const ids = JSON.parse(stored) as number[];
        const idsSet = new Set(ids);
        setViewedMessageIds(idsSet);
        viewedMessageIdsRef.current = idsSet; // Initialize ref
      }
    } catch (error) {
      console.error('Error loading viewed messages from localStorage:', error);
    }
  }, []);

  // Save viewed message IDs to localStorage whenever they change
  useEffect(() => {
    try {
      const idsArray = Array.from(viewedMessageIds);
      localStorage.setItem('whatsapp-viewed-messages', JSON.stringify(idsArray));
      viewedMessageIdsRef.current = viewedMessageIds; // Keep ref in sync
    } catch (error) {
      console.error('Error saving viewed messages to localStorage:', error);
    }
  }, [viewedMessageIds]);

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

  // Check for unread customer messages when conversations are first loaded
  useEffect(() => {
    if (conversations.length === 0) {
      return;
    }

    async function checkUnreadMessages() {
      const unreadConversations = new Set<string>();
      const currentViewedIds = viewedMessageIdsRef.current; // Use ref to get latest value
      
      await Promise.all(
        conversations.map(async (conv: WhatsappConversationSummary) => {
          try {
            const encodedSessionId = encodeURIComponent(conv.sessionId);
            const messagesResponse = await fetch(`/api/admin/whatsapp/conversations/${encodedSessionId}`);
            if (messagesResponse.ok) {
              const messagesData = await messagesResponse.json();
              const conversationMessages = messagesData.messages || [];
              
              // Check if there are any unread customer messages
              const hasUnreadCustomerMessage = conversationMessages.some(
                (msg: WhatsappMessage) => 
                  msg.senderType === 'human' && !currentViewedIds.has(msg.id)
              );
              
              if (hasUnreadCustomerMessage) {
                unreadConversations.add(conv.sessionId);
              }
            }
          } catch (error) {
            console.error(`Error checking unread messages for conversation ${conv.sessionId}:`, error);
          }
        })
      );
      
      setConversationsWithUnread(unreadConversations);
    }

    // Only check when conversations are loaded, not on every viewedMessageIds change
    // We'll update unread status when messages are marked as viewed or new messages arrive
    const timeoutId = setTimeout(() => {
      checkUnreadMessages();
    }, 500); // Small delay to avoid checking too frequently

    return () => clearTimeout(timeoutId);
  }, [conversations]); // Only depend on conversations, not viewedMessageIds

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
        const fetchedMessages = data.messages || [];
        setMessages(fetchedMessages);
        
        // Mark all customer messages in this conversation as viewed
        const customerMessageIds = fetchedMessages
          .filter((msg: WhatsappMessage) => msg.senderType === 'human')
          .map((msg: WhatsappMessage) => msg.id);
        
        if (customerMessageIds.length > 0) {
          setViewedMessageIds((prev) => {
            const updated = new Set(prev);
            customerMessageIds.forEach((id: number) => updated.add(id));
            return updated;
          });
          
          // Remove this conversation from unread list
          setConversationsWithUnread((prev) => {
            const updated = new Set(prev);
            updated.delete(selectedSessionId);
            return updated;
          });
        }
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
              
              // If it's a customer message and conversation is open, mark it as viewed
              if (newMessage.senderType === 'human') {
                setViewedMessageIds((prev) => {
                  const updated = new Set(prev);
                  updated.add(newMessage.id);
                  return updated;
                });
              }
              
              // Auto-scroll to bottom after a short delay to allow DOM update
              setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
              }, 100);
              
              return updated;
            });
          } else {
            // If it's a customer message from another conversation, mark conversation as unread
            if (newMessage.senderType === 'human' && !viewedMessageIds.has(newMessage.id)) {
              setConversationsWithUnread((prev) => {
                const updated = new Set(prev);
                updated.add(sessionId);
                return updated;
              });
            }
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

  // Load and manage human control state from localStorage
  useEffect(() => {
    if (selectedSessionId) {
      // Check localStorage for this session
      const storedState = localStorage.getItem(`human-control-${selectedSessionId}`);
      setIsHumanInControl(storedState === 'true');
    } else {
      setIsHumanInControl(false);
    }
  }, [selectedSessionId]);

  // Save human control state to localStorage whenever it changes
  useEffect(() => {
    if (selectedSessionId) {
      if (isHumanInControl) {
        localStorage.setItem(`human-control-${selectedSessionId}`, 'true');
      } else {
        localStorage.removeItem(`human-control-${selectedSessionId}`);
      }
    }
  }, [isHumanInControl, selectedSessionId]);

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
      
      // Get date parts for comparison (ignore time)
      const dateYear = date.getFullYear();
      const dateMonth = date.getMonth();
      const dateDay = date.getDate();
      
      const nowYear = now.getFullYear();
      const nowMonth = now.getMonth();
      const nowDay = now.getDate();
      
      // Check if it's today
      if (dateYear === nowYear && dateMonth === nowMonth && dateDay === nowDay) {
        return 'Today';
      }
      
      // Check if it's yesterday
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      if (dateYear === yesterday.getFullYear() && 
          dateMonth === yesterday.getMonth() && 
          dateDay === yesterday.getDate()) {
        return 'Yesterday';
      }
      
      // Calculate days difference for remaining logic
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      // If within a week (but not today or yesterday), show day name
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

  // Format phone number to 27123456789 format
  const formatPhoneNumber = (phoneNumber: string): string => {
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // If it doesn't start with 27, add it
    if (!cleaned.startsWith('27')) {
      // If it starts with 0, replace with 27
      if (cleaned.startsWith('0')) {
        cleaned = '27' + cleaned.substring(1);
      } else {
        cleaned = '27' + cleaned;
      }
    }
    
    return cleaned;
  };

  // Extract first name from full name
  const getFirstName = (fullName: string): string => {
    return fullName.split(' ')[0] || fullName;
  };

  // Handle taking over from AI
  const handleTakeOver = async () => {
    if (!selectedConversation || takingOver) {
      return;
    }

    setTakingOver(true);

    try {
      const phoneNumber = formatPhoneNumber(selectedConversation.customerNumber);
      
      const response = await fetch('https://ai.intakt.co.za/webhook/human-in-loop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          {
            number: phoneNumber,
            status: 'Human',
          },
        ]),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error taking over:', errorText);
        alert(`Failed to take over: ${errorText || 'Unknown error'}`);
        return;
      }

      // Successfully took over
      setIsHumanInControl(true);
    } catch (error) {
      console.error('Error taking over:', error);
      alert('Failed to take over. Please try again.');
    } finally {
      setTakingOver(false);
    }
  };

  // Handle handing over back to AI
  const handleHandoverToAI = async () => {
    if (!selectedConversation || handingOver) {
      return;
    }

    setHandingOver(true);

    try {
      const phoneNumber = formatPhoneNumber(selectedConversation.customerNumber);
      
      const response = await fetch('https://ai.intakt.co.za/webhook/human-in-loop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          {
            number: phoneNumber,
            status: 'AI',
          },
        ]),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error handing over to AI:', errorText);
        alert(`Failed to handover to AI: ${errorText || 'Unknown error'}`);
        return;
      }

      // Successfully handed over to AI
      setIsHumanInControl(false);
      setMessageInput(''); // Clear any message in the input
    } catch (error) {
      console.error('Error handing over to AI:', error);
      alert('Failed to handover to AI. Please try again.');
    } finally {
      setHandingOver(false);
    }
  };

  // Handle sending a message
  const handleSendMessage = async () => {
    if (!selectedSessionId || !selectedConversation || !messageInput.trim() || sendingMessage || !isHumanInControl) {
      return;
    }

    const messageText = messageInput.trim();
    setSendingMessage(true);

    try {
      // Format phone number and extract first name
      const phoneNumber = formatPhoneNumber(selectedConversation.customerNumber);
      const firstName = getFirstName(selectedConversation.customerName);

      // Send directly to webhook
      const response = await fetch('https://ai.intakt.co.za/webhook/human-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          {
            number: phoneNumber,
            message: messageText,
            name: firstName,
          },
        ]),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error sending message:', errorText);
        alert(`Failed to send message: ${errorText || 'Unknown error'}`);
        return;
      }

      // Clear input
      setMessageInput('');
      
      // Message will appear automatically via realtime subscription when it's added to Supabase
      // No need to add it manually to avoid duplicates
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] bg-[#f0f2f5] overflow-hidden">
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Left Column: Conversation List */}
        {(!isMobile || !selectedSessionId) && (
          <div className="w-full lg:w-[25%] bg-white flex flex-col min-h-0 border-r border-gray-300">
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
                    const hasUnread = conversationsWithUnread.has(conv.sessionId);
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
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <h3 className="font-medium text-gray-900 truncate text-[17px]">
                                  {conv.customerName}
                                </h3>
                                {hasUnread && (
                                  <span className="flex-shrink-0 w-4 h-4 bg-red-600 rounded-full border-2 border-white shadow-md ring-2 ring-red-200" />
                                )}
                              </div>
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
          <div className="flex-1 flex flex-row bg-[#efeae2] min-h-0 relative">
            {/* Chat Messages Area */}
            <div className="flex-1 flex flex-col min-h-0 relative">
            {/* WhatsApp pattern background - only on messages area, not input bar */}
            <div 
              className="absolute top-0 left-0 right-0 opacity-[0.03] pointer-events-none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                backgroundSize: '60px 60px',
                bottom: '80px' // Stop before the input bar area
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
                          placeholder="Search messages&hellip;"
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
                      {isMobile && selectedSessionId && selectedConversation && (
                        <button
                          onClick={() => setIsActivityPanelOpen(true)}
                          className="p-2 hover:bg-[#006b57] rounded-full text-white"
                          aria-label="View customer activity"
                        >
                          <User className="w-5 h-5" />
                        </button>
                      )}
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

                {/* Chat Content Area - Messages and Input */}
                <div className="flex-1 flex flex-col overflow-hidden">
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
                          <p>No messages found matching &quot;{messageSearchQuery}&quot;</p>
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
                                <QuoteMessageContent content={message.content} searchTerm={messageSearchQuery.trim()} />
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
                  
                  {/* Message Input Bar - Only show when a conversation is selected */}
                  {selectedSessionId && selectedConversation && (
                    <div className="bg-white border-t border-gray-200 px-4 py-3 flex-shrink-0 relative z-10" style={{ backgroundColor: 'white', position: 'relative' }}>
                      <div className="max-w-4xl mx-auto">
                        {!isHumanInControl ? (
                          <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 border border-gray-300 relative z-50">
                            <div className="flex-1 flex items-center gap-2">
                              <span className="text-sm text-gray-600 font-medium">AI in Control</span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleTakeOver();
                              }}
                              disabled={takingOver}
                              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors relative z-50 ${
                                takingOver
                                  ? 'bg-gray-400 text-white cursor-not-allowed'
                                  : 'bg-[#008069] text-white hover:bg-[#006b57] cursor-pointer'
                              }`}
                              style={{ pointerEvents: takingOver ? 'none' : 'auto' }}
                              aria-label="Take over"
                              type="button"
                            >
                              {takingOver ? 'Taking over...' : 'Take over'}
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2" style={{ backgroundColor: 'white' }}>
                            <input
                              ref={messageInputRef}
                              type="text"
                              value={messageInput}
                              onChange={(e) => setMessageInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleSendMessage();
                                }
                              }}
                              placeholder="Type a message..."
                              className="flex-1 outline-none text-sm text-gray-900 placeholder:text-gray-500 border-0"
                              style={{ backgroundColor: 'white', background: 'white' }}
                              disabled={sendingMessage}
                            />
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleHandoverToAI();
                              }}
                              disabled={handingOver || sendingMessage}
                              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors relative z-50 ${
                                handingOver || sendingMessage
                                  ? 'bg-gray-400 text-white cursor-not-allowed'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                              style={{ pointerEvents: (handingOver || sendingMessage) ? 'none' : 'auto' }}
                              aria-label="Handover to AI"
                              type="button"
                            >
                              {handingOver ? 'Handing over...' : 'Handover to AI'}
                            </button>
                            <button
                              onClick={handleSendMessage}
                              disabled={sendingMessage || !messageInput.trim()}
                              className={`p-2 rounded-full transition-colors ${
                                sendingMessage || !messageInput.trim()
                                  ? 'text-gray-400 cursor-not-allowed'
                                  : 'text-[#008069] hover:bg-gray-100'
                              }`}
                              aria-label="Send message"
                            >
                              <Send className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
            </div>
            {/* Customer Activity Panel - Desktop only */}
            {selectedSessionId && selectedConversation && !isMobile && (
              <CustomerActivityPanel phoneNumber={selectedConversation.customerNumber} />
            )}
          </div>
        )}
        
        {/* Mobile Customer Activity Panel Overlay */}
        {isMobile && isActivityPanelOpen && selectedSessionId && selectedConversation && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setIsActivityPanelOpen(false)}
            />
            <div className="fixed right-0 top-0 bottom-0 w-[85%] max-w-sm bg-white z-50 shadow-xl overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between z-10">
                <h2 className="text-lg font-semibold text-gray-900">Customer Activity</h2>
                <button
                  onClick={() => setIsActivityPanelOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <CustomerActivityPanel phoneNumber={selectedConversation.customerNumber} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

