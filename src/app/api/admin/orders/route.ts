import { NextRequest, NextResponse } from 'next/server';
import { isAuthed, noIndexHeaders } from '@/lib/adminAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { parseGrandTotal } from '@/server/admin/metrics';
import { getRefreshToken, saveRefreshToken } from '@/lib/barron/tokenStorage';

export const runtime = 'nodejs';

// OAuth2 configuration
function getBarronOAuthConfig() {
  const clientId = process.env.BARRON_CLIENT_ID;
  const clientSecret = process.env.BARRON_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new Error('BARRON_CLIENT_ID and BARRON_CLIENT_SECRET environment variables are required');
  }
  
  return {
    clientId,
    clientSecret,
    tokenUrl: 'https://barronb2c.b2clogin.com/barronb2c.onmicrosoft.com/B2C_1_SignIn_US/oauth2/v2.0/token',
    scope: 'openid offline_access https://barronb2c.onmicrosoft.com/4fbb5489-a64f-4ff6-a9f0-05f5fa2f72e5/Orders',
    ordersApiUrl: 'https://integration.barron.com/orders/salesorders',
  };
}

// In-memory token cache (in production, consider using Redis or database)
let accessTokenCache: { token: string; expiresAt: number; refreshToken?: string } | null = null;

// Get OAuth2 access token using refresh token
async function getAccessToken(): Promise<string> {
  // Check cache first
  if (accessTokenCache && accessTokenCache.expiresAt > Date.now()) {
    return accessTokenCache.token;
  }

  // Get refresh token from Supabase (persistent storage) or environment variable (fallback)
  const refreshToken = await getRefreshToken() || accessTokenCache?.refreshToken;

  if (!refreshToken) {
    throw new Error(
      'BARRON_REFRESH_TOKEN is not set. Please obtain a refresh token by completing the OAuth2 authorization flow. ' +
      'Use /api/admin/orders/get-refresh-token to get the authorization URL.'
    );
  }

  try {
    const config = getBarronOAuthConfig();
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      scope: config.scope,
    });

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      // If refresh token is invalid/expired, clear cache
      if (response.status === 400 || response.status === 401) {
        accessTokenCache = null;
        // Parse error to check if it's an expired token
        let errorMessage = 'Refresh token is invalid or expired.';
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error === 'invalid_grant' && errorData.error_description?.includes('expired')) {
            errorMessage = 'The authentication token has expired. Please contact an administrator to update the refresh token.';
          }
        } catch {
          // If parsing fails, use default message
        }
        throw new Error(errorMessage);
      }
      throw new Error(`Failed to get access token: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const accessToken = data.access_token;
    const newRefreshToken = data.refresh_token || refreshToken; // Use new refresh token if provided
    const expiresIn = data.expires_in || 3600; // Default to 1 hour if not provided
    
    // Cache the access token (expire 5 minutes before actual expiry)
    accessTokenCache = {
      token: accessToken,
      expiresAt: Date.now() + (expiresIn - 300) * 1000,
      refreshToken: newRefreshToken,
    };

    // If we got a new refresh token, save it to Supabase for persistence
    // This ensures automatic token rotation - no manual updates needed!
    if (data.refresh_token && data.refresh_token !== refreshToken) {
      console.log('[Barron Token] New refresh token received - saving to database for automatic rotation');
      // Save to Supabase (this will persist across deployments)
      await saveRefreshToken(newRefreshToken, data.refresh_token_expires_in);
      // Also update cache
      accessTokenCache.refreshToken = newRefreshToken;
    } else if (data.refresh_token) {
      // Even if it's the same token, update the expiration if provided
      if (data.refresh_token_expires_in) {
        await saveRefreshToken(newRefreshToken, data.refresh_token_expires_in);
      }
    }

    return accessToken;
  } catch (error) {
    console.error('Error getting access token:', error);
    throw error;
  }
}

// Fetch all orders from Barron API (handles pagination)
async function fetchOrdersFromBarron(): Promise<Array<{
  orderId: string;
  contactPersonId: string;
  customerReference: string;
  orderDate: string;
  totalIncVat: number;
  sample: boolean;
  cartId: string;
  branded: boolean;
  status: string;
  hexCode: string;
  orderTaker: string;
  isDelivery: boolean;
}>> {
  console.log('Getting access token...');
  const accessToken = await getAccessToken();
  console.log('Access token obtained, length:', accessToken.length);

  const config = getBarronOAuthConfig();
  
  // Step 1: Fetch page 1 to get total_pages
  console.log('Fetching page 1 from:', config.ordersApiUrl);
  const firstPageResponse = await fetch(`${config.ordersApiUrl}?page=1`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  console.log('Orders API response status:', firstPageResponse.status, firstPageResponse.statusText);

  if (!firstPageResponse.ok) {
    const errorText = await firstPageResponse.text();
    console.error('Orders API error:', errorText);
    throw new Error(`Failed to fetch orders: ${firstPageResponse.status} ${errorText}`);
  }

  const firstPageData = await firstPageResponse.json();
  
  // Extract total_pages from response
  let totalPages = 1;
  let allOrders: any[] = [];
  
  // Handle different response structures
  if (Array.isArray(firstPageData) && firstPageData.length > 0) {
    const firstItem = firstPageData[0] as any;
    console.log('Barron API response structure:', {
      isArray: true,
      length: firstPageData.length,
      firstItemKeys: Object.keys(firstItem),
      hasResults: !!firstItem.results,
      resultsLength: firstItem.results ? firstItem.results.length : 'N/A',
      totalPages: firstItem.total_pages,
    });
    
    if (firstItem.total_pages !== undefined) {
      totalPages = Number(firstItem.total_pages) || 1;
    }
    if (firstItem.results && Array.isArray(firstItem.results)) {
      allOrders = [...firstItem.results];
    }
  } else if (firstPageData && typeof firstPageData === 'object' && !Array.isArray(firstPageData)) {
    const dataObj = firstPageData as any;
    console.log('Barron API response structure:', {
      isArray: false,
      keys: Object.keys(dataObj),
      hasResults: !!dataObj.results,
      resultsLength: dataObj.results ? dataObj.results.length : 'N/A',
      totalPages: dataObj.total_pages,
    });
    
    if (dataObj.total_pages !== undefined) {
      totalPages = Number(dataObj.total_pages) || 1;
    }
    if (dataObj.results && Array.isArray(dataObj.results)) {
      allOrders = [...dataObj.results];
    }
  }
  
  console.log(`Found ${totalPages} total pages. Fetched page 1 with ${allOrders.length} orders.`);
  
  // Step 2: Fetch remaining pages (if any)
  if (totalPages > 1) {
    const pagePromises = [];
    for (let page = 2; page <= totalPages; page++) {
      pagePromises.push(
        fetch(`${config.ordersApiUrl}?page=${page}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }).then(async (response) => {
          if (!response.ok) {
            console.error(`Failed to fetch page ${page}: ${response.status}`);
            return [];
          }
          const pageData = await response.json();
          
          // Extract results from page
          let pageOrders: any[] = [];
          if (Array.isArray(pageData) && pageData.length > 0) {
            const firstItem = pageData[0] as any;
            if (firstItem.results && Array.isArray(firstItem.results)) {
              pageOrders = firstItem.results;
            }
          } else if (pageData && typeof pageData === 'object' && !Array.isArray(pageData)) {
            const dataObj = pageData as any;
            if (dataObj.results && Array.isArray(dataObj.results)) {
              pageOrders = dataObj.results;
            }
          }
          
          console.log(`Fetched page ${page} with ${pageOrders.length} orders.`);
          return pageOrders;
        })
      );
    }
    
    // Fetch all pages in parallel
    const remainingPagesResults = await Promise.all(pagePromises);
    remainingPagesResults.forEach((pageOrders) => {
      allOrders = [...allOrders, ...pageOrders];
    });
  }
  
  console.log(`Total orders fetched across all pages: ${allOrders.length}`);
  return allOrders;
}

