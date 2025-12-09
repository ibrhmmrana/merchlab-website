import { google } from 'googleapis';

/**
 * Get Gmail OAuth2 client with refreshed access token
 * Uses refresh token to get a new access token automatically
 */
export async function getGmailAuth() {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'Gmail API credentials are missing. Please check your environment variables: GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN'
    );
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    'urn:ietf:wg:oauth:2.0:oob'
  );

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  try {
    // Get a fresh access token from the refresh token
    const accessTokenResponse = await oauth2Client.getAccessToken();
    const accessToken = accessTokenResponse?.token;

    if (!accessToken) {
      console.error('GMAIL_TOKENINFO: no access token returned');
      throw new Error('Failed to get Gmail access token from refresh token');
    }

    // Ask Google what scopes and user this token actually has
    const infoRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?access_token=${accessToken}`
    );
    const info = await infoRes.json();
    console.log('GMAIL_TOKENINFO', info);

    // Attach token to client and return
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    return oauth2Client;
  } catch (error) {
    console.error('Error refreshing Gmail access token:', error);
    throw new Error(
      'Failed to refresh Gmail access token. Please verify your refresh token is valid.'
    );
  }
}

