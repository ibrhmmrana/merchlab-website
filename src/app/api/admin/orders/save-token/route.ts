import { NextRequest, NextResponse } from 'next/server';
import { isAuthed, noIndexHeaders } from '@/lib/adminAuth';
import { saveRefreshToken, type BarronAccount } from '@/lib/barron/tokenStorage';

export const runtime = 'nodejs';

/**
 * Directly save a refresh token for a Barron account (bypasses auth code flow).
 *
 * POST /api/admin/orders/save-token
 * Body: { "refresh_token": "...", "account": "merchlab" | "workwearables" }
 *
 * Use this when you already have a working refresh token (e.g. from n8n)
 * and want to save it without going through the authorization code flow
 * (which would invalidate the other account's token).
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
    const { refresh_token, account: accountParam } = body;

    if (!refresh_token || typeof refresh_token !== 'string') {
      return NextResponse.json(
        { error: 'refresh_token is required' },
        { status: 400, headers: noIndexHeaders() }
      );
    }

    const account: BarronAccount =
      accountParam === 'workwearables' ? 'workwearables' : 'merchlab';

    await saveRefreshToken(refresh_token, undefined, account);

    return NextResponse.json(
      {
        success: true,
        account,
        message: `Refresh token for ${account} saved to database.`,
      },
      { headers: noIndexHeaders() }
    );
  } catch (error) {
    console.error('Error saving token:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500, headers: noIndexHeaders() }
    );
  }
}
