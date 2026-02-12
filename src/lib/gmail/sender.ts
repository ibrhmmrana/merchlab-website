import { google } from 'googleapis';
import { getGmailAuth } from './auth';

/**
 * Send an email via Gmail API
 */
export async function sendGmailEmail(
  to: string | string[],
  subject: string,
  body: string,
  isHtml: boolean = false
): Promise<void> {
  const userEmail = process.env.GMAIL_USER_EMAIL;
  
  if (!userEmail) {
    throw new Error('GMAIL_USER_EMAIL environment variable is required');
  }

  // Get authenticated Gmail client
  const auth = await getGmailAuth();
  const gmail = google.gmail({ version: 'v1', auth });

  // Convert to array if single email
  const toArray = Array.isArray(to) ? to : [to];
  const toHeader = toArray.join(', ');

  // Build email message
  const emailLines: string[] = [
    `From: ${userEmail}`,
    `To: ${toHeader}`,
    `Subject: ${subject}`,
    `Content-Type: ${isHtml ? 'text/html' : 'text/plain'}; charset=utf-8`,
    '',
    body,
  ];

  const email = emailLines.join('\n');

  // Encode message in base64url format (RFC 4648)
  const encodedMessage = Buffer.from(email)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  try {
    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });

    console.log('Gmail email sent successfully:', response.data.id);
  } catch (error) {
    console.error('Error sending Gmail email:', error);
    throw new Error(`Failed to send email via Gmail API: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Send escalation email to staff
 * Includes conversation context and customer information.
 * Template differs by channel (WhatsApp vs Email AI).
 */
export interface EscalationContext {
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  conversationSummary?: string;
  reason: string;
  /** WhatsApp session id (e.g. ML-27691234567). Omit when channel is email. */
  whatsappSessionId?: string;
  /** When set, uses the Email AI escalation template instead of WhatsApp. */
  channel?: 'whatsapp' | 'email';
  /** Email thread/conversation (for email channel). */
  emailThreadId?: string;
  /** Original email subject from customer (for email channel). */
  emailSubject?: string;
}

/** Default escalation recipient when STAFF_EMAIL is not set */
const DEFAULT_ESCALATION_EMAIL = 'anita@merchlab.io';

function buildWhatsAppEscalationBody(context: EscalationContext): string {
  let body = `<h2>WhatsApp AI Agent Escalation</h2>`;
  body += `<p><strong>Reason:</strong> ${context.reason}</p>`;
  if (context.customerName) {
    body += `<p><strong>Customer Name (WhatsApp Profile):</strong> ${context.customerName}</p>`;
  }
  if (context.customerPhone) {
    body += `<p><strong>Customer Phone:</strong> ${context.customerPhone}</p>`;
  }
  if (context.customerEmail) {
    body += `<p><strong>Customer Email:</strong> ${context.customerEmail}</p>`;
  }
  if (context.whatsappSessionId) {
    body += `<p><strong>WhatsApp Session ID:</strong> ${context.whatsappSessionId}</p>`;
    body += `<p><strong>View Conversation:</strong> <a href="https://merchlab.io/dashboard-admin/communications/whatsapp?session=${context.whatsappSessionId}">View in Dashboard</a></p>`;
  }
  if (context.conversationSummary) {
    body += `<h3>Conversation Summary:</h3>`;
    body += `<pre style="white-space: pre-wrap; background-color: #f5f5f5; padding: 10px; border-radius: 4px;">${context.conversationSummary}</pre>`;
  }
  body += `<p><strong>Action Required:</strong> Please take over this WhatsApp conversation and assist the customer.</p>`;
  body += `<p>You can view the full conversation history in the <a href="https://merchlab.io/dashboard-admin/communications/whatsapp">WhatsApp Communications Dashboard</a>.</p>`;
  return body;
}

function buildEmailEscalationBody(context: EscalationContext): string {
  let body = `<h2>Email AI Agent Escalation</h2>`;
  body += `<p><strong>Reason:</strong> ${context.reason}</p>`;
  body += `<p>A customer has requested human support via email. Reply to their thread from your inbox (hello@ / info@) to take over.</p>`;
  if (context.customerEmail) {
    body += `<p><strong>Customer Email:</strong> <a href="mailto:${context.customerEmail}">${context.customerEmail}</a></p>`;
  }
  if (context.customerName) {
    body += `<p><strong>Customer Name:</strong> ${context.customerName}</p>`;
  }
  if (context.emailSubject) {
    body += `<p><strong>Email Subject:</strong> ${context.emailSubject}</p>`;
  }
  if (context.emailThreadId) {
    body += `<p><strong>Gmail Thread ID:</strong> ${context.emailThreadId}</p>`;
  }
  if (context.conversationSummary) {
    body += `<h3>Conversation Summary:</h3>`;
    body += `<pre style="white-space: pre-wrap; background-color: #f5f5f5; padding: 10px; border-radius: 4px;">${context.conversationSummary}</pre>`;
  }
  body += `<p><strong>Action Required:</strong> Please reply to the customer's email and assist them. You can review the thread in your Gmail inbox or in the <a href="https://merchlab.io/dashboard-admin/communications/email">Email Communications</a> area.</p>`;
  return body;
}

export async function sendEscalationEmail(context: EscalationContext): Promise<void> {
  const staffEmail = process.env.STAFF_EMAIL ?? DEFAULT_ESCALATION_EMAIL;

  // Parse staff emails (support comma-separated list)
  const staffEmails = staffEmail.split(',').map(email => email.trim()).filter(email => email.length > 0);

  if (staffEmails.length === 0) {
    throw new Error('No valid staff email addresses in STAFF_EMAIL (or default)');
  }

  const isEmailChannel = context.channel === 'email';
  const subject = isEmailChannel
    ? `[Email AI Escalation] ${context.reason}`
    : `[WhatsApp AI Escalation] ${context.reason}`;
  const body = isEmailChannel ? buildEmailEscalationBody(context) : buildWhatsAppEscalationBody(context);

  await sendGmailEmail(staffEmails, subject, body, true);
  console.log(`Escalation email sent to ${staffEmails.length} staff member(s) (${context.channel ?? 'whatsapp'})`);
}

/**
 * Context for a flagged (stuck) order notification
 */
export interface FlaggedOrderContext {
  orderId: string;
  stage: string;
  statusDate: string;
  customerReference?: string;
  orderDate?: string;
}

/**
 * Send a one-off email to staff when an order is flagged (stuck in status > 3 days).
 * Recipients come from STAFF_EMAIL (same as escalation).
 */
export async function sendFlaggedOrderEmail(context: FlaggedOrderContext): Promise<void> {
  const staffEmail = process.env.STAFF_EMAIL ?? DEFAULT_ESCALATION_EMAIL;
  const staffEmails = staffEmail.split(',').map((e) => e.trim()).filter((e) => e.length > 0);
  if (staffEmails.length === 0) {
    throw new Error('No valid staff email addresses in STAFF_EMAIL (or default)');
  }

  const subject = `[MerchLab] Flagged order: ${context.orderId} – stuck in "${context.stage}"`;
  let body = `<h2>Flagged order</h2>`;
  body += `<p>This order has been in the same status for more than 3 days and may need attention.</p>`;
  body += `<p><strong>Order ID:</strong> ${context.orderId}</p>`;
  body += `<p><strong>Current stage:</strong> ${context.stage}</p>`;
  body += `<p><strong>Status since:</strong> ${context.statusDate}</p>`;
  if (context.customerReference) {
    body += `<p><strong>Customer reference:</strong> ${context.customerReference}</p>`;
  }
  if (context.orderDate) {
    body += `<p><strong>Order date:</strong> ${context.orderDate}</p>`;
  }
  body += `<p><a href="https://merchlab.io/dashboard-admin">View in Dashboard</a> – Order Status section shows flagged orders with a caution icon.</p>`;

  await sendGmailEmail(staffEmails, subject, body, true);
  console.log(`Flagged order email sent for ${context.orderId}`);
}

