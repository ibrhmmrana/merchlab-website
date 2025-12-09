import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getGmailAuth } from '@/lib/gmail/auth';
import { parseGmailMessage } from '@/lib/email/parser';
import { shouldProcessEmail } from '@/lib/email/filter';
import { categorizeEmail } from '@/lib/email/categorizer';
import { processEmail } from '@/lib/email/aiAgent';
import { sendEmailReply } from '@/lib/email/sender';
import { saveEmailMessage } from '@/lib/email/storage';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Track processed message IDs to avoid duplicates
 * In production, this should be stored in a database
 */
const processedMessageIds = new Set<string>();

/**
 * Email polling endpoint
 * Fetches unread emails from Gmail and processes them
 */
export async function GET(request: NextRequest) {
  // Optional: Check for cron secret authentication
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.EMAIL_CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const auth = await getGmailAuth();
    const gmail = google.gmail({ version: 'v1', auth });

    // Fetch unread emails
    console.log('Fetching unread emails from Gmail...');
    const messagesResponse = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread -from:me',
      maxResults: 50,
    });

    const messages = messagesResponse.data.messages || [];
    console.log(`Found ${messages.length} unread emails`);

    const results = {
      processed: 0,
      skipped: 0,
      errors: 0,
      details: [] as Array<{ messageId: string; status: string; error?: string }>,
    };

    // Process each email
    for (const message of messages) {
      if (!message.id) continue;

      const messageId = message.id;

      try {
        // Check if already processed
        if (processedMessageIds.has(messageId)) {
          console.log(`Skipping already processed email: ${messageId}`);
          results.skipped++;
          results.details.push({ messageId, status: 'already_processed' });
          continue;
        }

        // Parse email
        const parsedEmail = await parseGmailMessage(messageId);
        if (!parsedEmail) {
          console.error(`Failed to parse email: ${messageId}`);
          results.errors++;
          results.details.push({ messageId, status: 'parse_error', error: 'Failed to parse email' });
          continue;
        }

        // Filter emails (skip hello@, info@)
        if (!shouldProcessEmail(parsedEmail)) {
          console.log(`Skipping email ${messageId} - filtered out`);
          results.skipped++;
          results.details.push({ messageId, status: 'filtered' });
          // Mark as processed so we don't check it again
          processedMessageIds.add(messageId);
          continue;
        }

        // Categorize email (for logging/debugging)
        const category = categorizeEmail(parsedEmail);
        console.log(`Processing email ${messageId} - Category: ${category.category} (confidence: ${category.confidence})`);

        // Process with AI agent
        const aiResponse = await processEmail(parsedEmail);

        // Send email reply
        let pdfUrl: string | undefined;
        let pdfFilename: string | undefined;

        if (aiResponse.quotePdfUrl) {
          pdfUrl = aiResponse.quotePdfUrl;
          pdfFilename = aiResponse.quoteNumber 
            ? `${aiResponse.quoteNumber}.pdf`
            : `quote-${Date.now()}.pdf`;
        } else if (aiResponse.invoicePdfUrl) {
          pdfUrl = aiResponse.invoicePdfUrl;
          pdfFilename = aiResponse.invoiceNumber
            ? `${aiResponse.invoiceNumber}.pdf`
            : `invoice-${Date.now()}.pdf`;
        }

        await sendEmailReply(parsedEmail, aiResponse, pdfUrl, pdfFilename);

        // Save conversation to storage
        await saveEmailMessage(parsedEmail, aiResponse);

        // Mark as processed
        processedMessageIds.add(messageId);

        // Also store in Supabase for tracking (optional)
        try {
          const supabase = getSupabaseAdmin();
          const { error } = await supabase.from('email_processing_log').insert({
            message_id: messageId,
            thread_id: parsedEmail.threadId,
            sender_email: parsedEmail.senderEmail,
            subject: parsedEmail.subject,
            category: category.category,
            processed_at: new Date().toISOString(),
          });
          
          if (error) {
            // Table might not exist, that's okay
            console.log('email_processing_log table not found or error:', error.message);
          }
        } catch (dbError) {
          // Ignore database errors for logging
          console.log('Could not log to database:', dbError);
        }

        results.processed++;
        results.details.push({ messageId, status: 'processed' });

        console.log(`Successfully processed email ${messageId}`);
      } catch (error) {
        console.error(`Error processing email ${messageId}:`, error);
        results.errors++;
        results.details.push({
          messageId,
          status: 'error',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        total: messages.length,
        processed: results.processed,
        skipped: results.skipped,
        errors: results.errors,
      },
      details: results.details,
    });
  } catch (error) {
    console.error('Error in email polling:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint (alternative to GET for cron jobs)
 */
export async function POST(request: NextRequest) {
  return GET(request);
}

