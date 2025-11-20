import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Cache for authentication cookie (30 minutes)
let cookieCache: { cookie: string; expires: number } | null = null;

// Cache for pricing data (5 minutes)
const pricingCache = new Map<string, { data: unknown; expires: number }>();

interface LoginResponse {
  headers: {
    'set-cookie'?: string | string[];
  };
}

async function loginAndGetCookie(): Promise<string> {
  // Check cache
  if (cookieCache && cookieCache.expires > Date.now()) {
    return cookieCache.cookie;
  }

  const response = await fetch('https://wslive.kevro.co.za/StockFeed.asmx/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      TokenKey: 'T4QzhLB5UP8hygrUeEchBLdz9LtK2nSz',
      username: 'ML(Lt',
      psw: 'BnkyVod3jhc=',
      EntityName: 'Customer-ML(Lt-65146',
      entityID: '65146',
    }),
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status}`);
  }

  const setCookie = response.headers.get('set-cookie');
  if (!setCookie) {
    throw new Error('No cookie received from login');
  }

  // Extract cookie value (take first cookie if multiple)
  const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  const cookieValue = cookie.split(';')[0];

  // Cache for 30 minutes
  cookieCache = {
    cookie: cookieValue,
    expires: Date.now() + 30 * 60 * 1000,
  };

  return cookieValue;
}

async function getBrandingPricing(stockHeaderId: number, cookie: string): Promise<unknown> {
  const cacheKey = `branding-${stockHeaderId}`;
  
  // Check cache
  const cached = pricingCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  try {
    const response = await fetch('https://wslive.kevro.co.za/StockFeed.asmx/GetBrandingPricingByStockHeaderID', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: cookie,
      },
      body: new URLSearchParams({
        entityID: '65146',
        username: 'ML(Lt',
        psw: 'BnkyVod3jhc=',
        ReturnType: 'JSON',
        StockHeaderID: String(stockHeaderId),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`GetBrandingPricing failed: ${response.status}`);
    }

    const text = await response.text();
    
    // Extract JSON from XML ResponseData
    const match = text.match(/<ResponseData>([\s\S]*?)<\/ResponseData>/i);
    if (!match) {
      throw new Error('ResponseData not found in XML');
    }

    const jsonStr = match[1];
    const data = JSON.parse(jsonStr);

    // Cache for 5 minutes
    pricingCache.set(cacheKey, {
      data,
      expires: Date.now() + 5 * 60 * 1000,
    });

    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const stockHeaderId = searchParams.get('stockHeaderId');

    if (!stockHeaderId) {
      return NextResponse.json(
        { error: 'stockHeaderId is required' },
        { status: 400 }
      );
    }

    const stockHeaderIdNum = Number(stockHeaderId);
    if (Number.isNaN(stockHeaderIdNum)) {
      return NextResponse.json(
        { error: 'Invalid stockHeaderId' },
        { status: 400 }
      );
    }

    // Retry logic with exponential backoff
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const cookie = await loginAndGetCookie();
        const pricing = await getBrandingPricing(stockHeaderIdNum, cookie);
        
        return NextResponse.json(pricing, {
          headers: {
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          },
        });
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // If 401, refresh cookie and retry
        if (error instanceof Error && error.message.includes('401')) {
          cookieCache = null; // Clear cookie cache
          if (attempt < 2) {
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            continue;
          }
        }
        
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          continue;
        }
      }
    }

    throw lastError || new Error('Failed to fetch branding pricing');
  } catch (error) {
    console.error('Branding pricing API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

