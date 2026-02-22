import { NextResponse } from 'next/server';
import { noIndexHeaders } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  // Check environment variables (return booleans only, no secrets)
  const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasSupabaseAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const runtime = 'nodejs';
  const nodeEnv = process.env.NODE_ENV || 'unknown';
  const isVercel = !!process.env.VERCEL;

  return NextResponse.json(
    {
      hasSupabaseUrl,
      hasSupabaseAnonKey,
      runtime,
      nodeEnv,
      isVercel,
    },
    {
      headers: {
        ...noIndexHeaders(),
        'Cache-Control': 'no-store',
      },
    }
  );
}

