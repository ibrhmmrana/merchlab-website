import { getBarronOAuthConfig, getAccessToken } from './barronAuth';
import { getSupabaseAdmin } from '../supabaseAdmin';

interface Order {
  orderId: string;
  customerReference: string;
  status: string;
  orderDate: string;
  isDelivery: boolean;
}

interface CustomerInfo {
  name: string;
  company: string;
  email: string;
  phone: string;
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

// Get customer details from quote
async function getCustomerFromQuote(quoteNo: string): Promise<CustomerInfo | null> {
  const supabase = getSupabaseAdmin();
  
  // Clean the quote number
  const cleanQuoteNo = quoteNo.trim();
  console.log(`[getCustomerFromQuote] Looking up quote: ${cleanQuoteNo}`);
  
  const { data, error } = await supabase
    .from('quote_docs')
    .select('payload')
    .eq('quote_no', cleanQuoteNo)
    .single();

  if (error || !data) {
    console.log(`[getCustomerFromQuote] Quote not found with exact match, trying variations. Error: ${error?.message || 'No data'}`);
    // Try with different formats
    const variations = [
      cleanQuoteNo,
      cleanQuoteNo.toUpperCase(),
      cleanQuoteNo.toLowerCase(),
    ];
    
    for (const variation of variations) {
      console.log(`[getCustomerFromQuote] Trying variation: ${variation}`);
      const { data: altData, error: altError } = await supabase
        .from('quote_docs')
        .select('payload')
        .eq('quote_no', variation)
        .single();
      
      if (altData) {
        console.log(`[getCustomerFromQuote] Found quote with variation: ${variation}`);
        const customer = extractCustomerFromPayload(altData.payload);
        console.log(`[getCustomerFromQuote] Extracted customer: ${customer ? JSON.stringify(customer) : 'null'}`);
        return customer;
      }
    }
    
    console.log(`[getCustomerFromQuote] Quote not found in any variation: ${cleanQuoteNo}`);
    return null;
  }

  console.log(`[getCustomerFromQuote] Found quote, extracting customer from payload`);
  const customer = extractCustomerFromPayload(data.payload);
  console.log(`[getCustomerFromQuote] Extracted customer: ${customer ? JSON.stringify(customer) : 'null'}`);
  return customer;
}

// Extract customer details from quote payload
function extractCustomerFromPayload(payload: unknown): CustomerInfo | null {
  const p = parsePayload(payload);
  if (!p) {
    return null;
  }
  
  // Extract customer info - prefer enquiryCustomer, fallback to customer
  const customerUnknown = (p?.enquiryCustomer ?? p?.customer) as unknown;
  
  if (!customerUnknown || typeof customerUnknown !== 'object') {
    return null;
  }

  const firstName = pickStr(customerUnknown, ['firstName', 'first_name']);
  const lastName = pickStr(customerUnknown, ['lastName', 'last_name']);
  const company = pickStr(customerUnknown, ['company'], '-');
  const email = pickStr(customerUnknown, ['email']);
  const phone = pickStr(customerUnknown, ['telephoneNumber', 'telephone', 'phone', 'phoneNumber']);

  const customerName = `${firstName} ${lastName}`.trim() || 'Unknown';

  return {
    name: customerName,
    company: company || '-',
    email: email || '-',
    phone: phone || '-',
  };
}

/**
 * Extract customer reference from invoice number
 * Examples:
 * - 'INV-Q553-HFKTH' -> 'Q553-HFKTH'
 * - 'INV-ML-DM618' -> 'ML-DM618'
 */
function extractCustomerReference(invoiceNumber: string): string {
  // Remove 'INV-' prefix if present
  if (invoiceNumber.toUpperCase().startsWith('INV-')) {
    return invoiceNumber.substring(4);
  }
  return invoiceNumber;
}

/**
 * Fetch orders from Barron API
 */
async function fetchOrdersFromBarron(): Promise<Order[]> {
  const accessToken = await getAccessToken();
  const config = getBarronOAuthConfig();
  
  const response = await fetch(config.ordersApiUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch orders: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  
  // The API returns an array with one object containing results
  if (Array.isArray(data) && data.length > 0) {
    const firstItem = data[0] as { results?: unknown[] };
    if (firstItem.results && Array.isArray(firstItem.results)) {
      return firstItem.results.map((order: unknown) => {
        if (!order || typeof order !== 'object') {
          throw new Error('Invalid order format');
        }
        const orderObj = order as Record<string, unknown>;
        return {
          orderId: String(orderObj.orderId || ''),
          customerReference: String(orderObj.customerReference || ''),
          status: String(orderObj.status || ''),
          orderDate: String(orderObj.orderDate || ''),
          isDelivery: Boolean(orderObj.isDelivery),
        };
      });
    }
  }
  
  // Try alternative structure
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const dataObj = data as { results?: unknown[] };
    if (dataObj.results && Array.isArray(dataObj.results)) {
      return dataObj.results.map((order: unknown) => {
        if (!order || typeof order !== 'object') {
          throw new Error('Invalid order format');
        }
        const orderObj = order as Record<string, unknown>;
        return {
          orderId: String(orderObj.orderId || ''),
          customerReference: String(orderObj.customerReference || ''),
          status: String(orderObj.status || ''),
          orderDate: String(orderObj.orderDate || ''),
          isDelivery: Boolean(orderObj.isDelivery),
        };
      });
    }
  }
  
  return [];
}

/**
 * Get order status and customer information by invoice number
 * Returns the order status and customer info, or null if not found
 */
export interface OrderStatusWithCustomer {
  status: string;
  customer: CustomerInfo | null;
}

export async function getOrderStatus(invoiceNumber: string): Promise<OrderStatusWithCustomer | null> {
  try {
    const customerReference = extractCustomerReference(invoiceNumber);
    console.log(`[getOrderStatus] Invoice: ${invoiceNumber}, Customer Reference: ${customerReference}`);
    
    const orders = await fetchOrdersFromBarron();
    console.log(`[getOrderStatus] Fetched ${orders.length} orders from Barron`);
    
    // Find order matching the customer reference
    const order = orders.find(
      (o) => o.customerReference === customerReference
    );
    
    if (!order) {
      console.log(`[getOrderStatus] No order found matching customerReference: ${customerReference}`);
      return null;
    }
    
    console.log(`[getOrderStatus] Found order - Status: ${order.status}, CustomerReference: ${order.customerReference}`);
    
    // Extract quote number from customerReference
    const quoteNo = extractQuoteNumber(order.customerReference);
    console.log(`[getOrderStatus] Extracted quote number: ${quoteNo || 'null'}`);
    
    // Get customer information from quote
    let customer: CustomerInfo | null = null;
    if (quoteNo) {
      try {
        console.log(`[getOrderStatus] Attempting to fetch customer from quote: ${quoteNo}`);
        customer = await getCustomerFromQuote(quoteNo);
        if (customer) {
          console.log(`[getOrderStatus] Customer found: ${customer.name}, ${customer.email}`);
        } else {
          console.log(`[getOrderStatus] No customer info found in quote: ${quoteNo}`);
        }
      } catch (error) {
        console.error(`[getOrderStatus] Error fetching customer from quote ${quoteNo}:`, error);
        // Continue without customer info
      }
    } else {
      console.log(`[getOrderStatus] No quote number extracted, skipping customer lookup`);
    }
    
    return {
      status: order.status,
      customer,
    };
  } catch (error) {
    console.error('[getOrderStatus] Error fetching order status:', error);
    throw error;
  }
}

