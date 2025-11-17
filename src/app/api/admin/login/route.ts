import { NextRequest, NextResponse } from 'next/server';
import { makeCookie, cookieName, noIndexHeaders } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Password required' },
        { status: 400, headers: noIndexHeaders() }
      );
    }

    const adminPassword = process.env.ADMIN_DASH_PASSWORD;
    if (!adminPassword) {
      console.error('ADMIN_DASH_PASSWORD not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500, headers: noIndexHeaders() }
      );
    }

    if (password !== adminPassword) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401, headers: noIndexHeaders() }
      );
    }

    const cookieValue = makeCookie(password);
    const response = NextResponse.json(
      { success: true },
      { status: 200, headers: noIndexHeaders() }
    );

    response.cookies.set(cookieName, cookieValue, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 2592000, // 30 days
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: noIndexHeaders() }
    );
  }
}

