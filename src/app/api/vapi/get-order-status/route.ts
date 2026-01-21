import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/vapi/auth';
import { successResponse, errorResponse } from '@/lib/vapi/response';
import { getOrderStatus } from '@/lib/whatsapp/orderStatus';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/vapi/get-order-status
 * Get order status by invoice number
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const authError = requireAuth(request);
    if (authError) {
      return authError;
    }

    // Parse request body with better error handling
    // Read raw text first so we can log it if parsing fails
    const rawText = await request.text();
    let body: { caller_phone?: string; invoice_number?: string };
    
    try {
      body = JSON.parse(rawText);
    } catch (jsonError) {
      console.error('JSON parsing error:', jsonError);
      console.error('Raw request body received:', rawText);
      console.error('Raw body length:', rawText.length);
      console.error('Raw body first 100 chars:', rawText.substring(0, 100));
      return NextResponse.json(
        errorResponse(
          'Invalid JSON in request body',
          'Please ensure the request body is valid JSON'
        ),
        { status: 400 }
      );
    }
    
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

    // Get order status
    console.log(`[get-order-status] Looking up invoice: ${invoice_number}`);
    const orderInfo = await getOrderStatus(invoice_number);

    if (!orderInfo) {
      console.log(`[get-order-status] Order not found for invoice: ${invoice_number}`);
      return NextResponse.json(
        errorResponse(
          'Order not found for that invoice number',
          'Please verify the invoice number and try again'
        ),
        { status: 404 }
      );
    }

    console.log(`[get-order-status] Order found - Status: ${orderInfo.status}, Customer: ${orderInfo.customer ? JSON.stringify(orderInfo.customer) : 'null'}`);

    // Build spoken summary
    let spoken_summary = `Your order with invoice ${invoice_number} is currently ${orderInfo.status}`;
    if (orderInfo.customer?.name) {
      spoken_summary += `. I can see it's for ${orderInfo.customer.name}`;
      if (orderInfo.customer.company && orderInfo.customer.company !== '-') {
        spoken_summary += ` from ${orderInfo.customer.company}`;
      }
      spoken_summary += '.';
    } else {
      spoken_summary += '.';
    }

    // Build response data
    const responseData = {
      invoice_number,
      status: orderInfo.status,
      customer: orderInfo.customer || null,
    };

    return NextResponse.json(successResponse(responseData, spoken_summary));
  } catch (error) {
    console.error('Error in get-order-status:', error);
    return NextResponse.json(
      errorResponse(
        'An error occurred while checking your order status',
        'Please try again or contact support'
      ),
      { status: 500 }
    );
  }
}
