import { NextResponse } from 'next/server';
import { createAuthServerClient } from '@/lib/supabase/authServer';
import { noIndexHeaders } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
  try {
    const supabase = await createAuthServerClient();
    await supabase.auth.signOut();
  } catch {
    // Continue and return success so client can refresh
  }
  return NextResponse.json(
    { success: true },
    { status: 200, headers: noIndexHeaders() }
  );
}
