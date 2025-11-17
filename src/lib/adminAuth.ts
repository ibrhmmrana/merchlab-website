import { NextRequest } from 'next/server';
import { createHmac } from 'crypto';

export const cookieName = process.env.ADMIN_DASH_COOKIE_NAME ?? 'ml_admin_auth';

export function hashToken(value: string): string {
  const secret = process.env.ADMIN_DASH_COOKIE_SECRET;
  if (!secret) {
    throw new Error('ADMIN_DASH_COOKIE_SECRET is not set');
  }
  return createHmac('sha256', secret).update(value).digest('hex');
}

export function makeCookie(password: string): string {
  return hashToken(password);
}

export function isAuthed(req: NextRequest | { cookies: { get: (name: string) => { value?: string } | undefined } }): boolean {
  const cookie = req.cookies.get(cookieName);
  if (!cookie?.value) {
    return false;
  }

  const adminPassword = process.env.ADMIN_DASH_PASSWORD;
  if (!adminPassword) {
    return false;
  }

  const expectedHash = makeCookie(adminPassword);
  return cookie.value === expectedHash;
}

export function noIndexHeaders() {
  return {
    'X-Robots-Tag': 'noindex, nofollow',
  };
}

