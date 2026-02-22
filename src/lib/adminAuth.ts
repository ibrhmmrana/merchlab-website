import { type Session } from '@supabase/supabase-js';
import { createAuthServerClient } from '@/lib/supabase/authServer';

export const noIndexHeaders = () => ({
  'X-Robots-Tag': 'noindex, nofollow',
});

/**
 * Get current Supabase auth session (dashboard admin).
 * Uses cookies set by Supabase Auth (refreshed by middleware on /dashboard-admin).
 */
export async function getAdminSession(): Promise<Session | null> {
  try {
    const supabase = await createAuthServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  } catch {
    return null;
  }
}

/**
 * Returns true if the request has a valid Supabase auth session (dashboard admin).
 */
export async function isAuthed(): Promise<boolean> {
  const session = await getAdminSession();
  return !!session?.user;
}
