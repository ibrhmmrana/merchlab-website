# WhatsApp AI Agent Setup Guide

## Webhook URL

Your WhatsApp webhook URL is:
```
https://your-domain.com/api/whatsapp/webhook
```

Replace `your-domain.com` with your actual domain name.

## Environment Variables Required

Add these to your `.env` file:

```env
# WhatsApp Business API
WHATSAPP_CLIENT_ID=1151073903648784
WHATSAPP_CLIENT_SECRET=your_client_secret_here
WHATSAPP_BUSINESS_ACCOUNT_ID=1877523409779615
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here  # Optional: Use this if you have it, otherwise business account ID will be used
WHATSAPP_ACCESS_TOKEN=your_access_token_here
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_verify_token_here

# OpenAI
OPENAI_API_KEY=your_openai_api_key_here

# Postgres (for chat memory)
POSTGRES_HOST=aws-1-eu-west-2.pooler.supabase.com
POSTGRES_DATABASE=postgres
POSTGRES_USER=postgres.bmkdwnfrldoqvduhpgsu
POSTGRES_PASSWORD=your_postgres_password_here
POSTGRES_PORT=6543
POSTGRES_MAX_CONNECTIONS=100

# Barron API (for order status)
BARRON_CLIENT_ID=your_barron_client_id
BARRON_CLIENT_SECRET=your_barron_client_secret
BARRON_REFRESH_TOKEN=your_barron_refresh_token

# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Setting Up the Webhook in Meta/Facebook

**IMPORTANT:** You must deploy your changes to Vercel (or your hosting platform) BEFORE setting up the webhook in Meta. The webhook URL must be publicly accessible for Meta to verify it.

### Steps:

1. **Deploy to Vercel first:**
   - Push all changes to your repository
   - Deploy to Vercel
   - Ensure the webhook endpoint is accessible at: `https://merchlab.io/api/whatsapp/webhook`

2. **Set up the webhook in Meta:**
   - Go to [Meta for Developers](https://developers.facebook.com/)
   - Navigate to your WhatsApp Business App
   - Go to **WhatsApp > Configuration**
   - Under **Webhook**, click **Edit**
   - Enter your webhook URL: `https://merchlab.io/api/whatsapp/webhook`
   - Enter your verify token (same as `WHATSAPP_WEBHOOK_VERIFY_TOKEN` in your env)
   - Click **Verify and Save**
   - If verification fails, check:
     - The webhook URL is publicly accessible
     - The verify token matches your environment variable
     - Your server is running and the endpoint is responding
   - After successful verification, subscribe to the `messages` field

### Troubleshooting Webhook Verification

If you see "The callback URL or verify token couldn't be validated":
- ✅ Make sure you've deployed to Vercel first
- ✅ Verify the webhook URL is accessible (try opening it in a browser - you should see a 403 Forbidden, which is expected for GET requests)
- ✅ Check that `WHATSAPP_WEBHOOK_VERIFY_TOKEN` is set in your Vercel environment variables
- ✅ Ensure the verify token in Meta matches exactly with your environment variable
- ✅ Check Vercel logs to see if the webhook verification request is being received

## Database Setup

### Supabase Table: `chatbot_history`

This table should already exist. It stores all WhatsApp messages.

### Postgres Table: `n8n_chat_histories`

This table is used for chat memory (context window). If it doesn't exist, create it:

```sql
CREATE TABLE IF NOT EXISTS n8n_chat_histories (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  messages JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_n8n_chat_histories_session_id ON n8n_chat_histories(session_id);
```

## How It Works

1. **Incoming Message**: WhatsApp sends a message to the webhook endpoint
2. **Save to Supabase**: The message is immediately saved to `chatbot_history` table
3. **AI Processing**: The message is processed by OpenAI GPT-4o-mini with:
   - Chat history from Postgres (`n8n_chat_histories`)
   - System prompt for MerchLab customer service
   - Function calling for order status checks
4. **Save AI Response**: The AI response is saved to Supabase
5. **Send Response**: The response is sent back via WhatsApp Business API

## Features

- **Order Status Check**: Customers can ask about their order status. The AI will:
  1. Ask for the invoice number
  2. Use the `get_order_status` function to check the Barron API
  3. Match invoice number with `customerReference` (e.g., "INV-Q553-HFKTH" → "Q553-HFKTH")
  4. Return the order status (never mentions cost/price)

- **Chat Memory**: Uses Postgres to maintain conversation context (last 20 messages)

- **Conversation Display**: All conversations are visible on `/dashboard-admin/communications/whatsapp`

## Testing

1. Send a test message to your WhatsApp Business number
2. Check the webhook logs to ensure messages are being received
3. Verify messages appear in Supabase `chatbot_history` table
4. Check that AI responses are being generated and sent
5. View conversations on the admin dashboard

## Troubleshooting

- **Webhook not receiving messages**: Verify the webhook URL is correct and accessible
- **Messages not saving**: Check Supabase credentials and table permissions
- **AI not responding**: Verify OpenAI API key is set correctly
- **Order status not working**: Check Barron API credentials and refresh token
- **Memory not working**: Verify Postgres connection and table structure

