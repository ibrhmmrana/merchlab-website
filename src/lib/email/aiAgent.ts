import { processMessage, type AIResponse } from '../whatsapp/aiAgent';
import { ParsedEmail } from './parser';

/**
 * Email-specific system prompt
 * Adapted from WhatsApp prompt for email context
 */
const EMAIL_SYSTEM_PROMPT_ADDITION = `
IMPORTANT EMAIL-SPECIFIC GUIDELINES:
- Format responses as professional business emails
- Include proper greetings (e.g., "Dear [Customer Name]," or "Hello,")
- Include proper closings (e.g., "Best regards," "Sincerely,")
- Use email formatting: paragraphs, lists, and proper structure
- Email responses should be professional and detailed (not brief like WhatsApp)
- Maintain a friendly but professional tone
- Sign off with "MerchLab AI Assistant" or similar
`;

/**
 * Process an email with the AI agent
 * Reuses the WhatsApp processMessage function but adapted for email context
 */
export async function processEmail(
  email: ParsedEmail
): Promise<AIResponse & { emailMetadata?: { threadId: string; messageId: string; subject: string } }> {
  try {
    // Create session ID from email address
    const sessionId = `ML-EMAIL-${email.senderEmail}`;

    // Combine subject and body for context
    // Include subject in the message as it often contains important information
    const emailContent = email.subject 
      ? `Subject: ${email.subject}\n\n${email.body}`
      : email.body;

    // Process with existing WhatsApp AI agent
    // The processMessage function will handle all the tools and logic
    const aiResponse = await processMessage(
      sessionId,
      emailContent,
      undefined, // phone number - not available from email
      email.senderName, // customer name from email
      email.senderEmail // customer email for lookups
    );

    // Add email metadata to response
    return {
      ...aiResponse,
      emailMetadata: {
        threadId: email.threadId,
        messageId: email.messageId,
        subject: email.subject,
      },
    };
  } catch (error) {
    console.error('Error processing email with AI agent:', error);
    throw error;
  }
}

