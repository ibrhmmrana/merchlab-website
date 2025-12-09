# Email AI Agent Setup Guide

This guide explains how to set up and use the Email AI Agent that automatically responds to customer emails.

## Overview

The Email AI Agent:
- Polls Gmail for incoming unread emails
- Filters out emails sent to `hello@merchlab.io` and `info@merchlab.io`
- Categorizes emails using keyword matching
- Processes emails with the same AI agent used for WhatsApp
- Sends professional HTML email responses
- Attaches PDFs (quotes/invoices) when requested
- Stores conversations in the same memory system as WhatsApp

## Prerequisites

1. Gmail API setup (see `GMAIL_SETUP_GUIDE.md`)
2. Gmail API scopes must include:
   - `gmail.send` (for sending emails)
   - `gmail.readonly` (for reading emails)
   - `gmail.modify` (for marking emails as read)

## Environment Variables

Add these to your `.env.local`:

```env
# Gmail API (already configured)
GMAIL_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your-client-secret-here
GMAIL_REFRESH_TOKEN=your-refresh-token-here
GMAIL_USER_EMAIL=hello@merchlab.io

# Email agent configuration
EMAIL_SKIP_ALIASES=hello@merchlab.io,info@merchlab.io
EMAIL_CRON_SECRET=your_secret_token_here  # Optional: for securing cron endpoint
```

## Setting Up the Cron Job

### Option A: Vercel Cron (Recommended if deployed on Vercel)

Create or update `vercel.json` in your project root:

```json
{
  "crons": [{
    "path": "/api/email/poll",
    "schedule": "*/5 * * * *"
  }]
}
```

This will poll for emails every 5 minutes.

### Option B: External Cron Service

Use a service like [cron-job.org](https://cron-job.org) or [EasyCron](https://www.easycron.com):

1. Create a new cron job
2. Set the URL: `https://your-domain.com/api/email/poll`
3. Set schedule: Every 1-5 minutes
4. Add authentication header (if `EMAIL_CRON_SECRET` is set):
   - Header: `Authorization`
   - Value: `Bearer your_secret_token_here`
5. Save and enable

## How It Works

1. **Polling**: Cron job calls `/api/email/poll` endpoint
2. **Fetch Emails**: Gmail API fetches unread emails (excluding emails from yourself)
3. **Filtering**: Emails sent to `hello@merchlab.io` or `info@merchlab.io` are skipped
4. **Parsing**: Email content is extracted (subject, body, sender, thread ID)
5. **Categorization**: Email is categorized (order_status, quote_request, etc.)
6. **AI Processing**: Email is processed by the same AI agent as WhatsApp
7. **Response**: AI generates a response (can include PDF attachments)
8. **Sending**: Response is sent as a reply to the original email thread
9. **Storage**: Conversation is saved to Postgres (same as WhatsApp)
10. **Mark as Read**: Original email is marked as read

## Email Categories

The agent categorizes emails into:
- `order_status` - Questions about order tracking/status
- `quote_request` - Requests for quotes or pricing
- `invoice_request` - Requests for invoices or receipts
- `account_info` - Questions about account/order history
- `delivery_info` - Questions about delivery/shipping
- `order_details` - Questions about order items/products
- `general_support` - General customer support questions
- `escalation` - Requests to speak with human or complaints

## Features

### Customer Lookup
- Identifies customers by email address
- Looks up quotes and invoices by email (same as phone lookup)
- Maintains conversation context across email threads

### PDF Attachments
- When customer requests a quote/invoice PDF, it's attached to the email
- PDF link is also included in the email body
- Supports both quote and invoice PDFs

### Email Threading
- Replies maintain email thread context
- Uses Gmail thread ID for proper threading
- Conversation history is maintained per email address

### Escalation
- Same escalation logic as WhatsApp
- Sends email to staff when customer requests human support
- Includes full conversation context

## Testing

1. Send a test email to your Gmail account (not to hello@ or info@)
2. Wait for the cron job to run (or manually call `/api/email/poll`)
3. Check that you receive an AI-generated response
4. Verify the email is marked as read
5. Check the response in your email client

## Manual Testing

You can manually trigger email processing by calling:

```bash
curl -X GET https://your-domain.com/api/email/poll
```

Or with authentication (if `EMAIL_CRON_SECRET` is set):

```bash
curl -X GET https://your-domain.com/api/email/poll \
  -H "Authorization: Bearer your_secret_token_here"
```

## Monitoring

The polling endpoint returns a summary:

```json
{
  "success": true,
  "summary": {
    "total": 5,
    "processed": 3,
    "skipped": 1,
    "errors": 1
  },
  "details": [
    { "messageId": "...", "status": "processed" },
    { "messageId": "...", "status": "filtered" },
    { "messageId": "...", "status": "error", "error": "..." }
  ]
}
```

## Troubleshooting

### Emails Not Being Processed
- Check that cron job is running
- Verify Gmail API credentials are correct
- Check that emails are unread (not already read)
- Verify emails are not sent to hello@ or info@ aliases

### No Responses Sent
- Check Gmail API scopes include `gmail.send`
- Verify `GMAIL_USER_EMAIL` is set correctly
- Check error logs for API errors

### PDFs Not Attaching
- Verify PDF URLs are accessible
- Check that PDF URLs return valid PDF files
- Review error logs for download failures

### Duplicate Processing
- The agent tracks processed message IDs in memory
- In production, consider storing processed IDs in a database
- Restarting the server will reset the in-memory cache

## Next Steps

1. Set up cron job (Vercel or external service)
2. Test with real customer emails
3. Monitor processing times and errors
4. Consider adding email analytics dashboard
5. Optionally switch to Gmail Watch API for real-time processing

