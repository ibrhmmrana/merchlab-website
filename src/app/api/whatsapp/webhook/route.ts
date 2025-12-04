import { NextRequest, NextResponse } from 'next/server';
import { saveWhatsAppMessage } from '@/lib/whatsapp/messageStorage';
import { processMessage } from '@/lib/whatsapp/aiAgent';
import { sendWhatsAppMessage } from '@/lib/whatsapp/sender';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * WhatsApp Webhook endpoint
 * Receives incoming messages from WhatsApp Business API
 * 
 * Webhook URL: https://your-domain.com/api/whatsapp/webhook
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Verify webhook verification (for initial setup)
    const mode = body.hub?.mode;
    const token = body.hub?.verify_token;
    const challenge = body.hub?.challenge;
    
    if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
      // Return challenge as string for webhook verification
      return new NextResponse(challenge || '', { status: 200 });
    }
    
    // Handle incoming messages
    // Support both standard WhatsApp Business API format and n8n webhook format
    let waId: string | null = null;
    let customerName: string | null = null;
    let messageText: string | null = null;
    
    // Try standard WhatsApp Business API format
    if (body.object === 'whatsapp_business_account') {
      const entries = body.entry || [];
      
      for (const entry of entries) {
        const changes = entry.changes || [];
        
        for (const change of changes) {
          if (change.field === 'messages') {
            const value = change.value;
            
            // Extract message data
            const contacts = value.contacts || [];
            const messages = value.messages || [];
            
            if (contacts.length === 0 || messages.length === 0) {
              continue;
            }
            
            const contact = contacts[0];
            const message = messages[0];
            
            // Extract phone number and name
            waId = contact.wa_id || message.from;
            customerName = contact.profile?.name || waId || 'Unknown';
            
            // Only process text messages
            if (message.type === 'text' && message.text?.body) {
              messageText = message.text.body;
            } else {
              // Skip non-text messages (images, videos, etc.)
              console.log(`Skipping non-text message of type: ${message.type}`);
              continue;
            }
          }
        }
      }
    }
    // Try BotPenguin/n8n webhook format
    // Format: { event: { value: { contacts: [...], messages: [...] }, field: "messages" } }
    else if (body.event?.value) {
      const eventValue = body.event.value;
      const contacts = eventValue.contacts || [];
      const messages = eventValue.messages || [];
      
      if (contacts.length > 0 && messages.length > 0) {
        waId = contacts[0].wa_id;
        customerName = contacts[0].profile?.name || waId || 'Unknown';
        const message = messages[0];
        // Only process text messages
        if (message.type === 'text' && message.text?.body) {
          messageText = message.text.body;
        } else {
          console.log('Skipping non-text message in BotPenguin format');
        }
      }
    }
    // Try nested body format (fallback for n8n)
    else if (body.body?.event?.value) {
      const eventValue = body.body.event.value;
      const contacts = eventValue.contacts || [];
      const messages = eventValue.messages || [];
      
      if (contacts.length > 0 && messages.length > 0) {
        waId = contacts[0].wa_id;
        customerName = contacts[0].profile?.name || waId || 'Unknown';
        const message = messages[0];
        // Only process text messages
        if (message.type === 'text' && message.text?.body) {
          messageText = message.text.body;
        } else {
          console.log('Skipping non-text message in nested format');
        }
      }
    }
    // Try direct format (fallback)
    else if (body.contacts && body.messages) {
      waId = body.contacts[0]?.wa_id || body.contacts[0]?.number;
      customerName = body.contacts[0]?.profile?.name || body.contacts[0]?.name || waId || 'Unknown';
      messageText = body.messages[0]?.text?.body || body.messages[0]?.body || '';
    }
    
    // Process the message if we found one
    if (waId && messageText && messageText.trim().length > 0) {
      const customerNumber = waId;
      const sessionId = `ML-${waId}`;
      
      // Save incoming message to Supabase immediately
      try {
        await saveWhatsAppMessage(
          sessionId,
          'human',
          messageText,
          {
            number: customerNumber,
            name: customerName || customerNumber,
          }
        );
      } catch (error) {
        console.error('Error saving incoming message to Supabase:', error);
        // Continue processing even if save fails
      }
      
      // Process message with AI agent
      try {
        const aiResponse = await processMessage(
          sessionId,
          messageText
        );
        
        // Save AI response to Supabase with all metadata
        try {
          await saveWhatsAppMessage(
            sessionId,
            'ai',
            aiResponse.content,
            {
              number: customerNumber,
              name: customerName || customerNumber,
            },
            {
              tool_calls: aiResponse.tool_calls,
              invalid_tool_calls: aiResponse.invalid_tool_calls,
              additional_kwargs: aiResponse.additional_kwargs,
              response_metadata: aiResponse.response_metadata,
            }
          );
        } catch (error) {
          console.error('Error saving AI response to Supabase:', error);
        }
        
        // Send response via WhatsApp
        try {
          await sendWhatsAppMessage(customerNumber, aiResponse.content, customerName || undefined);
        } catch (error) {
          console.error('Error sending WhatsApp message:', error);
          // Don't throw - we've already saved the response
        }
      } catch (error) {
        console.error('Error processing message with AI:', error);
        
        // Send error message to customer
        const errorMessage = "I apologize, but I'm experiencing technical difficulties. Please try again in a moment or contact our support team.";
        try {
          await sendWhatsAppMessage(customerNumber, errorMessage, customerName || undefined);
          await saveWhatsAppMessage(
            sessionId,
            'ai',
            errorMessage,
            {
              number: customerNumber,
              name: customerName || customerNumber,
            },
            {
              tool_calls: [],
              invalid_tool_calls: [],
              additional_kwargs: {},
              response_metadata: {
                error: true,
                error_type: 'processing_error',
              },
            }
          );
        } catch (sendError) {
          console.error('Error sending error message:', sendError);
        }
      }
    } else {
      console.log('Received webhook with no processable message:', JSON.stringify(body).substring(0, 500));
    }
    
    // Return 200 OK to acknowledge receipt
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    // Still return 200 to prevent WhatsApp from retrying
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 200 }
    );
  }
}

/**
 * GET endpoint for webhook verification
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');
  
  if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    // Return challenge as string for webhook verification
    return new NextResponse(challenge || '', { status: 200 });
  }
  
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

