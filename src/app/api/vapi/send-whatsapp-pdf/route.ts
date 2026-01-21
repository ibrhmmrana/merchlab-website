import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/vapi/auth';
import { successResponse, errorResponse } from '@/lib/vapi/response';
import { sendWhatsAppDocument } from '@/lib/whatsapp/sender';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/vapi/send-whatsapp-pdf
 * Send a WhatsApp PDF document
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
    const { caller_phone, document_url, caption, filename } = body;

    // Validate required fields
    if (!caller_phone || typeof caller_phone !== 'string') {
      return NextResponse.json(
        errorResponse(
          'Recipient phone number is required',
          'Please provide a valid phone number'
        ),
        { status: 400 }
      );
    }

    if (!document_url || typeof document_url !== 'string' || document_url.trim() === '') {
      return NextResponse.json(
        errorResponse(
          'Document URL is required',
          'Please provide a valid PDF document URL'
        ),
        { status: 400 }
      );
    }

    if (!caption || typeof caption !== 'string' || caption.trim() === '') {
      return NextResponse.json(
        errorResponse(
          'Caption is required',
          'Please provide a caption for the PDF document'
        ),
        { status: 400 }
      );
    }

    // Send WhatsApp PDF
    try {
      const docFilename = filename && typeof filename === 'string' && filename.trim() !== ''
        ? filename.trim()
        : undefined;

      await sendWhatsAppDocument(
        caller_phone,
        document_url.trim(),
        caption.trim(),
        docFilename
      );

      // Generate a simple message ID (in real implementation, WhatsApp API returns this)
      const messageId = `wamid.${Date.now()}`;

      const responseData = {
        message_id: messageId,
        recipient: caller_phone,
        document_url: document_url.trim(),
        status: 'sent',
      };

      const spoken_summary = 'PDF sent successfully to your WhatsApp.';

      return NextResponse.json(successResponse(responseData, spoken_summary));
    } catch (whatsappError) {
      console.error('Error sending WhatsApp PDF:', whatsappError);
      return NextResponse.json(
        errorResponse(
          'Failed to send PDF document',
          'The PDF may be too large or the URL may be invalid. Please contact support'
        ),
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in send-whatsapp-pdf:', error);
    return NextResponse.json(
      errorResponse(
        'An error occurred while sending the PDF',
        'Please try again or contact support'
      ),
      { status: 500 }
    );
  }
}
