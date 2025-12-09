import { google } from 'googleapis';
import { getGmailAuth } from '../gmail/auth';
import { AIResponse } from '../whatsapp/aiAgent';
import { ParsedEmail } from './parser';
import { formatEmailResponse } from './formatter';

/**
 * Send email reply via Gmail API
 */
export async function sendEmailReply(
  originalEmail: ParsedEmail,
  aiResponse: AIResponse,
  pdfUrl?: string,
  pdfFilename?: string
): Promise<void> {
  try {
    const auth = await getGmailAuth();
    const gmail = google.gmail({ version: 'v1', auth });
    const userEmail = process.env.GMAIL_USER_EMAIL;

    if (!userEmail) {
      throw new Error('GMAIL_USER_EMAIL environment variable is required');
    }

    // Format email response
    const formatted = formatEmailResponse(
      aiResponse,
      originalEmail.senderName,
      originalEmail.isReply,
      originalEmail.subject
    );

    // Build email headers
    const headers: string[] = [
      `From: ${userEmail}`,
      `To: ${originalEmail.senderEmail}${originalEmail.senderName ? ` <${originalEmail.senderEmail}>` : ''}`,
      `Subject: ${formatted.subject}`,
      `In-Reply-To: ${originalEmail.messageId}`,
      `References: ${originalEmail.messageId}`,
    ];

    // If replying to a thread, include thread ID
    if (originalEmail.threadId) {
      headers.push(`Thread-Id: ${originalEmail.threadId}`);
    }

    // Build email body
    let emailBody = '';
    
    if (pdfUrl && pdfFilename) {
      // If PDF attachment, use multipart email
      const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
      headers.push('MIME-Version: 1.0');
      headers.push('');

      // Email body part
      emailBody += `--${boundary}\r\n`;
      emailBody += `Content-Type: text/html; charset=utf-8\r\n`;
      emailBody += `Content-Transfer-Encoding: quoted-printable\r\n`;
      emailBody += `\r\n`;
      emailBody += `${formatted.htmlBody}\r\n`;
      emailBody += `\r\n`;

      // PDF attachment part
      try {
        const pdfResponse = await fetch(pdfUrl);
        if (!pdfResponse.ok) {
          throw new Error(`Failed to fetch PDF: ${pdfResponse.statusText}`);
        }
        const pdfBuffer = await pdfResponse.arrayBuffer();
        const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');

        emailBody += `--${boundary}\r\n`;
        emailBody += `Content-Type: application/pdf\r\n`;
        emailBody += `Content-Disposition: attachment; filename="${pdfFilename}"\r\n`;
        emailBody += `Content-Transfer-Encoding: base64\r\n`;
        emailBody += `\r\n`;
        emailBody += `${pdfBase64}\r\n`;
        emailBody += `\r\n`;
        emailBody += `--${boundary}--\r\n`;
      } catch (pdfError) {
        console.error('Error attaching PDF, sending email without attachment:', pdfError);
        // Fallback to email without attachment
        headers.pop(); // Remove multipart header
        headers.push('Content-Type: text/html; charset=utf-8');
        emailBody = formatted.htmlBody;
        // Add PDF link in body instead
        emailBody += `<p><a href="${pdfUrl}">Download your PDF here</a></p>`;
      }
    } else {
      // Simple HTML email
      headers.push('Content-Type: text/html; charset=utf-8');
      headers.push('MIME-Version: 1.0');
      headers.push('');
      emailBody = formatted.htmlBody;
    }

    // Combine headers and body
    const email = [...headers, emailBody].join('\r\n');

    // Encode message in base64url format (RFC 4648)
    const encodedMessage = Buffer.from(email)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send email
    const sendRequest: any = {
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    };

    // If replying to a thread, include thread ID
    if (originalEmail.threadId) {
      sendRequest.threadId = originalEmail.threadId;
    }

    const response = await gmail.users.messages.send(sendRequest);

    console.log('Email reply sent successfully:', response.data.id);

    // Mark original email as read
    try {
      await gmail.users.messages.modify({
        userId: 'me',
        id: originalEmail.messageId,
        requestBody: {
          removeLabelIds: ['UNREAD'],
        },
      });
      console.log('Original email marked as read');
    } catch (error) {
      console.error('Error marking email as read:', error);
      // Don't throw - email was sent successfully
    }
  } catch (error) {
    console.error('Error sending email reply:', error);
    throw new Error(`Failed to send email reply: ${error instanceof Error ? error.message : String(error)}`);
  }
}

