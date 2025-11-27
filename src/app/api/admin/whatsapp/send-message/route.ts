import { NextRequest, NextResponse } from 'next/server';
import { isAuthed, noIndexHeaders } from '@/lib/adminAuth';

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
  if (!isAuthed(request)) {
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

    // Format phone number and extract first name
    const phoneNumber = formatPhoneNumber(customerNumber);
    const firstName = getFirstName(customerName);

    // Send to webhook
    const webhookResponse = await fetch('https://ai.intakt.co.za/webhook/human-whatsapp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        {
          number: phoneNumber,
          message: message.trim(),
          name: firstName,
        },
      ]),
    });

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error('Webhook error:', errorText);
      return NextResponse.json(
        { error: `Failed to send message: ${errorText || 'Unknown error'}` },
        { status: 500, headers: noIndexHeaders() }
      );
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

