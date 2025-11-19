import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface ProductFeature {
  LineID: number;
  StockHeaderID: number;
  Features: string;
}

async function loginAndGetCookie(): Promise<string> {
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

  return cookie;
}

async function getProductFeatures(stockHeaderId: number, cookie: string): Promise<ProductFeature[]> {
  const url = 'https://wslive.kevro.co.za/StockFeed.asmx/GetProductFetauresByStockHeaderID';
  
  const formData = new URLSearchParams({
    entityID: '65146',
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
  });

  if (!response.ok) {
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
  if (jsonStr.startsWith('[') && jsonStr.endsWith(']')) {
    // Already in array format
    const features = JSON.parse(jsonStr) as ProductFeature[];
    return features;
  } else {
    // Try to parse as-is
    const features = JSON.parse(jsonStr) as ProductFeature[];
    return Array.isArray(features) ? features : [features];
  }
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

    // Login and get cookie
    const cookie = await loginAndGetCookie();

    // Get product features
    const features = await getProductFeatures(stockHeaderIdNum, cookie);

    return NextResponse.json({ features });
  } catch (error) {
    console.error('Error fetching product features:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch product features' },
      { status: 500 }
    );
  }
}

