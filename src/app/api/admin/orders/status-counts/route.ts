import { NextRequest, NextResponse } from 'next/server';
import { isAuthed, noIndexHeaders } from '@/lib/adminAuth';
import { getAccessToken, getBarronOAuthConfig } from '@/lib/whatsapp/barronAuth';

export const runtime = 'nodejs';

// Fetch orders from Barron API
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
    return data[0].results;
  }
  
  // Try alternative structure - maybe it's a direct object with results
  if (data && typeof data === 'object' && !Array.isArray(data) && data.results) {
    return data.results;
  }
  
  return [];
}

// Map delivery event description to our display stage names
function mapEventToStage(description: string): string | null {
  const descLower = description.toLowerCase();
  
  if (descLower.includes('scan at in-house')) {
    return 'Accepted into network';
  }
  if (descLower.includes('created waybill')) {
    return 'Tracking created';
  }
  if (descLower.includes('scan into branch')) {
    return 'Received at origin branch';
  }
  if (descLower.includes('in-house-veh scan')) {
    return 'Loaded onto vehicle';
  }
  if (descLower.includes('out on line haul')) {
    return 'Line haul in transit';
  }
  if (descLower.includes('received in branch')) {
    return 'Arrived at branch (hub)';
  }
  if (descLower.includes('out on delivery')) {
    return 'Out for delivery';
  }
  if (descLower.includes('delivered')) {
    return 'Delivered';
  }
  
  return null;
}

// Get the latest delivery stage from delivery status events
async function getDeliveryStage(orderId: string, accessToken: string): Promise<{ stage: string | null; isDelivered: boolean; orderDate: string }> {
  try {
    // Format orderId: if it doesn't start with BAR-SO, prepend it
    let formattedOrderId = orderId.trim();
    if (formattedOrderId.startsWith('BAR-SO')) {
      // Already formatted
    } else if (formattedOrderId.startsWith('SO')) {
      formattedOrderId = `BAR-${formattedOrderId}`;
    } else {
      formattedOrderId = `BAR-SO${formattedOrderId}`;
    }

    const deliveryStatusUrl = `https://integration.barron.com/orders/delivery-statuses/${formattedOrderId}`;
    
    const response = await fetch(deliveryStatusUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // If 404, order doesn't have delivery tracking yet
      if (response.status === 404) {
        return { stage: null, isDelivered: false, orderDate: '' };
      }
      // For other errors, return null (we'll use order status as fallback)
      return { stage: null, isDelivered: false, orderDate: '' };
    }

    const data = await response.json();
    
    // Normalize data to always be an array
    let waybills: any[] = [];
    if (Array.isArray(data)) {
      waybills = data;
    } else if (data && typeof data === 'object') {
      waybills = [data];
    }

    if (waybills.length === 0) {
      return { stage: null, isDelivered: false, orderDate: '' };
    }

    // Check if delivered (has "Delivered" event or podDetails)
    const hasDeliveredEvent = waybills.some(waybill => 
      waybill.events && Array.isArray(waybill.events) && 
      waybill.events.some((event: any) => 
        event.description && event.description.toLowerCase().includes('delivered')
      )
    );
    const hasPodDetails = waybills.some(waybill => 
      waybill.podDetails && Array.isArray(waybill.podDetails) && waybill.podDetails.length > 0
    );
    const isDelivered = hasDeliveredEvent || hasPodDetails;

    if (isDelivered) {
      return { stage: 'Delivered', isDelivered: true, orderDate: '' };
    }

    // Get all events and find the latest one
    const allEvents = waybills.flatMap((waybill: any) => waybill.events || []);
    
    if (allEvents.length === 0) {
      return { stage: null, isDelivered: false, orderDate: '' };
    }

    // Sort events by datetime (newest first)
    const parseDate = (dateStr: string) => {
      const [datePart, timePart] = dateStr.split(' ');
      const [day, month, year] = datePart.split('/');
      return new Date(`${year}-${month}-${day} ${timePart}`);
    };

    const sortedEvents = [...allEvents].sort((a: any, b: any) => {
      const dateA = parseDate(a.datetime);
      const dateB = parseDate(b.datetime);
      return dateB.getTime() - dateA.getTime();
    });

    const latestEvent = sortedEvents[0];
    const stage = mapEventToStage(latestEvent.description);
    
    return { stage: stage || null, isDelivered: false, orderDate: latestEvent.datetime };
  } catch (error) {
    console.error(`Error fetching delivery stage for order ${orderId}:`, error);
    return { stage: null, isDelivered: false, orderDate: '' };
  }
}

