import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/vapi/auth';
import { successResponse, errorResponse } from '@/lib/vapi/response';
import { getInvoiceInfo, getMostRecentInvoiceByPhone } from '@/lib/whatsapp/invoiceInfo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/vapi/get-invoice-info
 * Get invoice information by invoice number or phone number
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

    // Get invoice information
    let invoiceInfo: Awaited<ReturnType<typeof getInvoiceInfo>> | null = null;

    if (invoice_number && invoice_number.trim() !== '') {
      // Invoice number provided - use it
      invoiceInfo = await getInvoiceInfo(invoice_number.trim());
    } else {
      // No invoice number - find most recent invoice by phone
      invoiceInfo = await getMostRecentInvoiceByPhone(caller_phone);
    }

    if (!invoiceInfo) {
      if (invoice_number && invoice_number.trim() !== '') {
        return NextResponse.json(
          errorResponse(
            'Invoice not found for that invoice number',
            'Please verify the invoice number. It should be in format INV-Q553-HFKTH or just Q553-HFKTH'
          ),
          { status: 404 }
        );
      } else {
        return NextResponse.json(
          errorResponse(
            'No invoice found for your phone number',
            'Please provide a specific invoice number or contact support'
          ),
          { status: 404 }
        );
      }
    }

    // Build spoken summary
    const createdDate = invoiceInfo.createdAt
      ? new Date(invoiceInfo.createdAt).toLocaleDateString('en-ZA', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'recently';
    
    const formattedValue = invoiceInfo.value !== null
      ? new Intl.NumberFormat('en-ZA', {
          style: 'currency',
          currency: 'ZAR',
        }).format(invoiceInfo.value)
      : 'N/A';

    let spoken_summary = `I found your invoice ${invoiceInfo.invoiceNo} dated ${createdDate} with a total of ${formattedValue}`;
    
    if (invoiceInfo.shareableDetails.items && Array.isArray(invoiceInfo.shareableDetails.items) && invoiceInfo.shareableDetails.items.length > 0) {
      const firstItem = invoiceInfo.shareableDetails.items[0] as Record<string, unknown>;
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
      invoice_no: invoiceInfo.invoiceNo,
      customer: invoiceInfo.customer,
      pdf_url: invoiceInfo.pdfUrl,
      created_at: invoiceInfo.createdAt,
      value: invoiceInfo.value,
      items: invoiceInfo.shareableDetails.items || [],
      shareable_details: invoiceInfo.shareableDetails,
    };

    return NextResponse.json(successResponse(responseData, spoken_summary));
  } catch (error) {
    console.error('Error in get-invoice-info:', error);
    return NextResponse.json(
      errorResponse(
        'An error occurred while retrieving your invoice',
        'Please try again or contact support'
      ),
      { status: 500 }
    );
  }
}
