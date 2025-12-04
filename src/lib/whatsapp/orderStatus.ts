import { getBarronOAuthConfig, getAccessToken } from './barronAuth';

interface Order {
  orderId: string;
  customerReference: string;
  status: string;
  orderDate: string;
  isDelivery: boolean;
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
 * Get order status by invoice number
 * Returns the order status or null if not found
 */
export async function getOrderStatus(invoiceNumber: string): Promise<string | null> {
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
    
    return order.status;
  } catch (error) {
    console.error('Error fetching order status:', error);
    throw error;
  }
}

