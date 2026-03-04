import { getSupabaseAdmin } from '../supabaseAdmin';

export type BarronAccount = 'merchlab' | 'workwearables';

const TOKEN_KEYS: Record<BarronAccount, string> = {
  merchlab: 'barron_refresh_token',
  workwearables: 'barron_refresh_token_workwearables',
};

const ENV_FALLBACKS: Record<BarronAccount, string> = {
  merchlab: 'BARRON_REFRESH_TOKEN',
  workwearables: 'BARRON_WORKWEARABLES_REFRESH_TOKEN',
};

/**
 * Get the refresh token from Supabase or environment variable.
 * Each Barron user account (MerchLab vs WorkWearables) has its own token.
 */
export async function getRefreshToken(account: BarronAccount = 'merchlab'): Promise<string | null> {
  const tokenKey = TOKEN_KEYS[account];

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('api_tokens')
      .select('token_value, expires_at')
      .eq('token_key', tokenKey)
      .maybeSingle();

    if (!error && data && data.token_value) {
      if (data.expires_at) {
        const daysUntilExpiry = (new Date(data.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        if (daysUntilExpiry < 1) {
          console.warn(`[Barron Token ${account}] Refresh token expires in ${daysUntilExpiry.toFixed(1)} days.`);
        }
      }
      return data.token_value as string;
    }
  } catch (error) {
    console.error(`[Barron Token ${account}] Error reading from Supabase:`, error);
  }

  return process.env[ENV_FALLBACKS[account]] || null;
}

/**
 * Save the refresh token to Supabase.
 */
export async function saveRefreshToken(
  refreshToken: string,
  expiresIn?: number,
  account: BarronAccount = 'merchlab'
): Promise<void> {
  const tokenKey = TOKEN_KEYS[account];

  try {
    const supabase = getSupabaseAdmin();

    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase
      .from('api_tokens')
      .upsert({
        token_key: tokenKey,
        token_value: refreshToken,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'token_key',
      });

    if (error) {
      console.error(`[Barron Token ${account}] Error saving to Supabase:`, error);
    } else {
      console.log(`[Barron Token ${account}] Refresh token saved to Supabase`);
    }
  } catch (error) {
    console.error(`[Barron Token ${account}] Exception saving to Supabase:`, error);
  }
}
