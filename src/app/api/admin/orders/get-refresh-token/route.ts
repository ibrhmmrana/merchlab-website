import { NextRequest, NextResponse } from 'next/server';
import { isAuthed, noIndexHeaders } from '@/lib/adminAuth';

export const runtime = 'nodejs';

/**
 * Helper endpoint to get the authorization URL for obtaining a refresh token.
 * 
 * To get a refresh token:
 * 1. Visit the authorization URL returned by this endpoint
 * 2. Sign in with info@merchlab.io / M3rch$h0p
 * 3. You'll be redirected to the callback URL with an authorization code
 * 4. Exchange the code for tokens using the /exchange-code endpoint
 * 5. Save the refresh_token as BARRON_REFRESH_TOKEN environment variable
 */
export async function GET(request: NextRequest) {
  if (!isAuthed(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: noIndexHeaders() }
    );
  }

  const clientId = process.env.BARRON_CLIENT_ID;
  
  if (!clientId) {
    return NextResponse.json(
      { error: 'BARRON_CLIENT_ID environment variable is required' },
      { status: 500, headers: noIndexHeaders() }
    );
  }
  
  const redirectUri = 'https://ai.intakt.co.za/rest/oauth2-credential/callback';
  const scope = 'openid offline_access https://barronb2c.onmicrosoft.com/4fbb5489-a64f-4ff6-a9f0-05f5fa2f72e5/Orders';
  const authorizationUrl = 'https://barronb2c.b2clogin.com/barronb2c.onmicrosoft.com/B2C_1_SignIn_US/oauth2/v2.0/authorize';
  
  // Generate a state parameter for security
  const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  
  const authUrl = new URL(authorizationUrl);
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', scope);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('response_mode', 'query');

  return NextResponse.json(
    {
      authorizationUrl: authUrl.toString(),
      instructions: [
        '1. Visit the authorizationUrl above',
        '2. Sign in with: info@merchlab.io / M3rch$h0p',
        '3. After authorization, you will be redirected with a code parameter',
        '4. Use that code with the /api/admin/orders/exchange-code endpoint to get tokens',
        '5. Save the refresh_token as BARRON_REFRESH_TOKEN environment variable',
      ],
    },
    { headers: noIndexHeaders() }
  );
}

