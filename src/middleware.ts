import { NextResponse, type NextRequest } from 'next/server';
import { updateAuthSession } from '@/lib/supabase/middlewareClient';

export async function middleware(request: NextRequest) {
  const { pathname } = new URL(request.url);
  if (pathname.startsWith('/dashboard-admin')) {
    return await updateAuthSession(request);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard-admin/:path*'],
};
