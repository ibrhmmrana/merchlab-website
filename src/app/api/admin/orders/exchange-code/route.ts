import { NextRequest, NextResponse } from 'next/server';
import { isAuthed, noIndexHeaders } from '@/lib/adminAuth';

export const runtime = 'nodejs';

/**
 * Exchange authorization code for access and refresh tokens.
 * 
 * Usage: POST /api/admin/orders/exchange-code
 * Body: { "code": "authorization_code_from_callback" }
 */
export async function POST(request: NextRequest) {
  if (!isAuthed(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: noIndexHeaders() }
    );
  }

  try {
    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Authorization code is required' },
        { status: 400, headers: noIndexHeaders() }
      );
    }

    const clientId = process.env.BARRON_CLIENT_ID;
    const clientSecret = process.env.BARRON_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'BARRON_CLIENT_ID and BARRON_CLIENT_SECRET environment variables are required' },
        { status: 500, headers: noIndexHeaders() }
      );
    }
    
    const redirectUri = 'https://ai.intakt.co.za/rest/oauth2-credential/callback';
    const scope = 'openid offline_access https://barronb2c.onmicrosoft.com/4fbb5489-a64f-4ff6-a9f0-05f5fa2f72e5/Orders';
    const tokenUrl = 'https://barronb2c.b2clogin.com/barronb2c.onmicrosoft.com/B2C_1_SignIn_US/oauth2/v2.0/token';

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      redirect_uri: redirectUri,
      scope: scope,
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { 
          error: `Failed to exchange code: ${response.status}`,
          details: errorText 
        },
        { status: response.status, headers: noIndexHeaders() }
      );
    }

    const data = await response.json();

    return NextResponse.json(
      {
        success: true,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
        token_type: data.token_type,
        instructions: [
          'Save the refresh_token value as BARRON_REFRESH_TOKEN environment variable',
          'The access_token will be automatically refreshed using the refresh_token',
        ],
      },
      { headers: noIndexHeaders() }
    );
  } catch (error) {
    console.error('Error exchanging code:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500, headers: noIndexHeaders() }
    );
  }
}

