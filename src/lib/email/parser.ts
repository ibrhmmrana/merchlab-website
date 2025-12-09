import { google } from 'googleapis';
import { getGmailAuth } from '../gmail/auth';

/**
 * Parsed email data structure
 */
export interface ParsedEmail {
  messageId: string;
  threadId: string;
  subject: string;
  body: string;
  bodyHtml?: string;
  senderEmail: string;
  senderName?: string;
  recipients: {
    to: string[];
    cc: string[];
    bcc: string[];
  };
  date: Date;
  isReply: boolean;
}

/**
 * Parse a Gmail message into structured email data
 */
export async function parseGmailMessage(messageId: string): Promise<ParsedEmail | null> {
  try {
    const auth = await getGmailAuth();
    const gmail = google.gmail({ version: 'v1', auth });

    // Get full message
    const message = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });

    if (!message.data) {
      return null;
    }

    const payload = message.data.payload;
    if (!payload || !payload.headers) {
      return null;
    }

    // Extract headers
    const getHeader = (name: string): string => {
      const header = payload.headers?.find(h => h.name?.toLowerCase() === name.toLowerCase());
      return header?.value || '';
    };

    const subject = getHeader('Subject');
    const from = getHeader('From');
    const to = getHeader('To');
    const cc = getHeader('Cc');
    const bcc = getHeader('Bcc');
    const date = getHeader('Date');
    const inReplyTo = getHeader('In-Reply-To');
    const references = getHeader('References');

    // Parse sender
    const senderMatch = from.match(/^(.+?)\s*<(.+?)>$/) || from.match(/^(.+)$/);
    const senderName = senderMatch && senderMatch[1] ? senderMatch[1].replace(/^["']|["']$/g, '') : undefined;
    const senderEmail = senderMatch && senderMatch[2] ? senderMatch[2] : from;

    // Parse recipients
    const parseRecipients = (header: string): string[] => {
      if (!header) return [];
      return header.split(',').map(r => {
        const match = r.match(/<(.+?)>/) || r.match(/^(.+)$/);
        return match ? match[1].trim() : r.trim();
      }).filter(Boolean);
    };

    // Extract body
    let body = '';
    let bodyHtml = '';

    // Type for Gmail message part
    interface GmailMessagePart {
      body?: {
        data?: string;
      };
      mimeType?: string;
      parts?: GmailMessagePart[];
    }

    const extractBody = (part: GmailMessagePart): void => {
      if (part.body?.data) {
        const text = Buffer.from(part.body.data, 'base64').toString('utf-8');
        if (part.mimeType === 'text/plain') {
          body = text;
        } else if (part.mimeType === 'text/html') {
          bodyHtml = text;
        }
      }

      if (part.parts) {
        for (const subPart of part.parts) {
          extractBody(subPart);
        }
      }
    };

    extractBody(payload as GmailMessagePart);

    // Strip HTML tags for plain text version (for AI processing)
    const plainTextBody = bodyHtml
      ? bodyHtml.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim()
      : body;

    return {
      messageId: messageId,
      threadId: message.data.threadId || '',
      subject: subject,
      body: plainTextBody,
      bodyHtml: bodyHtml || undefined,
      senderEmail: senderEmail.toLowerCase(),
      senderName: senderName,
      recipients: {
        to: parseRecipients(to),
        cc: parseRecipients(cc),
        bcc: parseRecipients(bcc),
      },
      date: date ? new Date(date) : new Date(),
      isReply: !!(inReplyTo || references),
    };
  } catch (error) {
    console.error('Error parsing Gmail message:', error);
    return null;
  }
}

