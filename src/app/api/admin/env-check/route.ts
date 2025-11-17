import { NextResponse } from 'next/server';
import { noIndexHeaders } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  // Check environment variables (return booleans only, no secrets)
  const hasPasswordEnv = !!process.env.ADMIN_DASH_PASSWORD;
  const hasCookieSecret = !!process.env.ADMIN_DASH_COOKIE_SECRET;
  const runtime = 'nodejs';
  const nodeEnv = process.env.NODE_ENV || 'unknown';
  const isVercel = !!process.env.VERCEL;

  return NextResponse.json(
    {
      hasPasswordEnv,
      hasCookieSecret,
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

