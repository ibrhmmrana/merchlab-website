import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/vapi/auth';
import { successResponse, errorResponse } from '@/lib/vapi/response';
import { getOrderDetails } from '@/lib/whatsapp/orderDetails';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/vapi/get-order-details
 * Get detailed order items by invoice number
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

    // Get order details
    const orderDetails = await getOrderDetails(invoice_number);

    if (!orderDetails) {
      return NextResponse.json(
        errorResponse(
          'Order details not found for that invoice number',
          'Please verify the invoice number and try again'
        ),
        { status: 404 }
      );
    }

    // Build spoken summary
    const itemCount = orderDetails.items.length;
    let spoken_summary = `Your order contains ${itemCount} item${itemCount !== 1 ? 's' : ''}`;
    
    if (itemCount > 0) {
      // Summarize first few items
      const itemsToMention = Math.min(3, itemCount);
      const itemDescriptions: string[] = [];
      
      for (let i = 0; i < itemsToMention; i++) {
        const item = orderDetails.items[i];
        let desc = `${item.quantity} ${item.description}`;
        if (item.colour) desc += ` in ${item.colour}`;
        if (item.size) desc += `, ${item.size} size`;
        itemDescriptions.push(desc);
      }
      
      if (itemDescriptions.length > 0) {
        spoken_summary += `: ${itemDescriptions.join(', ')}`;
        if (itemCount > itemsToMention) {
          spoken_summary += `, and ${itemCount - itemsToMention} more item${itemCount - itemsToMention !== 1 ? 's' : ''}`;
        }
      }
      spoken_summary += '.';
    } else {
      spoken_summary += '.';
    }
    
    spoken_summary += ' Would you like me to send the full itemized list to your WhatsApp?';

    // Build response data
    const responseData = {
      invoice_number: orderDetails.invoiceNumber,
      quote_number: orderDetails.quoteNumber,
      items: orderDetails.items,
      customer: orderDetails.customer,
    };

    return NextResponse.json(successResponse(responseData, spoken_summary));
  } catch (error) {
    console.error('Error in get-order-details:', error);
    return NextResponse.json(
      errorResponse(
        'An error occurred while retrieving your order details',
        'Please try again or contact support'
      ),
      { status: 500 }
    );
  }
}
