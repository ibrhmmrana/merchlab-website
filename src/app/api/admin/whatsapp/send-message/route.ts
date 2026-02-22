import { NextRequest, NextResponse } from 'next/server';
import { isAuthed, noIndexHeaders } from '@/lib/adminAuth';
import { saveWhatsAppMessage } from '@/lib/whatsapp/messageStorage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Format phone number to 27123456789 format
function formatPhoneNumber(phoneNumber: string): string {
  // Remove all non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  // If it doesn't start with 27, add it
  if (!cleaned.startsWith('27')) {
    // If it starts with 0, replace with 27
    if (cleaned.startsWith('0')) {
      cleaned = '27' + cleaned.substring(1);
    } else {
      cleaned = '27' + cleaned;
    }
  }
  
  return cleaned;
}

// Extract first name from full name
function getFirstName(fullName: string): string {
  return fullName.split(' ')[0] || fullName;
}

export async function POST(request: NextRequest) {
  if (!(await isAuthed())) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: noIndexHeaders() }
    );
  }

  try {
    const { message, customerName, customerNumber } = await request.json();

    if (!message || !customerName || !customerNumber) {
      return NextResponse.json(
        { error: 'Missing required fields: message, customerName, customerNumber' },
        { status: 400, headers: noIndexHeaders() }
      );
    }

    if (typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message cannot be empty' },
        { status: 400, headers: noIndexHeaders() }
      );
    }

    // Format phone number (ensure it's in international format without +)
    const phoneNumber = formatPhoneNumber(customerNumber);
    const formattedNumber = phoneNumber.replace(/^\+/, '').replace(/\D/g, '');

    // Get WhatsApp Business API credentials
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    // Use Phone Number ID if available, otherwise fall back to Business Account ID
    // Note: Phone Number ID is required for sending messages, Business Account ID may not work
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'WHATSAPP_ACCESS_TOKEN environment variable is not set' },
        { status: 500, headers: noIndexHeaders() }
      );
    }

    if (!phoneNumberId) {
      return NextResponse.json(
        { error: 'WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_BUSINESS_ACCOUNT_ID environment variable is not set' },
        { status: 500, headers: noIndexHeaders() }
      );
    }

    // Send message directly via WhatsApp Business API
    const url = `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`;
    
    const whatsappResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: formattedNumber,
        type: 'text',
        text: {
          preview_url: false,
          body: message.trim(),
        },
      }),
    });

    if (!whatsappResponse.ok) {
      let errorMessage = 'Unknown error';
      try {
        const errorData = await whatsappResponse.json();
        // Extract error message from Facebook Graph API error response
        if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        } else if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else {
          errorMessage = JSON.stringify(errorData);
        }
      } catch {
        // If JSON parsing fails, try to get text
        const errorText = await whatsappResponse.text().catch(() => 'Unknown error');
        errorMessage = errorText || 'Unknown error';
      }
      
      console.error('WhatsApp API error:', errorMessage);
      return NextResponse.json(
        { error: `Failed to send message: ${errorMessage}` },
        { status: whatsappResponse.status || 500, headers: noIndexHeaders() }
      );
    }

    const responseData = await whatsappResponse.json();
    console.log('WhatsApp message sent successfully:', responseData);

    // Save the sent message to Supabase so it appears in the chat
    try {
      const sessionId = `ML-${formattedNumber}`;
      await saveWhatsAppMessage(
        sessionId,
        'ai', // Messages sent by human admin are marked as 'ai' type in the chat
        message.trim(),
        {
          number: formattedNumber,
          name: customerName,
        }
      );
      console.log('Message saved to Supabase successfully');
    } catch (saveError) {
      console.error('Error saving message to Supabase:', saveError);
      // Don't fail the request if saving to Supabase fails - message was already sent
    }

    return NextResponse.json(
      { 
        success: true,
        message: {
          content: message.trim(),
          sentAt: new Date().toISOString(),
        }
      },
      {
        headers: {
          ...noIndexHeaders(),
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('Send message API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500, headers: noIndexHeaders() }
    );
  }
}

