import { NextRequest, NextResponse } from 'next/server';
import { saveWhatsAppMessage } from '@/lib/whatsapp/messageStorage';
import { processMessage } from '@/lib/whatsapp/aiAgent';
import { sendWhatsAppMessage, sendWhatsAppDocument } from '@/lib/whatsapp/sender';

// Type aliases for WhatsApp webhook formats
type WaContact = { wa_id?: string; profile?: { name?: string } };
type WaMessage = { from?: string; type?: string; text?: { body?: string } };
type EventValue = { contacts?: WaContact[]; messages?: WaMessage[] };
type EventBodyFormat = { event?: { value?: EventValue } };
type NestedEventBodyFormat = { body?: { event?: { value?: EventValue } } };
type DirectFormat = { contacts?: WaContact[]; messages?: WaMessage[] };

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
    const rawBody = await request.json();
    
    // Log the entire incoming request for debugging
    console.log('=== WhatsApp Webhook Received ===');
    console.log('Full body:', JSON.stringify(rawBody, null, 2));
    console.log('Body type:', Array.isArray(rawBody) ? 'array' : typeof rawBody);
    
    // Handle array format (direct WhatsApp Business API)
    let body: unknown = rawBody;
    if (Array.isArray(rawBody) && rawBody.length > 0) {
      console.log('Detected array format, using first element');
      body = rawBody[0];
    }
    
    // Verify webhook verification (for initial setup)
    const mode = (body as { hub?: { mode?: string; verify_token?: string; challenge?: string } }).hub?.mode;
    const token = (body as { hub?: { mode?: string; verify_token?: string; challenge?: string } }).hub?.verify_token;
    const challenge = (body as { hub?: { mode?: string; verify_token?: string; challenge?: string } }).hub?.challenge;
    
    if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
      console.log('Webhook verification successful');
      // Return challenge as string for webhook verification
      return new NextResponse(challenge || '', { status: 200 });
    }
    
    // Handle incoming messages
    // Support multiple formats: direct WhatsApp Business API (array), standard format, BotPenguin/n8n format
    let waId: string | null = null;
    let customerName: string | null = null;
    let messageText: string | null = null;
    
    console.log('Checking message format...');
    
    // Format 1: Direct WhatsApp Business API array format
    // [ { "contacts": [...], "messages": [...], "field": "messages" } ]
    if (Array.isArray(rawBody) && rawBody.length > 0) {
      const firstItem = rawBody[0] as DirectFormat;
      console.log('Found direct WhatsApp Business API array format');
      const contacts = firstItem.contacts || [];
      const messages = firstItem.messages || [];
      
      if (contacts.length > 0 && messages.length > 0) {
        waId = contacts[0].wa_id || messages[0].from || null;
        customerName = contacts[0].profile?.name || waId || 'Unknown';
        const message = messages[0];
        
        if (message.type === 'text' && message.text?.body) {
          messageText = message.text.body;
          console.log('Extracted from direct array format:', { waId, customerName, messageText });
        } else {
          console.log('Skipping non-text message in direct array format. Type:', message.type);
        }
      }
    }
    
    // Format 2: Standard WhatsApp Business API format
    // { "object": "whatsapp_business_account", "entry": [...] }
    if (!waId && (body as { object?: string }).object === 'whatsapp_business_account') {
      console.log('Found standard WhatsApp Business API format');
      const bodyWithEntry = body as { entry?: unknown[] };
      const entries = (bodyWithEntry.entry || []) as Array<{
        changes?: Array<{
          field?: string;
          value?: EventValue;
        }>;
      }>;
      
      for (const entry of entries) {
        const changes = entry.changes || [];
        
        for (const change of changes) {
          if (change.field === 'messages') {
            const value = change.value;
            
            // Extract message data
            const contacts = value?.contacts || [];
            const messages = value?.messages || [];
            
            if (contacts.length === 0 || messages.length === 0) {
              continue;
            }
            
            const contact = contacts[0];
            const message = messages[0];
            
            // Extract phone number and name
            waId = contact.wa_id || message.from || null;
            customerName = contact.profile?.name || waId || 'Unknown';
            
            // Only process text messages
            if (message.type === 'text' && message.text?.body) {
              messageText = message.text.body;
              console.log('Extracted from standard format:', { waId, customerName, messageText });
            } else {
              // Skip non-text messages (images, videos, etc.)
              console.log(`Skipping non-text message of type: ${message.type}`);
              continue;
            }
          }
        }
      }
    }
    // Format 3: BotPenguin/n8n webhook format (body.event.value)
    // { "event": { "value": { "contacts": [...], "messages": [...] }, "field": "messages" } }
    const bodyWithEvent = body as BotPenguinWebhookBody;
    if (!waId && bodyWithEvent.event?.value) {
      console.log('Found BotPenguin format: body.event.value');
      const eventValue = bodyWithEvent.event.value;
      const contacts = eventValue.contacts || [];
      const messages = eventValue.messages || [];
      
      console.log('Contacts:', contacts.length, 'Messages:', messages.length);
      
      if (contacts.length > 0 && messages.length > 0) {
        waId = contacts[0].wa_id || messages[0].from || null;
        customerName = contacts[0].profile?.name || waId || 'Unknown';
        const message = messages[0];
        console.log('Message type:', message.type, 'Has text:', !!message.text);
        // Only process text messages
        if (message.type === 'text' && message.text?.body) {
          messageText = message.text.body;
          console.log('Extracted from BotPenguin format:', { waId, customerName, messageText });
        } else {
          console.log('Skipping non-text message in BotPenguin format. Type:', message.type);
        }
      } else {
        console.log('Missing contacts or messages in BotPenguin format');
      }
    }
    // Format 4: Nested body format (body.body.event.value)
    // { "body": { "event": { "value": { "contacts": [...], "messages": [...] } } } }
    const bodyWithNestedEvent = body as NestedEventBodyFormat;
    if (!waId && bodyWithNestedEvent.body?.event?.value) {
      console.log('Found nested format: body.body.event.value');
      const eventValue = bodyWithNestedEvent.body.event.value;
      const contacts = eventValue.contacts || [];
      const messages = eventValue.messages || [];
      
      if (contacts.length > 0 && messages.length > 0) {
        waId = contacts[0].wa_id || messages[0].from || null;
        customerName = contacts[0].profile?.name || waId || 'Unknown';
        const message = messages[0];
        // Only process text messages
        if (message.type === 'text' && message.text?.body) {
          messageText = message.text.body;
          console.log('Extracted from nested format:', { waId, customerName, messageText });
        } else {
          console.log('Skipping non-text message in nested format. Type:', message.type);
        }
      }
    }
    // Format 5: Direct format (fallback)
    // { "contacts": [...], "messages": [...] }
    const bodyWithDirect = body as DirectFormat;
    if (!waId && bodyWithDirect.contacts && bodyWithDirect.messages) {
      console.log('Found direct format: body.contacts and body.messages');
      const contacts = bodyWithDirect.contacts;
      const messages = bodyWithDirect.messages;
      waId = contacts[0]?.wa_id || messages[0]?.from || null;
      customerName = contacts[0]?.profile?.name || contacts[0]?.name || waId || 'Unknown';
      messageText = messages[0]?.text?.body || messages[0]?.body || '';
      console.log('Extracted from direct format:', { waId, customerName, messageText });
    }
    
    // Process the message if we found one
    console.log('Final extraction result:', { waId, customerName, messageText, hasMessage: !!messageText });
    
    if (waId && messageText && messageText.trim().length > 0) {
      const customerNumber = waId;
      const sessionId = `ML-${waId}`;
      
      console.log('Processing message:', { sessionId, customerNumber, messageText });
      
      // Save incoming message to Supabase immediately
      try {
        console.log('Saving message to Supabase...');
        await saveWhatsAppMessage(
          sessionId,
          'human',
          messageText,
          {
            number: customerNumber,
            name: customerName || customerNumber,
          }
        );
        console.log('Message saved to Supabase successfully');
      } catch (error) {
        console.error('Error saving incoming message to Supabase:', error);
        console.error('Error details:', error instanceof Error ? error.stack : String(error));
        // Continue processing even if save fails
      }
      
      // Process message with AI agent
      try {
        const aiResponse = await processMessage(
          sessionId,
          messageText,
          customerNumber // Pass phone number so AI can find quotes by phone
        );
        
        // Send response via WhatsApp and save accordingly
        try {
          // If quote PDF URL is present, send only the document and save the caption
          if (aiResponse.quotePdfUrl && aiResponse.quoteCaption) {
            try {
              console.log('Sending quote PDF:', aiResponse.quotePdfUrl);
              const filename = aiResponse.quoteNumber 
                ? `${aiResponse.quoteNumber}.pdf`
                : `quote-${Date.now()}.pdf`;
              
              // Send the PDF document
              await sendWhatsAppDocument(
                customerNumber,
                aiResponse.quotePdfUrl,
                aiResponse.quoteCaption,
                filename
              );
              console.log('Quote PDF sent successfully');
              
              // Save the PDF caption (not the text message) to Supabase
              try {
                await saveWhatsAppMessage(
                  sessionId,
                  'ai',
                  aiResponse.quoteCaption, // Save the caption as the message content
                  {
                    number: customerNumber,
                    name: customerName || customerNumber,
                  },
                  {
                    tool_calls: aiResponse.tool_calls,
                    invalid_tool_calls: aiResponse.invalid_tool_calls,
                    additional_kwargs: {
                      ...aiResponse.additional_kwargs,
                      document_url: aiResponse.quotePdfUrl,
                      document_filename: filename,
                    },
                    response_metadata: aiResponse.response_metadata,
                  }
                );
                console.log('Quote PDF message saved to Supabase');
              } catch (saveError) {
                console.error('Error saving quote PDF message to Supabase:', saveError);
              }
            } catch (docError) {
              console.error('Error sending quote PDF:', docError);
              // Fallback to text message if PDF sending fails
              await sendWhatsAppMessage(customerNumber, aiResponse.content, customerName || undefined);
              
              // Save the text message as fallback
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
              } catch (saveError) {
                console.error('Error saving fallback message to Supabase:', saveError);
              }
            }
          } else {
            // Send regular text message if no PDF
            await sendWhatsAppMessage(customerNumber, aiResponse.content, customerName || undefined);
            
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
          }
        } catch (error) {
          console.error('Error sending WhatsApp message:', error);
          // Don't throw - try to save anyway
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
      console.log('=== No processable message found ===');
      console.log('waId:', waId);
      console.log('messageText:', messageText);
      console.log('Full body structure:', JSON.stringify(body, null, 2).substring(0, 1000));
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

