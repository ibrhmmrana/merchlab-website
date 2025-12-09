# Gmail Integration Setup Guide for WhatsApp AI Agent

This guide will help you set up Gmail API integration so the AI agent can send emails when escalation is needed.

## What You Need to Get/Setup

### 1. Google Cloud Project Setup

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Create or Select a Project**:
   - Click on the project dropdown at the top
   - Click "New Project" or select an existing one
   - Note your Project ID

### 2. Enable Gmail API

1. In your Google Cloud project, go to **"APIs & Services" > "Library"**
2. Search for **"Gmail API"**
3. Click on it and click **"Enable"**

### 3. Configure OAuth Consent Screen

1. Go to **"APIs & Services" > "OAuth consent screen"**
2. Choose **"External"** (unless you have a Google Workspace account, then use "Internal")
3. Fill in the required information:
   - **App name**: MerchLab AI Agent (or your preferred name)
   - **User support email**: Your email address
   - **Developer contact information**: Your email address
4. Click **"Save and Continue"**
5. On **"Scopes"** page, click **"Add or Remove Scopes"**
   - Add: `https://www.googleapis.com/auth/gmail.send` (for sending emails)
   - Add: `https://www.googleapis.com/auth/gmail.readonly` (for reading emails - required for email AI agent)
   - Add: `https://www.googleapis.com/auth/gmail.modify` (for marking emails as read - required for email AI agent)
   - Click **"Update"** then **"Save and Continue"**
6. On **"Test users"** page (if External):
   - Add your email address as a test user
   - Click **"Save and Continue"**
7. Click **"Back to Dashboard"**

### 4. Create OAuth 2.0 Credentials

1. Go to **"APIs & Services" > "Credentials"**
2. Click **"Create Credentials" > "OAuth client ID"**
3. Choose **"Web application"** as the application type
4. Give it a name: "MerchLab AI Agent Gmail"
5. **Authorized redirect URIs**: 
   - For local development: `http://localhost:3000/api/gmail/oauth/callback`
   - For production: `https://merchlab.io/api/gmail/oauth/callback`
   - (We'll create this endpoint to handle OAuth callback)
6. Click **"Create"**
7. **IMPORTANT**: Copy the **Client ID** and **Client Secret** - you'll need these for environment variables

### 5. Get Refresh Token (One-Time Setup)

You'll need to authorize the application once to get a refresh token. This can be done via:
- A one-time OAuth flow (we'll create an endpoint for this)
- Or using Google's OAuth 2.0 Playground: https://developers.google.com/oauthplayground/

**Using OAuth 2.0 Playground (Easier):**
1. Go to https://developers.google.com/oauthplayground/
2. Click the gear icon (⚙️) in the top right
3. Check **"Use your own OAuth credentials"**
4. Enter your **Client ID** and **Client Secret**
5. In the left panel, find **"Gmail API v1"**
6. Select: `https://www.googleapis.com/auth/gmail.send`
7. Click **"Authorize APIs"**
8. Sign in with the Gmail account you want to send emails from
9. Click **"Allow"**
10. Click **"Exchange authorization code for tokens"**
11. Copy the **Refresh Token** - you'll need this for environment variables

### 6. Environment Variables

Add these to your `.env` file:

```env
# Gmail API Credentials
GMAIL_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your-client-secret-here
GMAIL_REFRESH_TOKEN=your-refresh-token-here
GMAIL_USER_EMAIL=hello@merchlab.io  # The Gmail account to send emails from

# Staff email for escalations
STAFF_EMAIL=staff@merchlab.io  # Or use a comma-separated list: staff1@merchlab.io,staff2@merchlab.io
```

## What We'll Implement

Once you have the credentials, we'll create:

1. **Gmail authentication module** (`src/lib/gmail/auth.ts`) - Handles OAuth2 token refresh
2. **Gmail sender module** (`src/lib/gmail/sender.ts`) - Sends emails via Gmail API
3. **Escalation tool** - AI agent tool to send escalation emails
4. **OAuth callback endpoint** (optional) - For one-time token setup if needed

## Next Steps

After you provide the credentials, I'll:
1. Install the required npm package (`googleapis`)
2. Create the Gmail authentication and sender modules
3. Add an escalation tool to the AI agent
4. Update the system prompt to use escalation when needed
5. Create the OAuth callback endpoint (if needed)

## Security Notes

- **Never commit credentials to git** - Always use environment variables
- **Refresh tokens are sensitive** - Store them securely
- **Use service account** (optional) - For production, consider using a service account instead of OAuth2 for better security
- **Limit scopes** - Only request the `gmail.send` scope, not full Gmail access

