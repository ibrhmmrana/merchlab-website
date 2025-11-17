import { NextResponse } from 'next/server';
import { cookieName, noIndexHeaders } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
  const response = NextResponse.json(
    { success: true },
    { status: 200, headers: noIndexHeaders() }
  );

  // Always use secure cookies in production (Vercel sets NODE_ENV)
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  
  response.cookies.set(cookieName, '', {
    path: '/',
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 0,
  });

  return response;
}