// Helper to safely extract string from unknown object
function pickStr(obj: unknown, keys: string[], fallback = ''): string {
  if (!obj || typeof obj !== 'object') return fallback;
  const rec = obj as Record<string, unknown>;
  for (const k of keys) {
    const v = rec[k];
    if (typeof v === 'string' && v.trim() !== '') return v;
  }
  return fallback;
}

// Parse payload to extract customer and totals
function parsePayload(payload: unknown): Record<string, unknown> | null {
  if (typeof payload === 'string') {
    try {
      return JSON.parse(payload) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  return (payload && typeof payload === 'object') ? payload as Record<string, unknown> : null;
}

// Find invoice number from quote number
async function findInvoiceNumberFromQuote(quoteNo: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  
  // Search for invoices that might reference this quote
  // We'll search by checking if the invoice payload contains the quote number
  const { data: invoices, error } = await supabase
    .from('invoice_docs')
    .select('invoice_no, payload')
    .order('created_at', { ascending: false })
    .limit(1000); // Limit to recent invoices for performance

  if (error || !invoices) {
    return null;
  }

  // Clean quote number for matching
  const cleanQuoteNo = quoteNo.trim();
  
  // Search for invoice that references this quote
  for (const invoice of invoices) {
    const payloadStr = typeof invoice.payload === 'string' 
      ? invoice.payload 
      : JSON.stringify(invoice.payload);
    
    // Check if payload contains the quote number
    if (payloadStr.includes(cleanQuoteNo) || payloadStr.includes(cleanQuoteNo.toUpperCase()) || payloadStr.includes(cleanQuoteNo.toLowerCase())) {
      return invoice.invoice_no;
    }
  }

  return null;
}

// Get selling price and customer details from quote by quote number
async function getQuoteDetails(quoteNo: string): Promise<{
  sellingPrice: number | null;
  customer: {
    name: string;
    company: string;
    email: string;
    phone: string;
  } | null;
  invoiceNo: string | null;
}> {
  const supabase = getSupabaseAdmin();
  
  // Clean the quote number (remove any prefixes like "Q" if needed)
  const cleanQuoteNo = quoteNo.trim();
  
  const { data, error } = await supabase
    .from('quote_docs')
    .select('payload')
    .eq('quote_no', cleanQuoteNo)
    .single();

  if (error || !data) {
    // Try with different formats
    const variations = [
      cleanQuoteNo,
      cleanQuoteNo.toUpperCase(),
      cleanQuoteNo.toLowerCase(),
    ];
    
    for (const variation of variations) {
      const { data: altData } = await supabase
        .from('quote_docs')
        .select('payload')
        .eq('quote_no', variation)
        .single();
      
      if (altData) {
        const quoteDetails = extractQuoteDetails(altData.payload);
        const invoiceNo = await findInvoiceNumberFromQuote(cleanQuoteNo);
        return { ...quoteDetails, invoiceNo };
      }
    }
    
    const invoiceNo = await findInvoiceNumberFromQuote(cleanQuoteNo);
    return { sellingPrice: null, customer: null, invoiceNo };
  }

  const quoteDetails = extractQuoteDetails(data.payload);
  const invoiceNo = await findInvoiceNumberFromQuote(cleanQuoteNo);
  return { ...quoteDetails, invoiceNo };
}

// Extract selling price and customer details from quote payload
function extractQuoteDetails(payload: unknown): {
  sellingPrice: number | null;
  customer: {
    name: string;
    company: string;
    email: string;
    phone: string;
  } | null;
} {
  const p = parsePayload(payload);
  if (!p) {
    return { sellingPrice: null, customer: null };
  }

  const sellingPrice = parseGrandTotal(payload);
  
  // Extract customer info - prefer enquiryCustomer, fallback to customer
  const customerUnknown = (p?.enquiryCustomer ?? p?.customer) as unknown;
  
  if (!customerUnknown || typeof customerUnknown !== 'object') {
    return { sellingPrice, customer: null };
  }

  const firstName = pickStr(customerUnknown, ['firstName', 'first_name']);
  const lastName = pickStr(customerUnknown, ['lastName', 'last_name']);
  const company = pickStr(customerUnknown, ['company'], '-');
  const email = pickStr(customerUnknown, ['email']);
  const phone = pickStr(customerUnknown, ['telephoneNumber', 'telephone', 'phone', 'phoneNumber']);
  
  const customerName = `${firstName} ${lastName}`.trim() || 'Unknown';

  return {
    sellingPrice,
    customer: {
      name: customerName,
      company: company || '-',
      email: email || '-',
      phone: phone || '-',
    },
  };
}

// Extract quote number from customerReference
function extractQuoteNumber(customerReference: string): string | null {
  if (!customerReference) return null;
  
  // Remove leading/trailing whitespace and special characters
  const cleaned = customerReference.trim().replace(/^[\s*:]+|[\s*:]+$/g, '');
  
  // Pattern 1: Q###-XXXXX or Q#########-XXXXX
  if (cleaned.startsWith('Q')) {
    // Extract Q followed by digits, dash, and alphanumeric characters
    const match = cleaned.match(/^(Q\d+[-]\w+)/);
    if (match) {
      return match[1];
    }
    
    // Try pattern like Q20251028-E66816
    const match2 = cleaned.match(/^(Q\d+[-][A-Z0-9]+)/);
    if (match2) {
      return match2[1];
    }
  }
  
  // Pattern 2: ML-[5 character string]
  if (cleaned.startsWith('ML-')) {
    const match = cleaned.match(/^(ML-[A-Z0-9]{5})/);
    if (match) {
      return match[1];
    }
    // Also try flexible pattern for ML- followed by alphanumeric
    const match2 = cleaned.match(/^(ML-[A-Z0-9]+)/);
    if (match2) {
      return match2[1];
    }
  }
  
  return null;
}

export async function GET(request: NextRequest) {
  if (!isAuthed(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: noIndexHeaders() }
    );
  }

  try {
    // Step 1: Fetch all orders from Barron API (salesorders endpoint)
    // This gets all order IDs and their details in a single call
    console.log('Step 1: Fetching all orders from salesorders endpoint...');
    const orders = await fetchOrdersFromBarron();
    console.log(`Step 1 complete: Fetched ${orders.length} orders from Barron API`);
    
    // Extract and log all order IDs for verification
    const orderIds = orders.map(o => {
      const id = o.orderId || '';
      let formattedId = String(id).trim();
      if (formattedId.startsWith('BAR-SO')) {
        return formattedId;
      } else if (formattedId.startsWith('SO')) {
        return `BAR-${formattedId}`;
      } else {
        return `BAR-SO${formattedId}`;
      }
    });
    console.log(`Extracted ${orderIds.length} order IDs (BAR-SO format). Sample IDs:`, orderIds.slice(0, 5));

    if (orders.length === 0) {
      return NextResponse.json(
        {
          orders: [],
          total: 0,
          warning: 'No orders returned from Barron API. Check server logs for details.',
        },
        {
          headers: {
            ...noIndexHeaders(),
            'Cache-Control': 'no-store',
          },
        }
      );
    }

    // Enrich orders with selling prices, customer details, and invoice numbers from quotes
    console.log('Enriching orders with selling prices, customer details, and invoice numbers...');
    const enrichedOrders = await Promise.all(
      orders.map(async (order) => {
        let sellingPrice: number | null = null;
        let customer: {
          name: string;
          company: string;
          email: string;
          phone: string;
        } | null = null;
        let invoiceNo: string | null = null;
        
        // Extract quote number from customerReference
        const quoteNo = extractQuoteNumber(order.customerReference);
        
        if (quoteNo) {
          const quoteDetails = await getQuoteDetails(quoteNo);
          sellingPrice = quoteDetails.sellingPrice;
          customer = quoteDetails.customer;
          invoiceNo = quoteDetails.invoiceNo;
          console.log(`Order ${order.orderId}: quoteNo=${quoteNo}, invoiceNo=${invoiceNo}`);
        } else {
          console.log(`Order ${order.orderId}: No quote number extracted from customerReference="${order.customerReference}"`);
        }

        return {
          ...order,
          sellingPrice,
          customer,
          invoiceNo,
          profit: sellingPrice !== null ? sellingPrice - order.totalIncVat : null,
          profitMargin: sellingPrice !== null && sellingPrice > 0 
            ? ((sellingPrice - order.totalIncVat) / sellingPrice) * 100 
            : null,
        };
      })
    );

    // Sort by order date (most recent first)
    enrichedOrders.sort((a, b) => {
      const dateA = new Date(a.orderDate).getTime();
      const dateB = new Date(b.orderDate).getTime();
      return dateB - dateA;
    });

    return NextResponse.json(
      {
        orders: enrichedOrders,
        total: enrichedOrders.length,
      },
      {
        headers: {
          ...noIndexHeaders(),
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching orders:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500, headers: noIndexHeaders() }
    );
  }
}

