import { ParsedEmail } from './parser';

/**
 * Email aliases to skip processing
 */
const SKIP_ALIASES = ['hello@merchlab.io', 'info@merchlab.io'];

/**
 * Whitelist of sender emails to process (for testing)
 * Only emails from these addresses will be processed
 */
const ALLOWED_SENDERS = ['ibrahim@sagentics.ai'];

/**
 * Check if email should be processed or skipped
 * Skips emails sent to hello@merchlab.io or info@merchlab.io
 * Only processes emails from allowed senders (for testing)
 */
export function shouldProcessEmail(email: ParsedEmail): boolean {
  // Check if sender is in the allowed list (for testing)
  const senderEmail = email.senderEmail.toLowerCase().trim();
  const isAllowedSender = ALLOWED_SENDERS.some(allowed => 
    senderEmail === allowed.toLowerCase()
  );

  if (!isAllowedSender) {
    console.log(`Skipping email ${email.messageId} - sender ${senderEmail} not in allowed list`);
    return false;
  }

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

  return true;
}

/**
 * Get skip aliases (for reference)
 */
export function getSkipAliases(): string[] {
  return [...SKIP_ALIASES];
}

