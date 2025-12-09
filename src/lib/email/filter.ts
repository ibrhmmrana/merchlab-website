import { ParsedEmail } from './parser';

/**
 * Email aliases to skip processing
 */
const SKIP_ALIASES = ['hello@merchlab.io', 'info@merchlab.io'];

/**
 * Check if email should be processed or skipped
 * Skips emails sent to hello@merchlab.io or info@merchlab.io
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

  return true;
}

/**
 * Get skip aliases (for reference)
 */
export function getSkipAliases(): string[] {
  return [...SKIP_ALIASES];
}

