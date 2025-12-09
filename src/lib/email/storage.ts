import { saveChatMessage, getChatHistory } from '../whatsapp/memory';
import { ParsedEmail } from './parser';
import { AIResponse } from '../whatsapp/aiAgent';

/**
 * Save email conversation to storage
 * Uses the same Postgres table as WhatsApp
 */
export async function saveEmailMessage(
  email: ParsedEmail,
  aiResponse: AIResponse
): Promise<void> {
  try {
    // Create session ID from email address
    const sessionId = `ML-EMAIL-${email.senderEmail}`;

    // Combine subject and body for the human message
    const emailContent = email.subject 
      ? `Subject: ${email.subject}\n\n${email.body}`
      : email.body;

    // Save human message (incoming email)
    await saveChatMessage(sessionId, 'human', emailContent);

    // Save AI response
    await saveChatMessage(sessionId, 'ai', aiResponse.content);

    console.log(`Email conversation saved for session: ${sessionId}`);
  } catch (error) {
    console.error('Error saving email conversation:', error);
    // Don't throw - email was processed successfully
  }
}

/**
 * Get email conversation history
 * Uses the same function as WhatsApp
 */
export async function getEmailHistory(emailAddress: string) {
  const sessionId = `ML-EMAIL-${emailAddress.toLowerCase()}`;
  return getChatHistory(sessionId);
}

