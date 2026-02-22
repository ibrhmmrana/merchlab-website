import { NextRequest, NextResponse } from 'next/server';
import { isAuthed, noIndexHeaders } from '@/lib/adminAuth';
import { getAccessToken, getBarronOAuthConfig } from '@/lib/whatsapp/barronAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { sendFlaggedOrderEmail } from '@/lib/gmail/sender';

export const runtime = 'nodejs';

function formatOrderId(id: string): string {
  const trimmed = String(id || '').trim();
  if (trimmed.startsWith('BAR-SO')) return trimmed;
  if (trimmed.startsWith('SO')) return `BAR-${trimmed}`;
  return `BAR-SO${trimmed}`;
}

// Fetch all orders from Barron API (handles pagination)
async function fetchAllOrders(): Promise<Array<{
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
  
  // Step 1: Fetch page 1 to get total_pages
  const firstPageResponse = await fetch(`${config.ordersApiUrl}?page=1`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!firstPageResponse.ok) {
    const errorText = await firstPageResponse.text();
    throw new Error(`Failed to fetch orders: ${firstPageResponse.status} ${errorText}`);
  }

  const firstPageData = await firstPageResponse.json();
  
  // Extract total_pages from response
  let totalPages = 1;
  let allOrders: any[] = [];
  
  // Handle different response structures
  if (Array.isArray(firstPageData) && firstPageData.length > 0) {
    const firstItem = firstPageData[0] as any;
    if (firstItem.total_pages !== undefined) {
      totalPages = Number(firstItem.total_pages) || 1;
    }
    if (firstItem.results && Array.isArray(firstItem.results)) {
      allOrders = [...firstItem.results];
    }
  } else if (firstPageData && typeof firstPageData === 'object' && !Array.isArray(firstPageData)) {
    const dataObj = firstPageData as any;
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
    remainingPagesResults.forEach((pageOrders, index) => {
      allOrders = [...allOrders, ...pageOrders];
    });
  }
  
  console.log(`Total orders fetched across all pages: ${allOrders.length}`);
  return allOrders;
}

// Get delivery status for a specific order ID
async function getDeliveryStageForOrder(orderId: string, accessToken: string): Promise<{ stage: string | null; isDelivered: boolean; statusDate: string }> {
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
        return { stage: null, isDelivered: false, statusDate: '' };
      }
      // For other errors, return null (we'll use order status as fallback)
      return { stage: null, isDelivered: false, statusDate: '' };
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
      return { stage: null, isDelivered: false, statusDate: '' };
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
      return { stage: 'Delivered', isDelivered: true, statusDate: '' };
    }

    // Get all events and find the latest one
    const allEvents = waybills.flatMap((waybill: any) => waybill.events || []);
    
    if (allEvents.length === 0) {
      return { stage: null, isDelivered: false, statusDate: '' };
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
    
    return { stage: stage || null, isDelivered: false, statusDate: latestEvent.datetime };
  } catch (error) {
    console.error(`Error fetching delivery stage for order ${orderId}:`, error);
    return { stage: null, isDelivered: false, statusDate: '' };
  }
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
  if (!(await isAuthed())) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: noIndexHeaders() }
    );
  }

  try {
    // Step 1: Get all orders from salesorders endpoint (single call)
    console.log('Step 1: Fetching all orders from salesorders endpoint...');
    const orders = await fetchAllOrders();
    console.log(`Found ${orders.length} orders`);
    
    if (orders.length === 0) {
      return NextResponse.json(
        {
          statusCounts: [],
          ordersByStatus: {},
        },
        { headers: noIndexHeaders() }
      );
    }

    // Step 2: Extract all order IDs (BAR-SO format) and get access token
    const accessToken = await getAccessToken();
    
    // Format order IDs to BAR-SO format
    const orderIdMap = new Map<string, typeof orders[0]>();
    orders.forEach(order => {
      const id = order.orderId || '';
      let formattedId = String(id).trim();
      if (formattedId.startsWith('BAR-SO')) {
        formattedId = formattedId;
      } else if (formattedId.startsWith('SO')) {
        formattedId = `BAR-${formattedId}`;
      } else {
        formattedId = `BAR-SO${formattedId}`;
      }
      orderIdMap.set(formattedId, order);
    });
    
    const orderIds = Array.from(orderIdMap.keys());
    console.log(`Step 2: Extracted ${orderIds.length} order IDs (BAR-SO format)`);
    
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

    // Step 3: Fetch delivery statuses for all order IDs (in batches)
    console.log('Step 3: Fetching delivery statuses for all orders...');
    const batchSize = 10;
    for (let i = 0; i < orderIds.length; i += batchSize) {
      const batch = orderIds.slice(i, i + batchSize);
      const stagePromises = batch.map(async (orderId) => {
        const order = orderIdMap.get(orderId);
        if (!order) return null;
        
        const deliveryStage = await getDeliveryStageForOrder(orderId, accessToken);
        return {
          order,
          deliveryStage: deliveryStage.stage,
          isDelivered: deliveryStage.isDelivered,
          statusDate: deliveryStage.statusDate,
        };
      });
      
      const results = await Promise.all(stagePromises);
      const validResults = results.filter((r): r is NonNullable<typeof r> => r !== null);
      
      // Group orders by delivery stage
      validResults.forEach(({ order, deliveryStage, isDelivered, statusDate }) => {
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

    console.log(`Processed ${orders.length} orders, grouped into ${Object.keys(statusCounts).length} status categories`);

    // Notify staff for flagged (stuck) orders – at most once per order per day
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC
    const stuckOrders: Array<{ formattedOrderId: string; order: any; displayStage: string; statusDate: string }> = [];
    for (const [, data] of Object.entries(statusCounts)) {
      for (const o of data.orders) {
        if (o.isStuck) {
          stuckOrders.push({
            formattedOrderId: formatOrderId(o.orderId),
            order: o,
            displayStage: o.deliveryStage,
            statusDate: o.statusDate || o.orderDate || '',
          });
        }
      }
    }
    if (stuckOrders.length > 0) {
      try {
        const supabase = getSupabaseAdmin();
        const { data: alreadyNotified } = await supabase
          .from('flagged_order_notification_log')
          .select('order_id')
          .eq('notified_date', today);
        const notifiedSet = new Set((alreadyNotified || []).map((r: { order_id: string }) => r.order_id));
        for (const { formattedOrderId, order, displayStage, statusDate } of stuckOrders) {
          if (notifiedSet.has(formattedOrderId)) continue;
          await sendFlaggedOrderEmail({
            orderId: formattedOrderId,
            stage: displayStage,
            statusDate,
            customerReference: order.customerReference,
            orderDate: order.orderDate,
          });
          await supabase.from('flagged_order_notification_log').insert({
            order_id: formattedOrderId,
            notified_date: today,
          });
          notifiedSet.add(formattedOrderId);
        }
      } catch (notifyError) {
        console.error('Error sending flagged order notifications:', notifyError);
        // Do not fail the request – status counts still return
      }
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

