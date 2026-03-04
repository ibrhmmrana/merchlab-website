import { NextRequest, NextResponse } from 'next/server';
import { isAuthed, noIndexHeaders } from '@/lib/adminAuth';
import { saveRefreshToken, type BarronAccount } from '@/lib/barron/tokenStorage';

export const runtime = 'nodejs';

/**
 * Exchange authorization code for tokens.
 *
 * POST /api/admin/orders/exchange-code
 * Body: { "code": "...", "account": "merchlab" | "workwearables" }
 * account defaults to "merchlab" if omitted.
 */
export async function POST(request: NextRequest) {
  if (!(await isAuthed())) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: noIndexHeaders() }
    );
  }

  try {
    const body = await request.json();
    const { code, account: accountParam } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Authorization code is required' },
        { status: 400, headers: noIndexHeaders() }
      );
    }

    const account: BarronAccount =
      accountParam === 'workwearables' ? 'workwearables' : 'merchlab';

    const clientId = process.env.BARRON_CLIENT_ID;
    const clientSecret = process.env.BARRON_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'BARRON_CLIENT_ID and BARRON_CLIENT_SECRET environment variables are required' },
        { status: 500, headers: noIndexHeaders() }
      );
    }

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: 'https://ai.intakt.co.za/rest/oauth2-credential/callback',
      scope: 'openid offline_access https://barronb2c.onmicrosoft.com/4fbb5489-a64f-4ff6-a9f0-05f5fa2f72e5/Orders',
    });

    const response = await fetch(
      'https://barronb2c.b2clogin.com/barronb2c.onmicrosoft.com/B2C_1_SignIn_US/oauth2/v2.0/token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Failed to exchange code: ${response.status}`, details: errorText },
        { status: response.status, headers: noIndexHeaders() }
      );
    }

    const data = await response.json();

    if (data.refresh_token) {
      try {
        await saveRefreshToken(data.refresh_token, data.refresh_token_expires_in || data.expires_in, account);
        console.log(`[Barron Token ${account}] Refresh token saved to database`);
      } catch (error) {
        console.error(`[Barron Token ${account}] Error saving refresh token:`, error);
      }
    }

    return NextResponse.json(
      {
        success: true,
        account,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
        token_type: data.token_type,
        message: `Refresh token for ${account} saved. It will be rotated automatically.`,
      },
      { headers: noIndexHeaders() }
    );
  } catch (error) {
    console.error('Error exchanging code:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500, headers: noIndexHeaders() }
    );
  }
}
