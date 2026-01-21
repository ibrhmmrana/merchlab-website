import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/vapi/auth';
import { successResponse, errorResponse } from '@/lib/vapi/response';
import { getQuoteInfo, getMostRecentQuoteByPhone } from '@/lib/whatsapp/quoteInfo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/vapi/get-quote-info
 * Get quote information by quote number or phone number
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
    const { caller_phone, quote_number } = body;

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

    // Get quote information
    let quoteInfo: Awaited<ReturnType<typeof getQuoteInfo>> | null = null;

    if (quote_number && quote_number.trim() !== '') {
      // Quote number provided - use it
      quoteInfo = await getQuoteInfo(quote_number.trim());
    } else {
      // No quote number - find most recent quote by phone
      quoteInfo = await getMostRecentQuoteByPhone(caller_phone);
    }

    if (!quoteInfo) {
      if (quote_number && quote_number.trim() !== '') {
        return NextResponse.json(
          errorResponse(
            'Quote not found for that quote number',
            'Please verify the quote number and try again'
          ),
          { status: 404 }
        );
      } else {
        return NextResponse.json(
          errorResponse(
            'No quote found for your phone number',
            'Please provide a specific quote number or contact support'
          ),
          { status: 404 }
        );
      }
    }

    // Build spoken summary
    const createdDate = quoteInfo.createdAt
      ? new Date(quoteInfo.createdAt).toLocaleDateString('en-ZA', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'recently';
    
    const formattedValue = quoteInfo.value !== null
      ? new Intl.NumberFormat('en-ZA', {
          style: 'currency',
          currency: 'ZAR',
        }).format(quoteInfo.value)
      : 'N/A';

    let spoken_summary = `I found your quote ${quoteInfo.quoteNo} dated ${createdDate} with a total of ${formattedValue}`;
    
    if (quoteInfo.shareableDetails.items && Array.isArray(quoteInfo.shareableDetails.items) && quoteInfo.shareableDetails.items.length > 0) {
      const firstItem = quoteInfo.shareableDetails.items[0] as Record<string, unknown>;
      const description = firstItem.description || firstItem.stock_code || 'items';
      const quantity = firstItem.quantity || 0;
      const colour = firstItem.colour || firstItem.color || '';
      const size = firstItem.size || '';
      
      spoken_summary += `. It includes ${quantity} ${description}`;
      if (colour) spoken_summary += ` in ${colour}`;
      if (size) spoken_summary += `, ${size} size`;
      spoken_summary += '.';
    } else {
      spoken_summary += '.';
    }

    // Build response data (exclude sensitive fields - already filtered in shareableDetails)
    const responseData = {
      quote_no: quoteInfo.quoteNo,
      customer: quoteInfo.customer,
      pdf_url: quoteInfo.pdfUrl,
      created_at: quoteInfo.createdAt,
      value: quoteInfo.value,
      items: quoteInfo.shareableDetails.items || [],
      shareable_details: quoteInfo.shareableDetails,
    };

    return NextResponse.json(successResponse(responseData, spoken_summary));
  } catch (error) {
    console.error('Error in get-quote-info:', error);
    return NextResponse.json(
      errorResponse(
        'An error occurred while retrieving your quote',
        'Please try again or contact support'
      ),
      { status: 500 }
    );
  }
}
