import { NextResponse } from 'next/server';
import { cookieName, noIndexHeaders } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
  const response = NextResponse.json(
    { success: true },
    { status: 200, headers: noIndexHeaders() }
  );

  response.cookies.set(cookieName, '', {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
  });

  return response;
}