// Check if order has been in status for more than 3 days
function isOrderStuck(statusDate: string): boolean {
  if (!statusDate) return false;
  
  let statusDateTime: Date;
  
  // Check if date is in format "DD/MM/YYYY HH:mm:ss" (from delivery events)
  if (statusDate.includes('/')) {
    const [datePart, timePart] = statusDate.split(' ');
    if (datePart && timePart) {
      const [day, month, year] = datePart.split('/');
      statusDateTime = new Date(`${year}-${month}-${day} ${timePart}`);
    } else {
      // If no time part, just parse the date
      const [day, month, year] = datePart.split('/');
      statusDateTime = new Date(`${year}-${month}-${day}`);
    }
  } else {
    // Assume it's in ISO format "YYYY-MM-DD" (from order.orderDate)
    statusDateTime = new Date(statusDate);
  }
  
  // Check if date is valid
  if (isNaN(statusDateTime.getTime())) {
    console.warn('Invalid date format:', statusDate);
    return false;
  }
  
  const now = new Date();
  const daysDiff = (now.getTime() - statusDateTime.getTime()) / (1000 * 60 * 60 * 24);
  
  // Debug logging
  if (daysDiff > 3) {
    console.log(`Order stuck: ${daysDiff.toFixed(1)} days since ${statusDate}`);
  }
  
  return daysDiff > 3;
}

