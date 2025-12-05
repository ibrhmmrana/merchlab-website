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
    throw new Error('Gmail API credentials are missing. Please check your environment variables: GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN');
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    'urn:ietf:wg:oauth:2.0:oob' // Redirect URI (not used for refresh token flow)
  );

  // Set the refresh token
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  // Refresh the access token
  try {
    const { credentials } = await oauth2Client.refreshAccessToken();
    oauth2Client.setCredentials(credentials);
    return oauth2Client;
  } catch (error) {
    console.error('Error refreshing Gmail access token:', error);
    throw new Error('Failed to refresh Gmail access token. Please verify your refresh token is valid.');
  }
}

