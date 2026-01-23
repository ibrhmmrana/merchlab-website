import { ParsedEmail } from './parser';

/**
 * Email aliases to skip processing
 * These addresses will NOT be processed by the AI agent
 */
const SKIP_ALIASES = ['hello@merchlab.io', 'info@merchlab.io'];

/**
 * Whitelist of sender emails to process (for testing/development)
 * If set, only emails from these addresses will be processed
 * Set to empty array [] to allow all senders (production mode)
 */
const ALLOWED_SENDERS: string[] = []; // Empty = allow all senders

/**
 * Check if email should be processed or skipped
 * 
 * Processing rules:
 * - Skips emails sent to addresses in SKIP_ALIASES (hello@, info@)
 * - Processes emails sent to support@merchlab.io and orders@merchlab.io
 * - If ALLOWED_SENDERS is set, only processes emails from those senders (testing mode)
 * - If ALLOWED_SENDERS is empty, processes emails from all senders (production mode)
 */
export function shouldProcessEmail(email: ParsedEmail): boolean {
  // Get all recipients (To, CC, BCC)
  const allRecipients = [
    ...email.recipients.to,
    ...email.recipients.cc,
    ...email.recipients.bcc,
  ].map(r => r.toLowerCase().trim());

  // Check if any recipient is in the skip list
  const shouldSkip = allRecipients.some(recipient => 
    SKIP_ALIASES.some(alias => 
      recipient === alias.toLowerCase()
    )
  );

  if (shouldSkip) {
    console.log(`Skipping email ${email.messageId} - sent to skip alias`);
    return false;
  }

  // If ALLOWED_SENDERS is set (testing mode), check sender
  if (ALLOWED_SENDERS.length > 0) {
    const senderEmail = email.senderEmail.toLowerCase().trim();
    const isAllowedSender = ALLOWED_SENDERS.some(allowed => 
      senderEmail === allowed.toLowerCase()
    );

    if (!isAllowedSender) {
      console.log(`Skipping email ${email.messageId} - sender ${senderEmail} not in allowed list`);
      return false;
    }
  }

  // Email passed all checks - process it
  return true;
}

/**
 * Get skip aliases (for reference)
 */
export function getSkipAliases(): string[] {
  return [...SKIP_ALIASES];
}

