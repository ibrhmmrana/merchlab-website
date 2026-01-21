import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/vapi/auth';
import { successResponse, errorResponse } from '@/lib/vapi/response';
import { getCustomerAccountInfo } from '@/lib/whatsapp/customerAccount';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/vapi/get-customer-account-info
 * Get customer account information by identifier (phone, email, name, or quote/invoice number)
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
    const { caller_phone, identifier } = body;

    // Validate caller_phone
    if (!caller_phone || typeof caller_phone !== 'string') {
      return NextResponse.json(
        errorResponse(
          'Caller phone number is required',
          'Please ensure your phone number is available'
        ),
        { status: 400 }
      );
    }

    // Use identifier if provided, otherwise use caller_phone
    const searchIdentifier = (identifier && identifier.trim() !== '') ? identifier.trim() : caller_phone;

    // Get customer account information
    const accountInfo = await getCustomerAccountInfo(searchIdentifier);

    if (!accountInfo) {
      return NextResponse.json(
        errorResponse(
          'No account information found',
          'Please verify your phone number or contact support'
        ),
        { status: 404 }
      );
    }

    // Build spoken summary
    const formattedTotal = new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(accountInfo.totalOrderValue);

    const lastOrderDate = accountInfo.lastOrderDate
      ? new Date(accountInfo.lastOrderDate).toLocaleDateString('en-ZA', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'No orders yet';

    let spoken_summary = `You have ${accountInfo.orderCount} order${accountInfo.orderCount !== 1 ? 's' : ''} with a total value of ${formattedTotal}`;
    if (accountInfo.lastOrderDate) {
      spoken_summary += `. Your most recent order was on ${lastOrderDate}`;
    }
    spoken_summary += `. You have ${accountInfo.quotes.length} active quote${accountInfo.quotes.length !== 1 ? 's' : ''} and ${accountInfo.invoices.length} completed invoice${accountInfo.invoices.length !== 1 ? 's' : ''}.`;

    // Build response data
    const responseData = {
      customer: accountInfo.customer,
      order_count: accountInfo.orderCount,
      total_order_value: accountInfo.totalOrderValue,
      last_order_date: accountInfo.lastOrderDate,
      quotes: accountInfo.quotes,
      invoices: accountInfo.invoices,
    };

    return NextResponse.json(successResponse(responseData, spoken_summary));
  } catch (error) {
    console.error('Error in get-customer-account-info:', error);
    return NextResponse.json(
      errorResponse(
        'An error occurred while retrieving your account information',
        'Please try again or contact support'
      ),
      { status: 500 }
    );
  }
}
