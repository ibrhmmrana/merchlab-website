import { NextRequest, NextResponse } from 'next/server';
import { makeCookie, cookieName, noIndexHeaders } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Check required environment variables first
    const adminPassword = process.env.ADMIN_DASH_PASSWORD;
    const cookieSecret = process.env.ADMIN_DASH_COOKIE_SECRET;
    
    if (!adminPassword) {
      console.error('ADMIN_DASH_PASSWORD not configured');
      return NextResponse.json(
        { error: 'Server configuration error: ADMIN_DASH_PASSWORD is missing' },
        { status: 500, headers: noIndexHeaders() }
      );
    }

    if (!cookieSecret) {
      console.error('ADMIN_DASH_COOKIE_SECRET not configured');
      return NextResponse.json(
        { error: 'Server configuration error: ADMIN_DASH_COOKIE_SECRET is missing' },
        { status: 500, headers: noIndexHeaders() }
      );
    }

    const body = await request.json();
    const { password } = body;

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Password required' },
        { status: 400, headers: noIndexHeaders() }
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

    // Always use secure cookies in production (Vercel sets NODE_ENV)
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
    
    response.cookies.set(cookieName, cookieValue, {
      path: '/',
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 2592000, // 30 days
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Internal server error: ${errorMessage}` },
      { status: 500, headers: noIndexHeaders() }
    );
  }
}

