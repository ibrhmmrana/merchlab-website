import { getRefreshToken, saveRefreshToken } from '../barron/tokenStorage';

// OAuth2 configuration for Barron API
export function getBarronOAuthConfig() {
  const clientId = process.env.BARRON_CLIENT_ID;
  const clientSecret = process.env.BARRON_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new Error('BARRON_CLIENT_ID and BARRON_CLIENT_SECRET environment variables are required');
  }
  
  return {
    clientId,
    clientSecret,
    tokenUrl: 'https://barronb2c.b2clogin.com/barronb2c.onmicrosoft.com/B2C_1_SignIn_US/oauth2/v2.0/token',
    scope: 'openid offline_access https://barronb2c.onmicrosoft.com/4fbb5489-a64f-4ff6-a9f0-05f5fa2f72e5/Orders',
    ordersApiUrl: 'https://integration.barron.com/orders/salesorders',
  };
}

// In-memory token cache
let accessTokenCache: { token: string; expiresAt: number; refreshToken?: string } | null = null;

/**
 * Get OAuth2 access token using refresh token
 */
export async function getAccessToken(): Promise<string> {
  // Check cache first
  if (accessTokenCache && accessTokenCache.expiresAt > Date.now()) {
    return accessTokenCache.token;
  }

  // Get refresh token from Supabase (persistent storage) or environment variable (fallback)
  const refreshToken = await getRefreshToken() || accessTokenCache?.refreshToken;

  if (!refreshToken) {
    throw new Error(
      'BARRON_REFRESH_TOKEN is not set. Please obtain a refresh token by completing the OAuth2 authorization flow.'
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
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      // If refresh token is invalid/expired, clear cache
      if (response.status === 400 || response.status === 401) {
        accessTokenCache = null;
        throw new Error(
          `Refresh token is invalid or expired. Please obtain a new refresh token. ` +
          `Original error: ${response.status} ${errorText}`
        );
      }
      throw new Error(`Failed to get access token: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const accessToken = data.access_token;
    const newRefreshToken = data.refresh_token || refreshToken; // Use new refresh token if provided
    const expiresIn = data.expires_in || 3600; // Default to 1 hour if not provided
    
    // Cache the token (expire 5 minutes before actual expiry)
    accessTokenCache = {
      token: accessToken,
      expiresAt: Date.now() + (expiresIn - 300) * 1000,
      refreshToken: newRefreshToken,
    };

    // If we got a new refresh token, save it to Supabase for automatic rotation
    if (data.refresh_token && data.refresh_token !== refreshToken) {
      console.log('[Barron Token] New refresh token received - saving to database for automatic rotation');
      await saveRefreshToken(newRefreshToken, data.refresh_token_expires_in);
      accessTokenCache.refreshToken = newRefreshToken;
    } else if (data.refresh_token && data.refresh_token_expires_in) {
      await saveRefreshToken(newRefreshToken, data.refresh_token_expires_in);
    }

    return accessToken;
  } catch (error) {
    console.error('Error getting access token:', error);
    throw error;
  }
}

