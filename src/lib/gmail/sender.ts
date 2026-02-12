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
 * Includes conversation context and customer information
 */
export interface EscalationContext {
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  conversationSummary?: string;
  reason: string; // e.g., "Customer requested to speak with human", "Complex issue requiring human assistance"
  whatsappSessionId?: string;
}

/** Default escalation recipient when STAFF_EMAIL is not set */
const DEFAULT_ESCALATION_EMAIL = 'anita@merchlab.io';

export async function sendEscalationEmail(context: EscalationContext): Promise<void> {
  const staffEmail = process.env.STAFF_EMAIL ?? DEFAULT_ESCALATION_EMAIL;

  // Parse staff emails (support comma-separated list)
  const staffEmails = staffEmail.split(',').map(email => email.trim()).filter(email => email.length > 0);

  if (staffEmails.length === 0) {
    throw new Error('No valid staff email addresses in STAFF_EMAIL (or default)');
  }

  // Build email subject
  const subject = `[WhatsApp AI Escalation] ${context.reason}`;

  // Build email body
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

  // Send email to all staff members
  await sendGmailEmail(staffEmails, subject, body, true);
  console.log(`Escalation email sent to ${staffEmails.length} staff member(s)`);
}

