import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/vapi/auth';
import { successResponse, errorResponse } from '@/lib/vapi/response';
import { getDeliveryInfo } from '@/lib/whatsapp/orderDetails';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/vapi/get-delivery-info
 * Get delivery information by invoice number
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const authError = requireAuth(request);
    if (authError) {
      return authError;
    }

    // Parse request body
    const body = await request.json();
    const { caller_phone, invoice_number } = body;

    // Validate required fields
    if (!invoice_number || typeof invoice_number !== 'string') {
      return NextResponse.json(
        errorResponse(
          'Invoice number is required',
          'Please provide your invoice number'
        ),
        { status: 400 }
      );
    }

    // Get delivery information
    const deliveryInfo = await getDeliveryInfo(invoice_number);

    if (!deliveryInfo) {
      return NextResponse.json(
        errorResponse(
          'Delivery information not found for that invoice number',
          'Please verify the invoice number and try again'
        ),
        { status: 404 }
      );
    }

    // Build spoken summary
    let spoken_summary = '';
    
    if (deliveryInfo.isDelivered) {
      if (deliveryInfo.podDetails && deliveryInfo.podDetails.length > 0) {
        const pod = deliveryInfo.podDetails[0];
        spoken_summary = `Great news! Your order has been delivered on ${pod.podDate} at ${pod.podTime}.`;
        if (pod.name) {
          spoken_summary += ` It was signed for by ${pod.name}.`;
        }
      } else {
        spoken_summary = `Great news! Your order has been delivered.`;
      }
    } else if (deliveryInfo.latestEvent) {
      const event = deliveryInfo.latestEvent;
      spoken_summary = `Your order's latest status is: ${event.description}`;
      if (event.branch) {
        spoken_summary += ` at ${event.branch}`;
      }
      if (event.datetime) {
        spoken_summary += ` on ${event.datetime}`;
      }
    } else if (deliveryInfo.isDelivery && deliveryInfo.deliveryAddress) {
      const addr = deliveryInfo.deliveryAddress;
      const addressParts: string[] = [];
      if (addr.street) addressParts.push(addr.street);
      if (addr.suburb) addressParts.push(addr.suburb);
      if (addr.city) addressParts.push(addr.city);
      if (addr.province) addressParts.push(addr.province);
      if (addr.postal_code) addressParts.push(addr.postal_code);
      
      spoken_summary = `Your order is set for delivery to ${addressParts.join(', ')}.`;
    } else {
      spoken_summary = "Your order is set for collection from our warehouse. You'll receive collection details via email.";
    }

    // Build response data
    const responseData = {
      invoice_number: deliveryInfo.invoiceNumber,
      is_delivery: deliveryInfo.isDelivery,
      delivery_address: deliveryInfo.deliveryAddress,
      customer: deliveryInfo.customer,
      waybill_number: deliveryInfo.waybillNumber,
      delivery_events: deliveryInfo.deliveryEvents,
      pod_details: deliveryInfo.podDetails,
      is_delivered: deliveryInfo.isDelivered,
      latest_event: deliveryInfo.latestEvent,
      order_id: deliveryInfo.orderId,
    };

    return NextResponse.json(successResponse(responseData, spoken_summary));
  } catch (error) {
    console.error('Error in get-delivery-info:', error);
    return NextResponse.json(
      errorResponse(
        'An error occurred while retrieving your delivery information',
        'Please try again or contact support'
      ),
      { status: 500 }
    );
  }
}
