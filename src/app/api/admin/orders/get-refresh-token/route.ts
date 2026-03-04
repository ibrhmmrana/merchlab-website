import { NextRequest, NextResponse } from 'next/server';
import { isAuthed, noIndexHeaders } from '@/lib/adminAuth';
import type { BarronAccount } from '@/lib/barron/tokenStorage';

export const runtime = 'nodejs';

/**
 * Get the authorization URL for obtaining a refresh token.
 * Query: ?account=merchlab (default) or ?account=workwearables
 *
 * Both accounts use the same OAuth client, but you sign in with different
 * Barron user credentials to get a token scoped to that account's orders.
 */
export async function GET(request: NextRequest) {
  if (!(await isAuthed())) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: noIndexHeaders() }
    );
  }

  const { searchParams } = new URL(request.url);
  const account: BarronAccount =
    searchParams.get('account') === 'workwearables' ? 'workwearables' : 'merchlab';

  const clientId = process.env.BARRON_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: 'BARRON_CLIENT_ID environment variable is required' },
      { status: 500, headers: noIndexHeaders() }
    );
  }

  const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

  const authUrl = new URL('https://barronb2c.b2clogin.com/barronb2c.onmicrosoft.com/B2C_1_SignIn_US/oauth2/v2.0/authorize');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('redirect_uri', 'https://ai.intakt.co.za/rest/oauth2-credential/callback');
  authUrl.searchParams.set('scope', 'openid offline_access https://barronb2c.onmicrosoft.com/4fbb5489-a64f-4ff6-a9f0-05f5fa2f72e5/Orders');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('response_mode', 'query');
  authUrl.searchParams.set('access_type', 'offline');

  return NextResponse.json(
    {
      account,
      authorizationUrl: authUrl.toString(),
      instructions: [
        `1. Visit the authorizationUrl above`,
        `2. Sign in with the ${account === 'workwearables' ? 'WorkWearables' : 'MerchLab'} Barron credentials`,
        '3. After redirect, copy the code from the URL',
        `4. POST { "code": "<code>", "account": "${account}" } to /api/admin/orders/exchange-code`,
        '5. Refresh token is saved automatically',
      ],
    },
    { headers: noIndexHeaders() }
  );
}
