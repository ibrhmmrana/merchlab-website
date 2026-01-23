import { getBarronOAuthConfig, getAccessToken } from './barronAuth';
import { getSupabaseAdmin } from '../supabaseAdmin';

interface Order {
  orderId: string;
  customerReference: string;
  status: string;
  orderDate: string;
  isDelivery: boolean;
}

interface OrderItem {
  description: string;
  quantity: number;
  colour?: string;
  size?: string;
  price?: number;
  stock_id?: string;
  stock_code?: string;
}

export interface OrderDetails {
  invoiceNumber: string;
  quoteNumber: string;
  items: OrderItem[];
  customer: {
    name: string;
    company: string;
    email: string;
    phone: string;
  } | null;
}

export interface DeliveryEvent {
  description: string;
  branch: string;
  datetime: string;
}

export interface PODDetail {
  podDate: string;
  podTime: string;
  name: string;
  podComments: string;
  podFileAttached: boolean;
}

export interface DeliveryStatusResponse {
  waybillNumber: string;
  events: DeliveryEvent[];
  podDetails: PODDetail[];
}

export interface DeliveryInfo {
  invoiceNumber: string;
  isDelivery: boolean;
  deliveryAddress: {
    street?: string;
    suburb?: string;
    city?: string;
    province?: string;
    postal_code?: string;
    country?: string;
  } | null;
  customer: {
    name: string;
    company: string;
    email: string;
    phone: string;
  } | null;
  // New delivery tracking fields
  waybillNumber?: string;
  deliveryEvents?: DeliveryEvent[];
  podDetails?: PODDetail[];
  isDelivered?: boolean;
  latestEvent?: DeliveryEvent;
  orderId?: string;
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

// Extract customer reference from invoice number
function extractCustomerReference(invoiceNumber: string): string {
  // Remove 'INV-' prefix if present
  if (invoiceNumber.toUpperCase().startsWith('INV-')) {
    return invoiceNumber.substring(4);
  }
  return invoiceNumber;
}

// Extract quote number from customerReference
function extractQuoteNumber(customerReference: string): string | null {
  if (!customerReference) return null;

  // Remove leading/trailing whitespace and special characters
  const cleaned = customerReference.trim().replace(/^[\s*:]+|[\s*:]+$/g, '');

  // Pattern 1: Q###-XXXXX or Q#########-XXXXX
  if (cleaned.startsWith('Q')) {
    const match = cleaned.match(/^(Q\d+[-]\w+)/);
    if (match) {
      return match[1];
    }
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
    const match2 = cleaned.match(/^(ML-[A-Z0-9]+)/);
    if (match2) {
      return match2[1];
    }
  }

  return null;
}

// Extract customer details from payload
function extractCustomerFromPayload(payload: unknown): {
  name: string;
  company: string;
  email: string;
  phone: string;
} | null {
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

// Extract delivery address from payload
function extractDeliveryAddress(payload: unknown): {
  street?: string;
  suburb?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  country?: string;
} | null {
  const p = parsePayload(payload);
  if (!p) {
    return null;
  }

  const shippingAddress = p.shipping_address as Record<string, unknown> | undefined;
  if (!shippingAddress || typeof shippingAddress !== 'object') {
    return null;
  }

  return {
    street: pickStr(shippingAddress, ['street', 'streetAddress', 'address']),
    suburb: pickStr(shippingAddress, ['suburb', 'suburbName']),
    city: pickStr(shippingAddress, ['city']),
    province: pickStr(shippingAddress, ['province', 'state']),
    postal_code: pickStr(shippingAddress, ['postal_code', 'postalCode', 'postcode']),
    country: pickStr(shippingAddress, ['country']),
  };
}

// Extract items from quote payload
function extractItemsFromPayload(payload: unknown): OrderItem[] {
  const p = parsePayload(payload);
  if (!p) {
    return [];
  }

  const items = p.items;
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item: unknown) => {
    if (typeof item !== 'object' || item === null) {
      return {
        description: 'Unknown item',
        quantity: 0,
      };
    }

    const itemObj = item as Record<string, unknown>;
    return {
      description: pickStr(itemObj, ['description', 'productName', 'name'], 'Unknown item'),
      quantity: typeof itemObj.quantity === 'number' ? itemObj.quantity : typeof itemObj.requested_qty === 'number' ? itemObj.requested_qty : 0,
      colour: pickStr(itemObj, ['colour', 'color', 'col']),
      size: pickStr(itemObj, ['size']),
      price: typeof itemObj.price === 'number' ? itemObj.price : undefined,
      stock_id: pickStr(itemObj, ['stock_id', 'stockId']),
      stock_code: pickStr(itemObj, ['stock_code', 'stockCode']),
    };
  });
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
 * Get order details (items) by invoice number
 * Fetches order from Barron API, matches with quote in Supabase to get items
 */
export async function getOrderDetails(invoiceNumber: string): Promise<OrderDetails | null> {
  try {
    const customerReference = extractCustomerReference(invoiceNumber);
    const orders = await fetchOrdersFromBarron();

    // Find order matching the customer reference
    const order = orders.find(
      (o) => o.customerReference === customerReference
    );

    if (!order) {
      return null;
    }

    // Extract quote number from customerReference
    const quoteNo = extractQuoteNumber(order.customerReference);
    if (!quoteNo) {
      return null;
    }

    // Get quote from Supabase to get items
    const supabase = getSupabaseAdmin();
    const { data: quoteData, error } = await supabase
      .from('quote_docs')
      .select('quote_no, payload')
      .eq('quote_no', quoteNo)
      .single();

    if (error || !quoteData) {
      // Try with different formats
      const variations = [
        quoteNo,
        quoteNo.toUpperCase(),
        quoteNo.toLowerCase(),
      ];

      for (const variation of variations) {
        const { data: altData } = await supabase
          .from('quote_docs')
          .select('quote_no, payload')
          .eq('quote_no', variation)
          .single();

        if (altData) {
          const items = extractItemsFromPayload(altData.payload);
          const customer = extractCustomerFromPayload(altData.payload);
          return {
            invoiceNumber,
            quoteNumber: altData.quote_no,
            items,
            customer,
          };
        }
      }

      return null;
    }

    const items = extractItemsFromPayload(quoteData.payload);
    const customer = extractCustomerFromPayload(quoteData.payload);

    return {
      invoiceNumber,
      quoteNumber: quoteData.quote_no,
      items,
      customer,
    };
  } catch (error) {
    console.error('Error fetching order details:', error);
    throw error;
  }
}

/**
 * Fetch delivery status from Barron API using order ID
 */
async function fetchDeliveryStatus(orderId: string): Promise<DeliveryStatusResponse[] | null> {
  try {
    const accessToken = await getAccessToken();
    
    // Format order ID to BAR-SO format if needed
    let formattedOrderId = orderId;
    if (!formattedOrderId.startsWith('BAR-SO')) {
      if (formattedOrderId.startsWith('SO')) {
        formattedOrderId = `BAR-${formattedOrderId}`;
      } else {
        formattedOrderId = `BAR-SO${formattedOrderId}`;
      }
    }

    const url = `https://integration.barron.com/orders/delivery-statuses/${formattedOrderId}`;
    console.log(`[getDeliveryInfo] Fetching delivery status from: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        // Order not found or no delivery status available
        console.log(`[getDeliveryInfo] No delivery status found for order: ${formattedOrderId}`);
        return null;
      }
      const errorText = await response.text();
      throw new Error(`Failed to fetch delivery status: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      return data as DeliveryStatusResponse[];
    }

    return null;
  } catch (error) {
    console.error('[getDeliveryInfo] Error fetching delivery status:', error);
    throw error;
  }
}

/**
 * Get delivery information by invoice number
 * Uses new Barron delivery-statuses endpoint to get real-time tracking information
 */
export async function getDeliveryInfo(invoiceNumber: string): Promise<DeliveryInfo | null> {
  try {
    const customerReference = extractCustomerReference(invoiceNumber);
    const orders = await fetchOrdersFromBarron();

    // Find order matching the customer reference
    const order = orders.find(
      (o) => o.customerReference === customerReference
    );

    if (!order) {
      return null;
    }

    // Extract quote number from customerReference
    const quoteNo = extractQuoteNumber(order.customerReference);
    
    // Get quote from Supabase to get delivery address
    const supabase = getSupabaseAdmin();
    let deliveryAddress: { street?: string; suburb?: string; city?: string; province?: string; postal_code?: string; country?: string; } | null = null;
    let customer: { name: string; company: string; email: string; phone: string; } | null = null;

    if (quoteNo) {
      const { data: quoteData, error } = await supabase
        .from('quote_docs')
        .select('payload')
        .eq('quote_no', quoteNo)
        .single();

      if (!error && quoteData) {
        deliveryAddress = extractDeliveryAddress(quoteData.payload);
        customer = extractCustomerFromPayload(quoteData.payload);
      } else {
        // Try with different formats
        const variations = [
          quoteNo,
          quoteNo.toUpperCase(),
          quoteNo.toLowerCase(),
        ];

        for (const variation of variations) {
          const { data: altData } = await supabase
            .from('quote_docs')
            .select('payload')
            .eq('quote_no', variation)
            .single();

          if (altData) {
            deliveryAddress = extractDeliveryAddress(altData.payload);
            customer = extractCustomerFromPayload(altData.payload);
            break;
          }
        }
      }
    }

    // If not found in quote, try invoice
    if (!deliveryAddress || !customer) {
      const cleanInvoiceNo = invoiceNumber.toUpperCase();
      const { data: invoiceData } = await supabase
        .from('invoice_docs')
        .select('payload')
        .eq('invoice_no', cleanInvoiceNo)
        .single();

      if (invoiceData) {
        if (!deliveryAddress) {
          deliveryAddress = extractDeliveryAddress(invoiceData.payload);
        }
        if (!customer) {
          customer = extractCustomerFromPayload(invoiceData.payload);
        }
      }
    }

    // Fetch delivery status from new endpoint
    let deliveryStatusData: DeliveryStatusResponse[] | null = null;
    let waybillNumber: string | undefined;
    let deliveryEvents: DeliveryEvent[] | undefined;
    let podDetails: PODDetail[] | undefined;
    let isDelivered = false;
    let latestEvent: DeliveryEvent | undefined;

    if (order.orderId) {
      try {
        deliveryStatusData = await fetchDeliveryStatus(order.orderId);
        
        if (deliveryStatusData && deliveryStatusData.length > 0) {
          // Get the first waybill (most recent)
          const firstWaybill = deliveryStatusData[0];
          waybillNumber = firstWaybill.waybillNumber;
          deliveryEvents = firstWaybill.events || [];
          podDetails = firstWaybill.podDetails || [];

          // Check if order is delivered (look for "Delivered" event)
          if (deliveryEvents.length > 0) {
            latestEvent = deliveryEvents[0]; // Events are typically in reverse chronological order
            isDelivered = deliveryEvents.some(event => 
              event.description.toLowerCase().includes('delivered')
            );
          }
        }
      } catch (error) {
        console.error('[getDeliveryInfo] Error fetching delivery status, continuing without tracking info:', error);
        // Continue without delivery status - don't fail the entire request
      }
    }

    return {
      invoiceNumber,
      isDelivery: order.isDelivery,
      deliveryAddress,
      customer,
      waybillNumber,
      deliveryEvents,
      podDetails,
      isDelivered,
      latestEvent,
      orderId: order.orderId,
    };
  } catch (error) {
    console.error('Error fetching delivery info:', error);
    throw error;
  }
}

