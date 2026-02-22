import { NextRequest, NextResponse } from 'next/server';
import { isAuthed, noIndexHeaders } from '@/lib/adminAuth';
import { getAccessToken } from '@/lib/whatsapp/barronAuth';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  if (!(await isAuthed())) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: noIndexHeaders() }
    );
  }

  try {
    const { orderId } = await params;
    
    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400, headers: noIndexHeaders() }
      );
    }

    // Format orderId: if it doesn't start with BAR-SO, prepend it
    // Remove any existing BAR-SO prefix first to avoid duplication
    let formattedOrderId = orderId.trim();
    if (formattedOrderId.startsWith('BAR-SO')) {
      // Already formatted
    } else if (formattedOrderId.startsWith('SO')) {
      // If it starts with SO, prepend BAR-
      formattedOrderId = `BAR-${formattedOrderId}`;
    } else {
      // Otherwise, prepend BAR-SO
      formattedOrderId = `BAR-SO${formattedOrderId}`;
    }

    // Get access token
    const accessToken = await getAccessToken();

    // Fetch delivery status from Barron API
    const deliveryStatusUrl = `https://integration.barron.com/orders/delivery-statuses/${formattedOrderId}`;
    
    const response = await fetch(deliveryStatusUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // If 404, return empty array (order might not have delivery status yet)
      if (response.status === 404) {
        return NextResponse.json(
          { deliveryStatus: null, podDetails: [] },
          { headers: noIndexHeaders() }
        );
      }
      
      const errorText = await response.text();
      console.error('Delivery status API error:', response.status, errorText);
      throw new Error(`Failed to fetch delivery status: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    // Normalize data to always be an array
    // The API can return either an array or a single object
    let waybills: any[] = [];
    if (Array.isArray(data)) {
      waybills = data;
    } else if (data && typeof data === 'object') {
      // Single object response - wrap it in an array
      waybills = [data];
    } else {
      // Unexpected format
      console.error('Delivery status API returned unexpected response format:', typeof data, data);
      return NextResponse.json(
        {
          deliveryStatus: null,
          podDetails: [],
          waybills: [],
        },
        { headers: noIndexHeaders() }
      );
    }

    // If no data returned, order might not have delivery tracking yet
    if (waybills.length === 0) {
      return NextResponse.json(
        {
          deliveryStatus: null,
          podDetails: [],
          waybills: [],
        },
        { headers: noIndexHeaders() }
      );
    }

    // Get all podDetails from all waybills
    const allPodDetails = waybills.flatMap((item: any) => 
      (item.podDetails && Array.isArray(item.podDetails)) ? item.podDetails : []
    );

    // Check if POD exists - if so, status is "Delivered"
    const isDelivered = allPodDetails.length > 0;

    // Get the latest event description from all waybills
    // Collect all events and find the most recent one
    const allEvents = waybills.flatMap((waybill: any) => 
      (waybill.events && Array.isArray(waybill.events)) ? waybill.events : []
    );

    let latestEventDescription = null;
    if (allEvents.length > 0) {
      // Parse datetime strings in format "DD/MM/YYYY HH:mm:ss" and sort by newest first
      const parseDate = (dateStr: string) => {
        const [datePart, timePart] = dateStr.split(' ');
        const [day, month, year] = datePart.split('/');
        return new Date(`${year}-${month}-${day} ${timePart}`);
      };

      // Sort events by datetime (newest first) and get the latest one
      const sortedEvents = [...allEvents].sort((a: any, b: any) => {
        const dateA = parseDate(a.datetime);
        const dateB = parseDate(b.datetime);
        return dateB.getTime() - dateA.getTime();
      });

      latestEventDescription = sortedEvents[0].description;
    }

    // Determine delivery status: "Delivered" if POD exists, otherwise latest event description
    const deliveryStatus = isDelivered 
      ? 'Delivered' 
      : (latestEventDescription || 'N/A');

    return NextResponse.json(
      {
        deliveryStatus: deliveryStatus,
        podDetails: allPodDetails,
        waybills: waybills,
      },
      { headers: noIndexHeaders() }
    );
  } catch (error) {
    console.error('Error fetching delivery status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { 
        error: errorMessage,
        deliveryStatus: null,
        podDetails: [],
      },
      { status: 500, headers: noIndexHeaders() }
    );
  }
}

