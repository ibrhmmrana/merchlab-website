import { getRefreshToken, saveRefreshToken, type BarronAccount } from '../barron/tokenStorage';

const BARRON_CONFIG = {
  tokenUrl: 'https://barronb2c.b2clogin.com/barronb2c.onmicrosoft.com/B2C_1_SignIn_US/oauth2/v2.0/token',
  scope: 'openid offline_access https://barronb2c.onmicrosoft.com/4fbb5489-a64f-4ff6-a9f0-05f5fa2f72e5/Orders',
  ordersApiUrl: 'https://integration.barron.com/orders/salesorders',
};

export function getBarronOAuthConfig() {
  const clientId = process.env.BARRON_CLIENT_ID;
  const clientSecret = process.env.BARRON_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('BARRON_CLIENT_ID and BARRON_CLIENT_SECRET environment variables are required');
  }
  return { clientId, clientSecret, ...BARRON_CONFIG };
}

// Per-account in-memory token cache (same client, different Barron user logins)
const accessTokenCache: Record<BarronAccount, { token: string; expiresAt: number; refreshToken?: string } | null> = {
  merchlab: null,
  workwearables: null,
};

/**
 * Get OAuth2 access token for a Barron account (default: merchlab).
 * Both accounts use the same client_id/secret but different user logins → different refresh tokens.
 */
export async function getAccessToken(account: BarronAccount = 'merchlab'): Promise<string> {
  if (accessTokenCache[account] && accessTokenCache[account]!.expiresAt > Date.now()) {
    return accessTokenCache[account]!.token;
  }

  const refreshToken = await getRefreshToken(account) || accessTokenCache[account]?.refreshToken;

  if (!refreshToken) {
    throw new Error(
      `${account} refresh token not set. Use /api/admin/orders/get-refresh-token?account=${account} to authorize.`
    );
  }

  try {
    const config = getBarronOAuthConfig();
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      scope: config.scope,
    });

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 400 || response.status === 401) {
        accessTokenCache[account] = null;
        throw new Error(
          `${account} refresh token is invalid or expired. Re-authorize via get-refresh-token. Error: ${response.status} ${errorText}`
        );
      }
      throw new Error(`Failed to get access token for ${account}: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const newRefreshToken = data.refresh_token || refreshToken;
    const expiresIn = data.expires_in || 3600;

    accessTokenCache[account] = {
      token: data.access_token,
      expiresAt: Date.now() + (expiresIn - 300) * 1000,
      refreshToken: newRefreshToken,
    };

    if (data.refresh_token && data.refresh_token !== refreshToken) {
      console.log(`[Barron Token ${account}] New refresh token - saving to database`);
      await saveRefreshToken(newRefreshToken, data.refresh_token_expires_in, account);
      accessTokenCache[account]!.refreshToken = newRefreshToken;
    } else if (data.refresh_token && data.refresh_token_expires_in) {
      await saveRefreshToken(newRefreshToken, data.refresh_token_expires_in, account);
    }

    return data.access_token;
  } catch (error) {
    console.error(`Error getting access token (${account}):`, error);
    throw error;
  }
}
