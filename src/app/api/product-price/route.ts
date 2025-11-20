import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// In-memory cache for cookie (reused across requests)
let cachedCookie: string | null = null;
let cookieExpiry: number = 0;
const COOKIE_TTL = 30 * 60 * 1000; // 30 minutes

// In-memory cache for prices
const priceCache = new Map<number, { price: number; basePrice: number; timestamp: number }>();
const PRICE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface ProductPriceData {
  StockCode: string;
  StockHeaderID: number;
  StockID: number;
  Description: string;
  Colour: string;
  Size: string;
  ColorStatus: string;
  BasePrice: number;
  DiscountBasePrice: number;
  RoyaltyFactor: number;
  Category: string;
  Type: string;
  Brand: string;
  Image: string;
  QtyAvailable: number;
  'WH3(BOND)': number;
  'WH4(BW)': number;
  WeightPerUnit: number;
  GarmentType: string;
  Gender: string;
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
    EntityName: 'Customer-ML(Lt-65146',
    entityID: '65146',
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

async function getProductPrice(stockId: number, cookie: string, retries = 2): Promise<ProductPriceData | null> {
  const url = 'https://wslive.kevro.co.za/StockFeed.asmx/GetFeedByEntityIDAndStockID';
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const formData = new URLSearchParams({
        entityID: '65146',
        username: 'ML(Lt',
        psw: 'BnkyVod3jhc=',
        ReturnType: 'JSON',
        StockID: String(stockId),
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
        throw new Error(`GetProductPrice failed: ${response.status} ${response.statusText}`);
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
      let data: ProductPriceData | ProductPriceData[] | null = null;
      if (jsonStr.startsWith('[') && jsonStr.endsWith(']')) {
        // Already in array format
        data = JSON.parse(jsonStr) as ProductPriceData[];
      } else {
        // Try to parse as-is
        data = JSON.parse(jsonStr) as ProductPriceData | ProductPriceData[];
      }
      
      const result = Array.isArray(data) ? data[0] || null : data;
      return result;
    } catch (error) {
      // If it's the last attempt, throw the error
      if (attempt === retries) {
        throw error;
      }
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
    }
  }
  
  return null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const stockId = searchParams.get('stockId');

    if (!stockId) {
      return NextResponse.json(
        { error: 'stockId parameter is required' },
        { status: 400 }
      );
    }

    const stockIdNum = parseInt(stockId, 10);
    if (isNaN(stockIdNum)) {
      return NextResponse.json(
        { error: 'stockId must be a valid number' },
        { status: 400 }
      );
    }

    // Check cache first
    const cached = priceCache.get(stockIdNum);
    if (cached && Date.now() - cached.timestamp < PRICE_CACHE_TTL) {
    return NextResponse.json({ 
      price: cached.price,
      basePrice: cached.basePrice,
      stockId: stockIdNum,
      cached: true,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600', // Cache for 5 minutes
      },
    });
    }

    // Login and get cookie (uses cache)
    const cookie = await loginAndGetCookie();

    // Get product price (with retry logic)
    const priceData = await getProductPrice(stockIdNum, cookie);

    if (!priceData) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    const result = {
      price: priceData.DiscountBasePrice,
      basePrice: priceData.BasePrice,
      stockId: priceData.StockID,
    };

    // Cache the result
    priceCache.set(stockIdNum, {
      price: result.price,
      basePrice: result.basePrice,
      timestamp: Date.now(),
    });

    // Clean up old cache entries (keep cache size reasonable)
    if (priceCache.size > 1000) {
      const now = Date.now();
      for (const [key, value] of priceCache.entries()) {
        if (now - value.timestamp > PRICE_CACHE_TTL) {
          priceCache.delete(key);
        }
      }
    }

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600', // Cache for 5 minutes
      },
    });
  } catch (error) {
    console.error('Error fetching product price:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch product price' },
      { status: 500 }
    );
  }
}

