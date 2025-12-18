import { getSupabaseAdmin } from '../supabaseAdmin';

const TOKEN_KEY = 'barron_refresh_token';

/**
 * Get the refresh token from Supabase or environment variable
 */
export async function getRefreshToken(): Promise<string | null> {
  // First try to get from Supabase
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('api_tokens')
      .select('token_value, expires_at')
      .eq('token_key', TOKEN_KEY)
      .maybeSingle();

    if (!error && data && data.token_value) {
      // Check if token is expired (if expires_at is set)
      if (data.expires_at) {
        const expiresAt = new Date(data.expires_at);
        const now = new Date();
        // If token expires in less than 1 day, log a warning
        const daysUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        if (daysUntilExpiry < 1) {
          console.warn(`[Barron Token] Refresh token expires in ${daysUntilExpiry.toFixed(1)} days. Consider refreshing soon.`);
        }
      }
      return data.token_value as string;
    }
  } catch (error) {
    console.error('[Barron Token] Error reading from Supabase:', error);
  }

  // Fallback to environment variable
  return process.env.BARRON_REFRESH_TOKEN || null;
}

/**
 * Save the refresh token to Supabase
 */
export async function saveRefreshToken(
  refreshToken: string,
  expiresIn?: number
): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    
    // Calculate expiration date if expiresIn is provided (in seconds)
    // Refresh tokens typically expire in 14 days (1209600 seconds)
    const expiresAt = expiresIn 
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(); // Default to 14 days

    const { error } = await supabase
      .from('api_tokens')
      .upsert({
        token_key: TOKEN_KEY,
        token_value: refreshToken,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'token_key',
      });

    if (error) {
      console.error('[Barron Token] Error saving to Supabase:', error);
      // Don't throw - we can still use the token from memory/cache
    } else {
      console.log('[Barron Token] Refresh token saved to Supabase successfully');
    }
  } catch (error) {
    console.error('[Barron Token] Exception saving to Supabase:', error);
    // Don't throw - we can still use the token from memory/cache
  }
}

