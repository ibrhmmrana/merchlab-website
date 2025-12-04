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
  if (Array.isArray(data) && data.length > 0 && data[0].results) {
    return data[0].results.map((order: any) => ({
      orderId: order.orderId,
      customerReference: order.customerReference,
      status: order.status,
      orderDate: order.orderDate,
      isDelivery: order.isDelivery,
    }));
  }
  
  // Try alternative structure
  if (data && typeof data === 'object' && !Array.isArray(data) && data.results) {
    return data.results.map((order: any) => ({
      orderId: order.orderId,
      customerReference: order.customerReference,
      status: order.status,
      orderDate: order.orderDate,
      isDelivery: order.isDelivery,
    }));
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