export async function GET(request: NextRequest) {
  if (!isAuthed(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: noIndexHeaders() }
    );
  }

  try {
    const orders = await fetchOrdersFromBarron();
    const accessToken = await getAccessToken();
    
    // Initialize status counts with new stage names
    const statusCounts: Record<string, { count: number; orders: any[]; hasStuckOrders: boolean }> = {
      'Accepted into network': { count: 0, orders: [], hasStuckOrders: false },
      'Tracking created': { count: 0, orders: [], hasStuckOrders: false },
      'Received at origin branch': { count: 0, orders: [], hasStuckOrders: false },
      'Loaded onto vehicle': { count: 0, orders: [], hasStuckOrders: false },
      'Line haul in transit': { count: 0, orders: [], hasStuckOrders: false },
      'Arrived at branch (hub)': { count: 0, orders: [], hasStuckOrders: false },
      'Out for delivery': { count: 0, orders: [], hasStuckOrders: false },
      'Delivered': { count: 0, orders: [], hasStuckOrders: false },
    };

    // Fetch delivery stages for all orders (in batches to avoid overwhelming the API)
    const batchSize = 10;
    for (let i = 0; i < orders.length; i += batchSize) {
      const batch = orders.slice(i, i + batchSize);
      const stagePromises = batch.map(async (order) => {
        const deliveryStage = await getDeliveryStage(order.orderId, accessToken);
        return {
          order,
          deliveryStage: deliveryStage.stage,
          isDelivered: deliveryStage.isDelivered,
          statusDate: deliveryStage.orderDate,
        };
      });
      
      const results = await Promise.all(stagePromises);
      
      // Group orders by delivery stage
      results.forEach(({ order, deliveryStage, isDelivered, statusDate }) => {
        // Use delivery stage if available, otherwise fall back to order status
        let displayStage = deliveryStage;
        let finalStatusDate = statusDate;
        
        if (!displayStage) {
          // Fallback: map order status to delivery stages if no delivery tracking
          const statusLower = order.status.toLowerCase();
          if (statusLower.includes('order received') || statusLower === 'pending' || statusLower === 'placing') {
            displayStage = 'Accepted into network';
          } else if (statusLower.includes('confirmed')) {
            displayStage = 'Tracking created';
          } else if (statusLower.includes('production') || statusLower.includes('picking') || statusLower.includes('packing')) {
            displayStage = 'Loaded onto vehicle';
          } else if (statusLower.includes('ready for collection') || statusLower.includes('ready for delivery')) {
            displayStage = 'Out for delivery';
          } else if (statusLower.includes('transit')) {
            displayStage = 'Line haul in transit';
          } else if (statusLower.includes('delivered') || statusLower.includes('collected')) {
            displayStage = 'Delivered';
          }
          // For fallback stages, use order date as status date (since we don't have delivery tracking)
          if (!finalStatusDate) {
            finalStatusDate = order.orderDate;
          }
        }
        
        if (displayStage && statusCounts[displayStage]) {
          // Don't show caution for Delivered stage
          // Only check if stuck if we have a valid statusDate and it's not Delivered
          const hasValidStatusDate = finalStatusDate && finalStatusDate.trim() !== '';
          const isStuck = displayStage !== 'Delivered' && hasValidStatusDate ? isOrderStuck(finalStatusDate) : false;
          
          // Debug logging for stuck orders
          if (isStuck) {
            const daysInStatus = Math.floor((new Date().getTime() - (() => {
              if (finalStatusDate.includes('/')) {
                const [datePart, timePart] = finalStatusDate.split(' ');
                const [day, month, year] = datePart.split('/');
                return new Date(`${year}-${month}-${day} ${timePart || '00:00:00'}`).getTime();
              }
              return new Date(finalStatusDate).getTime();
            })()) / (1000 * 60 * 60 * 24));
            console.log(`[STUCK] Order ${order.orderId} is stuck in "${displayStage}" since ${finalStatusDate} (${daysInStatus} days)`);
          }
          
          // Debug logging for orders that should be stuck but aren't
          if (displayStage !== 'Delivered' && hasValidStatusDate && !isStuck) {
            const daysInStatus = Math.floor((new Date().getTime() - (() => {
              if (finalStatusDate.includes('/')) {
                const [datePart, timePart] = finalStatusDate.split(' ');
                const [day, month, year] = datePart.split('/');
                return new Date(`${year}-${month}-${day} ${timePart || '00:00:00'}`).getTime();
              }
              return new Date(finalStatusDate).getTime();
            })()) / (1000 * 60 * 60 * 24));
            if (daysInStatus > 3) {
              console.warn(`[WARNING] Order ${order.orderId} should be stuck but isn't: ${daysInStatus} days in "${displayStage}" since ${finalStatusDate}`);
            }
          }
          
          statusCounts[displayStage].count++;
          statusCounts[displayStage].orders.push({
            ...order,
            deliveryStage: displayStage,
            isStuck,
            statusDate: finalStatusDate || order.orderDate,
          });
          if (isStuck) {
            statusCounts[displayStage].hasStuckOrders = true;
          }
        }
      });
    }

    return NextResponse.json(
      {
        statusCounts: Object.entries(statusCounts).map(([status, data]) => ({
          status,
          count: data.count,
          hasStuckOrders: data.hasStuckOrders,
        })),
        ordersByStatus: Object.fromEntries(
          Object.entries(statusCounts).map(([status, data]) => [status, data.orders])
        ),
      },
      { headers: noIndexHeaders() }
    );
  } catch (error) {
    console.error('Error fetching order status counts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { 
        error: errorMessage,
        statusCounts: [],
        ordersByStatus: {},
      },
      { status: 500, headers: noIndexHeaders() }
    );
  }
}

