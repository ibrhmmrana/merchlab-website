import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/vapi/auth';
import { successResponse, errorResponse } from '@/lib/vapi/response';
import { sendWhatsAppMessage } from '@/lib/whatsapp/sender';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/vapi/send-whatsapp-message
 * Send a WhatsApp text message
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
    const { caller_phone, message } = body;

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

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return NextResponse.json(
        errorResponse(
          'Message content is required',
          'Please provide a message to send'
        ),
        { status: 400 }
      );
    }

    // Send WhatsApp message
    try {
      await sendWhatsAppMessage(caller_phone, message.trim());

      // Generate a simple message ID (in real implementation, WhatsApp API returns this)
      const messageId = `wamid.${Date.now()}`;

      const responseData = {
        message_id: messageId,
        recipient: caller_phone,
        status: 'sent',
      };

      const spoken_summary = 'Message sent successfully to your WhatsApp.';

      return NextResponse.json(successResponse(responseData, spoken_summary));
    } catch (whatsappError) {
      console.error('Error sending WhatsApp message:', whatsappError);
      return NextResponse.json(
        errorResponse(
          'Failed to send WhatsApp message',
          'Please ensure your phone number is registered with WhatsApp Business'
        ),
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in send-whatsapp-message:', error);
    return NextResponse.json(
      errorResponse(
        'An error occurred while sending the message',
        'Please try again or contact support'
      ),
      { status: 500 }
    );
  }
}
