import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// In-memory cache for cookie (reused across requests)
let cachedCookie: string | null = null;
let cookieExpiry: number = 0;
const COOKIE_TTL = 30 * 60 * 1000; // 30 minutes

// In-memory cache for features
const featuresCache = new Map<number, { features: ProductFeature[]; timestamp: number }>();
const FEATURES_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

interface ProductFeature {
  LineID: number;
  StockHeaderID: number;
  Features: string;
}

async function loginAndGetCookie(): Promise<string> {
  // Return cached cookie if still valid
  if (cachedCookie && Date.now() < cookieExpiry) {
    return cachedCookie;
  }

  const loginUrl = 'https://wslive.kevro.co.za/StockFeed.asmx/login';
  
  const formData = new URLSearchParams({
    TokenKey: 'T4QzhLB5UP8hygrUeEchBLdz9LtK2nSz',
    username: 'ML(Lt',
    psw: 'BnkyVod3jhc=',
    EntityName: 'Customer-ML(Lt-65142',
    entityID: '65142',
  });

  const response = await fetch(loginUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
    // Add timeout
    signal: AbortSignal.timeout(10000), // 10 second timeout
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status} ${response.statusText}`);
  }

  // Extract cookie from Set-Cookie header
  const setCookie = response.headers.get('set-cookie') || response.headers.get('Set-Cookie');
  if (!setCookie) {
    throw new Error('No cookie received from login');
  }

  // Parse cookie - take the first part before semicolon
  let cookie = '';
  if (Array.isArray(setCookie)) {
    cookie = setCookie.map(c => String(c).split(';')[0]).join('; ');
  } else {
    cookie = setCookie.split(',').map(s => s.split(';')[0].trim()).filter(Boolean).join('; ');
  }

  // Cache the cookie
  cachedCookie = cookie;
  cookieExpiry = Date.now() + COOKIE_TTL;

  return cookie;
}

async function getProductFeatures(stockHeaderId: number, cookie: string, retries = 2): Promise<ProductFeature[]> {
  const url = 'https://wslive.kevro.co.za/StockFeed.asmx/GetProductFetauresByStockHeaderID';
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const formData = new URLSearchParams({
        entityID: '65142',
        username: 'ML(Lt',
        psw: 'BnkyVod3jhc=',
        ReturnType: 'JSON',
        StockHeaderID: String(stockHeaderId),
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': cookie,
          'Authorization': 'Basic ' + Buffer.from('ML(Lt:BnkyVod3jhc=').toString('base64'),
        },
        body: formData.toString(),
        // Add timeout
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        // If unauthorized, try refreshing cookie on retry
        if (response.status === 401 && attempt < retries) {
          cachedCookie = null; // Invalidate cookie
          cookie = await loginAndGetCookie();
          continue;
        }
        throw new Error(`GetProductFeatures failed: ${response.status} ${response.statusText}`);
      }

      const xmlText = await response.text();
      
      // Parse XML to extract JSON from ResponseData
      // The XML contains escaped JSON in ResponseData: <ResponseData>[{...}]</ResponseData>
      // Use [\s\S] instead of . with s flag for ES2017 compatibility
      const responseDataMatch = xmlText.match(/<ResponseData>([\s\S]*?)<\/ResponseData>/);
      if (!responseDataMatch) {
        throw new Error('Could not parse ResponseData from XML');
      }

      // Extract the JSON string (may be escaped)
      const jsonStr = responseDataMatch[1].trim();
      
      // Remove leading/trailing brackets if present and parse
      let features: ProductFeature[] = [];
      if (jsonStr.startsWith('[') && jsonStr.endsWith(']')) {
        // Already in array format
        features = JSON.parse(jsonStr) as ProductFeature[];
      } else {
        // Try to parse as-is
        const parsed = JSON.parse(jsonStr) as ProductFeature | ProductFeature[];
        features = Array.isArray(parsed) ? parsed : [parsed];
      }
      
      return features;
    } catch (error) {
      // If it's the last attempt, throw the error
      if (attempt === retries) {
        throw error;
      }
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
    }
  }
  
  return [];
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const stockHeaderId = searchParams.get('stockHeaderId');

    if (!stockHeaderId) {
      return NextResponse.json(
        { error: 'stockHeaderId parameter is required' },
        { status: 400 }
      );
    }

    const stockHeaderIdNum = parseInt(stockHeaderId, 10);
    if (isNaN(stockHeaderIdNum)) {
      return NextResponse.json(
        { error: 'stockHeaderId must be a valid number' },
        { status: 400 }
      );
    }

    // Check cache first
    const cached = featuresCache.get(stockHeaderIdNum);
    if (cached && Date.now() - cached.timestamp < FEATURES_CACHE_TTL) {
      return NextResponse.json({ 
        features: cached.features,
        cached: true,
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200', // Cache for 10 minutes
        },
      });
    }

    // Login and get cookie (uses cache)
    const cookie = await loginAndGetCookie();

    // Get product features (with retry logic)
    const features = await getProductFeatures(stockHeaderIdNum, cookie);

    // Cache the result
    featuresCache.set(stockHeaderIdNum, {
      features,
      timestamp: Date.now(),
    });

    // Clean up old cache entries (keep cache size reasonable)
    if (featuresCache.size > 500) {
      const now = Date.now();
      for (const [key, value] of featuresCache.entries()) {
        if (now - value.timestamp > FEATURES_CACHE_TTL) {
          featuresCache.delete(key);
        }
      }
    }

    return NextResponse.json({ features }, {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200', // Cache for 10 minutes
      },
    });
  } catch (error) {
    console.error('Error fetching product features:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch product features' },
      { status: 500 }
    );
  }
}

