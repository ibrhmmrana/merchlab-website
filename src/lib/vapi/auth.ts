import { NextRequest, NextResponse } from 'next/server';

/**
 * Validate Bearer token from Authorization header
 * Returns the token if valid, or null if invalid/missing
 */
export function validateBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader) {
    return null;
  }
  
  // Check if it starts with "Bearer "
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7).trim();
  
  if (!token) {
    return null;
  }
  
  // Validate against environment variable
  const expectedToken = process.env.VAPI_API_TOOL_BEARER_TOKEN;
  
  if (!expectedToken) {
    console.error('VAPI_API_TOOL_BEARER_TOKEN environment variable is not set');
    return null;
  }
  
  if (token !== expectedToken) {
    return null;
  }
  
  return token;
}

/**
 * Middleware to check Bearer token authentication
 * Returns null if authenticated, or an error response if not
 */
export function requireAuth(request: NextRequest): NextResponse | null {
  const token = validateBearerToken(request);
  
  if (!token) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Unauthorized',
        hint: 'Invalid or missing Bearer token',
      },
      { status: 401 }
    );
  }
  
  return null;
}
