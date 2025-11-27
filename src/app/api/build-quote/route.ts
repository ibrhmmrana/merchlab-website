import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const WEBHOOK_URL_SEND = 'https://ai.intakt.co.za/webhook/build-a-quote';
const WEBHOOK_URL_SAVE = 'https://ai.intakt.co.za/webhook/build-and-save';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { payload, action } = body;

    if (!payload) {
      return NextResponse.json(
        { error: 'Payload is required' },
        { status: 400 }
      );
    }

    if (!action || (action !== 'save' && action !== 'send')) {
      return NextResponse.json(
        { error: 'Action must be "save" or "send"' },
        { status: 400 }
      );
    }

    // Use different webhook based on action
    const webhookUrl = action === 'save' ? WEBHOOK_URL_SAVE : WEBHOOK_URL_SEND;

    // Send to webhook
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Webhook error:', errorText);
      return NextResponse.json(
        { error: `Webhook failed: ${errorText}` },
        { status: response.status }
      );
    }

    const result = await response.json().catch(() => ({}));

    // LinkedIn search feature is currently disabled
    // To reactivate, uncomment the code below
    /*
    // Trigger LinkedIn search automatically after successful quote submission
    // Extract customer info from payload and trigger LinkedIn search
    try {
      // Handle both single payload and array of payloads
      const payloads = Array.isArray(payload) ? payload : [payload];
      
      for (const singlePayload of payloads) {
        const customerInfo = singlePayload.enquiryCustomer as {
          firstName?: string;
          lastName?: string;
          company?: string;
        } | undefined;
        
        if (customerInfo?.firstName && customerInfo?.lastName) {
          const customerName = `${customerInfo.firstName} ${customerInfo.lastName}`.trim();
          const companyName = customerInfo.company || null;
          
          // Call LinkedIn webhook asynchronously (don't wait for it)
          // Use internal API call - construct URL from environment variable
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                         process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                         'http://localhost:3000';
          
          fetch(`${baseUrl}/api/admin/linkedin/webhook`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              enquiryCustomer: {
                firstName: customerInfo.firstName,
                lastName: customerInfo.lastName,
                company: companyName,
              },
            }),
          }).catch((err) => {
            console.error('Failed to trigger LinkedIn search:', err);
            // Don't fail the quote submission if LinkedIn search fails
          });
        }
      }
    } catch (linkedInError) {
      console.error('Error triggering LinkedIn search:', linkedInError);
      // Don't fail the quote submission if LinkedIn search fails
    }
    */

    return NextResponse.json({
      success: true,
      action,
      message: action === 'save' ? 'Quote saved successfully' : 'Quote sent successfully',
      data: result,
    });
  } catch (error) {
    console.error('Build quote error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

