import OpenAI from 'openai';
import { getChatHistory, saveChatMessage } from './memory';
import { getOrderStatus } from './orderStatus';
import { getQuoteInfo, getMostRecentQuoteByPhone } from './quoteInfo';
import { getInvoiceInfo, getMostRecentInvoiceByPhone } from './invoiceInfo';
import { getCustomerAccountInfo } from './customerAccount';
import { getOrderDetails, getDeliveryInfo } from './orderDetails';
import { sendEscalationEmail, type EscalationContext } from '../gmail/sender';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = 'gpt-4o-mini';

interface ToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

export interface AIResponse {
  content: string;
  tool_calls?: ToolCall[];
  invalid_tool_calls?: ToolCall[];
  additional_kwargs?: Record<string, unknown>;
  response_metadata?: Record<string, unknown>;
  quotePdfUrl?: string; // PDF URL to send if quote info was retrieved
  quoteCaption?: string; // Caption for the PDF document
  quoteNumber?: string; // Quote number for filename
  invoicePdfUrl?: string; // PDF URL to send if invoice info was retrieved
  invoiceCaption?: string; // Caption for the PDF document
  invoiceNumber?: string; // Invoice number for filename
}

/**
 * System prompt for the WhatsApp AI agent
 */
const SYSTEM_PROMPT = `You are a helpful customer service assistant for MerchLab, a merchandise and promotional products company.

Your role is to:
1. Help customers with their inquiries about orders, products, and services
2. Provide friendly, professional, and concise responses
3. Use the available tools to check order status when customers ask

IMPORTANT GUIDELINES:
- Always be polite, professional, and helpful
- Keep responses concise and clear (WhatsApp messages should be brief)
- When a customer asks about their order status, you MUST ask for their invoice number first
- Invoice numbers can be in formats like "INV-Q553-HFKTH" or "INV-ML-DM618" or just "Q553-HFKTH" or "ML-DM618"
- NEVER mention the cost (totalIncVat) of orders to customers
- REMEMBER customer information from previous interactions - if you've checked an order status, you know the customer's name, email, and other details
- When a customer asks about their information (name, email, etc.), use the information you've already retrieved from order status checks
- If you don't know something, politely say you'll need to check with the team

When checking order status:
- Ask the customer for their invoice number
- Once provided, use the get_order_status tool to check
- The tool will return the order status and customer information
- Always acknowledge the customer by name when providing order status (e.g., "Hi [Customer Name], your order...")
- If customer information is available, personalize your response
- Report the status in a friendly, clear manner
- If the order is not found, apologize and ask them to verify the invoice number

When handling quote requests:
- ALWAYS use the get_quote_info tool to get accurate quote information - do not rely on memory or conversation history
- If a customer asks about their quote (items, total, quantities, descriptions, etc.), call get_quote_info tool to get the current quote data
- If the customer asks to resend/send the quote PDF, call get_quote_info tool - the PDF will be sent automatically
- If the customer asks follow-up questions about a quote (e.g., "What items are in my quote?", "What's the total?", "What products did I order?"), call get_quote_info tool again to get accurate information
- CRITICAL: If a customer says "my quote" or "send me my quote" without providing a quote number, you MUST call the get_quote_info tool. You do NOT need to provide any parameters - just call the tool with an empty quote_number. The phone number will be automatically used from the conversation context to find their most recent quote. DO NOT ask the customer for their phone number or quote number in this case.
- If a specific quote number is provided (format: "Q553-HFKTH" or "ML-DM618"), use that quote number
- The tool will return quote information including total amount, items with quantities and descriptions, and all quote details
- You MUST share the quote total amount with customers - it is the final price they will pay (including VAT if applicable)
- You can share ALL quote information with the customer EXCEPT base_price and beforeVAT fields (these are internal costs and should never be mentioned)
- Always acknowledge the customer by name when providing quote information
- When answering questions about quote items, use the items array from the tool response to list products, quantities, descriptions, colors, sizes, etc.
- When sending a quote PDF, the PDF will be sent automatically with a caption

When handling invoice requests:
- ALWAYS use the get_invoice_info tool to get accurate invoice information - do not rely on memory or conversation history
- CRITICAL: If a customer provides an invoice number (e.g., "INV-Q453-4G5L6", "INV-Q553-HFKTH", "INV-ML-DM618", or just "Q553-HFKTH", "ML-DM618"), you MUST IMMEDIATELY call the get_invoice_info tool with that invoice number. Do NOT say you can't find it without calling the tool first.
- If a customer asks to send/resend an invoice PDF and provides an invoice number, call get_invoice_info tool with that invoice number - the PDF will be sent automatically
- If a customer asks about their invoice (items, total, quantities, descriptions, etc.) and provides an invoice number, call get_invoice_info tool with that invoice number
- If the customer asks to resend/send the invoice PDF without providing an invoice number, call get_invoice_info tool with empty invoice_number - the phone number will be used automatically
- If the customer asks follow-up questions about an invoice (e.g., "What items are in my invoice?", "What's the total?", "What products did I order?"), call get_invoice_info tool again to get accurate information
- CRITICAL: If a customer says "my invoice" or "send me my invoice" without providing an invoice number, you MUST call the get_invoice_info tool. You do NOT need to provide any parameters - just call the tool with an empty invoice_number. The phone number will be automatically used from the conversation context to find their most recent invoice. DO NOT ask the customer for their phone number or invoice number in this case.
- Invoice numbers can be in formats like "INV-Q453-4G5L6", "INV-Q553-HFKTH", "INV-ML-DM618" or just "Q553-HFKTH", "ML-DM618" - always try the tool with the exact format the customer provided
- The tool will return invoice information including total amount, items with quantities and descriptions, and all invoice details
- You MUST share the invoice total amount with customers - it is the final price they paid (including VAT if applicable)
- You can share ALL invoice information with the customer EXCEPT base_price and beforeVAT fields (these are internal costs and should never be mentioned)
- Always acknowledge the customer by name when providing invoice information
- When answering questions about invoice items, use the items array from the tool response to list products, quantities, descriptions, colors, sizes, etc.
- When sending an invoice PDF, the PDF will be sent automatically with a caption

When handling customer account information requests:
- ALWAYS use the get_customer_account_info tool to get accurate customer account information
- If a customer asks about their orders, quotes, order history, total order value, or last order date, call get_customer_account_info tool
- The tool can identify customers by: phone number, email, name, quote number, or invoice number
- If the customer asks "What orders do I have?" or "What quotes do I have?" or "What's my order history?", use their phone number from the conversation context to call the tool
- If the customer provides a quote or invoice number, you can use that to identify them and get their account information
- The tool will return: order count, total order value, last order date, and lists of quotes and invoices
- Always acknowledge the customer by name when providing account information
- Format the response in a friendly, clear manner with the key information highlighted

When handling order details requests:
- ALWAYS use the get_order_details tool to get accurate order information - do not rely on memory or conversation history
- If a customer asks "What items are in my order?" or "What products did I order?" or "What's the quantity of [product] in my order?", you MUST call the get_order_details tool with their invoice number
- The tool requires an invoice number - if the customer hasn't provided one, ask them for their invoice number first
- The tool will return: product list with descriptions, quantities, colors, sizes, and prices
- Always acknowledge the customer by name when providing order details
- Format the response in a friendly, clear manner listing all items

When handling delivery information requests:
- ALWAYS use the get_delivery_info tool to get accurate delivery information - do not rely on memory or conversation history
- If a customer asks "Is my order being delivered or collected?" or "What's my delivery address?" or "When will my order be delivered?", you MUST call the get_delivery_info tool with their invoice number
- The tool requires an invoice number - if the customer hasn't provided one, ask them for their invoice number first
- The tool will return: whether the order is delivery or collection, delivery address (if applicable), and customer information
- Always acknowledge the customer by name when providing delivery information
- Format the response in a friendly, clear manner

When handling escalations:
- If a customer explicitly asks to "speak to a human", "talk to a person", "speak to someone", "I want to talk to a real person", or requests escalation, you MUST use the escalate_to_human tool immediately
- If a customer's request is too complex or outside your capabilities (e.g., custom product requests, complex technical issues, complaints about service quality), use the escalate_to_human tool
- If a customer is frustrated, angry, dissatisfied, or expresses strong negative emotions, use the escalate_to_human tool to ensure they get proper human support
- When escalating, provide a clear reason (e.g., "Customer requested to speak with human", "Complex issue requiring human assistance", "Customer is frustrated and needs human support") and include relevant conversation context
- After escalating, inform the customer politely that a team member will be in touch shortly to assist them
- Always be polite and professional, even when escalating - never show frustration or dismissiveness
- The escalation tool will automatically send an email to staff with all conversation context, customer information, and a link to view the conversation in the dashboard`;

/**
 * Process a message with the AI agent
 */
export async function processMessage(
  sessionId: string,
  userMessage: string,
  customerPhoneNumber?: string,
  customerWhatsAppName?: string
): Promise<AIResponse> {
  try {
    // Get chat history from Postgres
    const history = await getChatHistory(sessionId);
    console.log(`Retrieved ${history.length} messages from chat history for session ${sessionId}`);
    
    // Convert history to OpenAI format
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: SYSTEM_PROMPT,
      },
    ];
    
    // Add history messages
    for (const msg of history) {
      if (msg.role === 'human') {
        messages.push({
          role: 'user',
          content: msg.content,
        });
      } else {
        messages.push({
          role: 'assistant',
          content: msg.content,
        });
      }
    }
    
    console.log(`Total messages in context: ${messages.length} (including system message)`);
    
    // Add current user message
    messages.push({
      role: 'user',
      content: userMessage,
    });
    
    // Call OpenAI with function calling
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages,
      tools: [
        {
          type: 'function',
          function: {
            name: 'get_order_status',
            description: 'Get the status of an order by invoice number. The invoice number can be in formats like "INV-Q553-HFKTH" or just "Q553-HFKTH". Always ask the customer for their invoice number before calling this function.',
            parameters: {
              type: 'object',
              properties: {
                invoice_number: {
                  type: 'string',
                  description: 'The invoice number provided by the customer (e.g., "INV-Q553-HFKTH" or "Q553-HFKTH")',
                },
              },
              required: ['invoice_number'],
            },
          },
        },
        {
          type: 'function',
          function: {
            name: 'get_quote_info',
            description: 'Get quote information by quote number or phone number. Use this tool whenever a customer asks about their quote, including: 1) When they ask to resend/send the quote PDF, 2) When they ask about quote details (items, total, quantities, descriptions, etc.), 3) When they ask follow-up questions about a quote (e.g., "What items are in my quote?", "What\'s the total?", "What products did I order?"), 4) When they say "my quote" or "send me my quote" without providing a quote number. IMPORTANT: If the customer says "my quote" or "send me my quote" without providing a quote number, you MUST call this tool. You do NOT need to provide the phone_number parameter - it will be automatically injected from the conversation context. Just call the tool with an empty quote_number. Always call this tool to get accurate, up-to-date quote information rather than relying on memory. The tool will return all quote details including items, quantities, descriptions, total amount, and customer information.',
            parameters: {
              type: 'object',
              properties: {
                quote_number: {
                  type: 'string',
                  description: 'The quote number provided by the customer (e.g., "Q553-HFKTH" or "ML-DM618"). If the customer mentions a specific quote number, use that. If they ask about "my quote" or "the quote" without specifying a quote number, leave this empty (the phone number will be used automatically).',
                },
                phone_number: {
                  type: 'string',
                  description: 'The customer\'s phone number. This is optional - if not provided, the phone number from the conversation context will be used automatically. Only provide this if you have a specific phone number to use.',
                },
              },
              required: [],
            },
          },
        },
        {
          type: 'function',
          function: {
            name: 'get_invoice_info',
            description: 'Get invoice information by invoice number or phone number. Use this tool whenever a customer asks about their invoice, including: 1) When they provide an invoice number (e.g., "INV-Q453-4G5L6", "INV-Q553-HFKTH", "INV-ML-DM618") - you MUST call this tool immediately with that invoice number, 2) When they ask to resend/send the invoice PDF, 3) When they ask about invoice details (items, total, quantities, descriptions, etc.), 4) When they ask follow-up questions about an invoice (e.g., "What items are in my invoice?", "What\'s the total?", "What products did I order?"), 5) When they say "my invoice" or "send me my invoice" without providing an invoice number. CRITICAL: If the customer provides an invoice number (in any format like "INV-Q453-4G5L6" or just "Q453-4G5L6"), you MUST IMMEDIATELY call this tool with that invoice number. Do NOT say you cannot find the invoice without calling the tool first. If the customer says "my invoice" or "send me my invoice" without providing an invoice number, you MUST IMMEDIATELY call this tool with an empty invoice_number. Do NOT ask the customer for their invoice number. The phone number will be automatically injected from the conversation context. Always call this tool to get accurate, up-to-date invoice information rather than relying on memory. The tool will return all invoice details including items, quantities, descriptions, total amount, and customer information.',
            parameters: {
              type: 'object',
              properties: {
                invoice_number: {
                  type: 'string',
                  description: 'The invoice number provided by the customer (e.g., "INV-Q553-HFKTH", "INV-ML-DM618", or just "Q553-HFKTH", "ML-DM618"). If the customer mentions a specific invoice number, use that. If they ask about "my invoice" or "the invoice" without specifying an invoice number, leave this empty (the phone number will be used automatically).',
                },
                phone_number: {
                  type: 'string',
                  description: 'The customer\'s phone number. This is optional - if not provided, the phone number from the conversation context will be used automatically. Only provide this if you have a specific phone number to use.',
                },
              },
              required: [],
            },
          },
        },
        {
          type: 'function',
          function: {
            name: 'get_customer_account_info',
            description: 'Get customer account information including orders, quotes, order history, total order value, and last order date. Use this tool when a customer asks about: 1) Their orders ("What orders do I have?", "What\'s my order history?"), 2) Their quotes ("What quotes do I have?"), 3) Their total order value ("What\'s my total order value?"), 4) Their last order ("When was my last order?"). CRITICAL: You MUST call this tool whenever a customer asks about their account information. Do NOT rely on memory or previous tool responses - always make a fresh database query. The tool can identify customers by phone number, email, name, quote number, or invoice number. If the customer asks about their account without providing an identifier, you do NOT need to provide any parameters - the customer\'s phone number will be automatically used from the conversation context.',
            parameters: {
              type: 'object',
              properties: {
                identifier: {
                  type: 'string',
                  description: 'Customer identifier: phone number, email, name, quote number (e.g., "Q553-HFKTH"), or invoice number (e.g., "INV-Q553-HFKTH"). If not provided, the customer\'s phone number from the conversation context will be used automatically.',
                },
              },
              required: [],
            },
          },
        },
        {
          type: 'function',
          function: {
            name: 'escalate_to_human',
            description: 'Escalate the conversation to a human staff member. Use this tool when: 1) A customer explicitly asks to "speak to a human", "talk to a person", "speak to someone", or requests escalation, 2) A customer\'s request is too complex or outside your capabilities, 3) A customer is frustrated, angry, or dissatisfied and needs human assistance. The tool will send an email to staff with all conversation context and customer information. After escalating, inform the customer that a team member will be in touch shortly.',
            parameters: {
              type: 'object',
              properties: {
                reason: {
                  type: 'string',
                  description: 'The reason for escalation (e.g., "Customer requested to speak with human", "Complex issue requiring human assistance", "Customer is frustrated and needs human support")',
                },
                conversation_summary: {
                  type: 'string',
                  description: 'A brief summary of the conversation context and what the customer needs help with',
                },
              },
              required: ['reason'],
            },
          },
        },
      ],
      tool_choice: 'auto',
    });
    
    const response = completion.choices[0];
    
    // Handle tool calls
    if (response.message.tool_calls && response.message.tool_calls.length > 0) {
      const toolCall = response.message.tool_calls[0];
      
      // Type guard: check if it's a function tool call
      if (toolCall.type === 'function' && 'function' in toolCall && toolCall.function.name === 'get_order_status') {
        const args = JSON.parse(toolCall.function.arguments) as { invoice_number: string };
        const invoiceNumber = args.invoice_number;
        
        // Get order status with customer information
        const orderInfo = await getOrderStatus(invoiceNumber);
        
        // Add tool response to messages
        // Type guard ensures toolCall is a function tool call
        if (toolCall.type === 'function' && 'function' in toolCall) {
          messages.push({
            role: 'assistant',
            content: null,
            tool_calls: [
              {
                id: toolCall.id,
                type: 'function',
                function: {
                  name: 'get_order_status',
                  arguments: toolCall.function.arguments,
                },
              },
            ],
          });
        }
        
        // Build tool response with order status and customer info
        let toolResponse = '';
        if (orderInfo) {
          toolResponse = `Order status: ${orderInfo.status}`;
          if (orderInfo.customer) {
            toolResponse += `\nCustomer Information:\n- Name: ${orderInfo.customer.name}`;
            if (orderInfo.customer.company && orderInfo.customer.company !== '-') {
              toolResponse += `\n- Company: ${orderInfo.customer.company}`;
            }
            if (orderInfo.customer.email && orderInfo.customer.email !== '-') {
              toolResponse += `\n- Email: ${orderInfo.customer.email}`;
            }
            if (orderInfo.customer.phone && orderInfo.customer.phone !== '-') {
              toolResponse += `\n- Phone: ${orderInfo.customer.phone}`;
            }
          }
        } else {
          toolResponse = `Order not found for invoice number: ${invoiceNumber}. Please verify the invoice number.`;
        }
        
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: toolResponse,
        });
        
        // Add customer information to system context if available
        if (orderInfo?.customer) {
          // Update system message with customer context
          const customerContext = `\n\nCUSTOMER CONTEXT: The customer you are speaking with is ${orderInfo.customer.name}${orderInfo.customer.company && orderInfo.customer.company !== '-' ? ` from ${orderInfo.customer.company}` : ''}.${orderInfo.customer.email && orderInfo.customer.email !== '-' ? ` Their email is ${orderInfo.customer.email}.` : ''}${orderInfo.customer.phone && orderInfo.customer.phone !== '-' ? ` Their phone number is ${orderInfo.customer.phone}.` : ''} Remember this information for the rest of the conversation.`;
          
          // Update the system message in the messages array
          const systemMessageIndex = messages.findIndex(m => m.role === 'system');
          if (systemMessageIndex !== -1 && typeof messages[systemMessageIndex].content === 'string') {
            messages[systemMessageIndex].content += customerContext;
          }
        }
        
        // Get final response from AI
        const finalCompletion = await openai.chat.completions.create({
          model: MODEL,
          messages,
        });
        
        const aiResponseContent = finalCompletion.choices[0].message.content || 'I apologize, but I encountered an error processing your request.';
        
        // Extract metadata from the completion
        const toolCalls: ToolCall[] = [];
        if (finalCompletion.choices[0].message.tool_calls) {
          for (const tc of finalCompletion.choices[0].message.tool_calls) {
            // Type guard: check if it's a function tool call
            if (tc.type === 'function' && 'function' in tc) {
              toolCalls.push({
                id: tc.id,
                type: tc.type,
                function: {
                  name: tc.function.name,
                  arguments: tc.function.arguments,
                },
              });
            }
          }
        }
        
        const aiResponse: AIResponse = {
          content: aiResponseContent,
          tool_calls: toolCalls,
          invalid_tool_calls: [],
          additional_kwargs: {},
          response_metadata: {
            model: finalCompletion.model,
            finish_reason: finalCompletion.choices[0].finish_reason,
          },
        };
        
        // Save messages to memory
        console.log('Saving messages to Postgres memory...');
        await saveChatMessage(sessionId, 'human', userMessage);
        await saveChatMessage(sessionId, 'ai', aiResponseContent);
        console.log('Messages saved to Postgres memory');
        
        return aiResponse;
      }
      
      // Handle get_quote_info tool call
      if (toolCall.type === 'function' && 'function' in toolCall && toolCall.function.name === 'get_quote_info') {
        let args = JSON.parse(toolCall.function.arguments) as { quote_number?: string; phone_number?: string };
        const quoteNumber = args.quote_number;
        
        console.log(`get_quote_info tool called with args:`, { quote_number: quoteNumber, phone_number: args.phone_number, customerPhoneNumber });
        
        // If no quote number provided but we have customer phone number, automatically inject it
        if (!quoteNumber && customerPhoneNumber && !args.phone_number) {
          console.log(`No quote number provided, automatically using customer phone number: ${customerPhoneNumber}`);
          args = { ...args, phone_number: customerPhoneNumber };
          // Update the tool call arguments for logging
          toolCall.function.arguments = JSON.stringify(args);
        }
        
        const phoneNumber = args.phone_number || customerPhoneNumber;
        console.log(`Using phone number for quote lookup: ${phoneNumber} (from args: ${args.phone_number}, from context: ${customerPhoneNumber})`);
        
        // Get quote information
        let quoteInfo: Awaited<ReturnType<typeof getQuoteInfo>> | null = null;
        
        if (quoteNumber) {
          // Quote number provided - use it
          quoteInfo = await getQuoteInfo(quoteNumber);
        } else if (phoneNumber) {
          // No quote number but phone number available - find most recent quote
          console.log(`No quote number provided, searching for most recent quote by phone: ${phoneNumber}`);
          quoteInfo = await getMostRecentQuoteByPhone(phoneNumber);
          if (quoteInfo) {
            console.log(`Found most recent quote: ${quoteInfo.quoteNo} for phone: ${phoneNumber}`);
          } else {
            console.log(`No quotes found for phone: ${phoneNumber}`);
          }
        } else {
          // Neither provided
          quoteInfo = null;
        }
        
        // Add tool response to messages (use updated arguments if phone number was injected)
        if (toolCall.type === 'function' && 'function' in toolCall) {
          messages.push({
            role: 'assistant',
            content: null,
            tool_calls: [
              {
                id: toolCall.id,
                type: 'function',
                function: {
                  name: 'get_quote_info',
                  arguments: JSON.stringify(args), // Use updated args with phone number if injected
                },
              },
            ],
          });
        }
        
        // Build tool response with quote information
        // Include all shareable details (excluding base_price and beforeVAT)
        let toolResponse = '';
        if (quoteInfo) {
          toolResponse = `Quote found: ${quoteInfo.quoteNo}`;
          if (quoteInfo.customer) {
            toolResponse += `\nCustomer: ${quoteInfo.customer.name}`;
            if (quoteInfo.customer.company && quoteInfo.customer.company !== '-') {
              toolResponse += ` (${quoteInfo.customer.company})`;
            }
          }
          if (quoteInfo.createdAt) {
            const createdDate = new Date(quoteInfo.createdAt).toLocaleDateString('en-ZA', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });
            toolResponse += `\nCreated: ${createdDate}`;
          }
          if (quoteInfo.value !== null) {
            const formattedValue = new Intl.NumberFormat('en-ZA', {
              style: 'currency',
              currency: 'ZAR',
            }).format(quoteInfo.value);
            toolResponse += `\nTotal Amount (YOU CAN AND MUST SHARE THIS WITH THE CUSTOMER): ${formattedValue}`;
          }
          toolResponse += `\nPDF URL: ${quoteInfo.pdfUrl}`;
          
          // Extract and format items for easy reference
          const shareable = quoteInfo.shareableDetails;
          if (shareable.items && Array.isArray(shareable.items)) {
            toolResponse += `\n\nItems in quote (${shareable.items.length} items):`;
            shareable.items.forEach((item: unknown, index: number) => {
              if (typeof item === 'object' && item !== null) {
                const itemObj = item as Record<string, unknown>;
                const description = itemObj.description || itemObj.stock_code || 'Item';
                const quantity = itemObj.quantity || 0;
                const price = itemObj.price || itemObj.discountedPrice || itemObj.discounted_price || 0;
                const colour = itemObj.colour || itemObj.color || '';
                const size = itemObj.size || '';
                
                toolResponse += `\n${index + 1}. ${description}`;
                if (quantity) toolResponse += ` - Quantity: ${quantity}`;
                if (colour) toolResponse += ` - Color: ${colour}`;
                if (size) toolResponse += ` - Size: ${size}`;
                if (price) {
                  const formattedPrice = new Intl.NumberFormat('en-ZA', {
                    style: 'currency',
                    currency: 'ZAR',
                  }).format(typeof price === 'number' ? price : parseFloat(String(price)) || 0);
                  toolResponse += ` - Price: ${formattedPrice}`;
                }
              }
            });
          }
          
          // Include all shareable quote details as JSON for the AI to reference
          toolResponse += `\n\nFull Quote Details (all shareable with customer, excluding base_price and beforeVAT):\n${JSON.stringify(shareable, null, 2)}`;
        } else {
          if (quoteNumber) {
            toolResponse = `Quote not found for quote number: ${quoteNumber}. Please verify the quote number.`;
          } else if (phoneNumber) {
            toolResponse = `No quotes found for this phone number. Please provide a specific quote number or contact support.`;
          } else {
            toolResponse = `Please provide a quote number or ensure your phone number is available to find your quote.`;
          }
        }
        
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: toolResponse,
        });
        
        // Add customer information to system context if available
        if (quoteInfo?.customer) {
          const customerContext = `\n\nCUSTOMER CONTEXT: The customer you are speaking with is ${quoteInfo.customer.name}${quoteInfo.customer.company && quoteInfo.customer.company !== '-' ? ` from ${quoteInfo.customer.company}` : ''}.${quoteInfo.customer.email && quoteInfo.customer.email !== '-' ? ` Their email is ${quoteInfo.customer.email}.` : ''}${quoteInfo.customer.phone && quoteInfo.customer.phone !== '-' ? ` Their phone number is ${quoteInfo.customer.phone}.` : ''} Remember this information for the rest of the conversation.`;
          
          const systemMessageIndex = messages.findIndex(m => m.role === 'system');
          if (systemMessageIndex !== -1 && typeof messages[systemMessageIndex].content === 'string') {
            messages[systemMessageIndex].content += customerContext;
          }
        }
        
        // Check if this is a follow-up question (not a request to send PDF)
        // Look at the user message to determine intent
        const userMessageLower = userMessage.toLowerCase();
        const isPdfRequest = userMessageLower.includes('resend') || 
                            userMessageLower.includes('send') || 
                            userMessageLower.includes('pdf') ||
                            (userMessageLower.includes('quote') && (userMessageLower.includes('please') || userMessageLower.includes('can you') || userMessageLower.includes('my')));
        
        let quoteCaption = '';
        let aiResponseContent = '';
        let shouldSendPdf = false;
        
        if (quoteInfo) {
          // Build caption for PDF (only if explicitly requested)
          quoteCaption = `📄 Your Quote: ${quoteInfo.quoteNo}\n\n`;
          if (quoteInfo.customer) {
            quoteCaption += `Customer: ${quoteInfo.customer.name}`;
            if (quoteInfo.customer.company && quoteInfo.customer.company !== '-') {
              quoteCaption += ` (${quoteInfo.customer.company})`;
            }
            quoteCaption += '\n';
          }
          if (quoteInfo.createdAt) {
            const createdDate = new Date(quoteInfo.createdAt).toLocaleDateString('en-ZA', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            });
            quoteCaption += `Created: ${createdDate}\n`;
          }
          if (quoteInfo.value !== null) {
            const formattedValue = new Intl.NumberFormat('en-ZA', {
              style: 'currency',
              currency: 'ZAR',
            }).format(quoteInfo.value);
            quoteCaption += `Total Amount: ${formattedValue}\n`;
          }
          quoteCaption += '\nYour quote PDF is attached below. If you have any questions or would like to proceed with this quote, please let me know! 😊';
          
          // If it's a PDF request, use caption and send PDF
          // If it's a follow-up question, generate text response with AI
          if (isPdfRequest) {
            shouldSendPdf = true;
            aiResponseContent = quoteCaption;
          } else {
            // Follow-up question - generate text response using AI
            shouldSendPdf = false;
            const finalCompletion = await openai.chat.completions.create({
              model: MODEL,
              messages,
            });
            aiResponseContent = finalCompletion.choices[0].message.content || 'I apologize, but I encountered an error processing your request.';
            // Don't set quoteCaption for follow-up questions
          }
        } else {
          // Quote not found - need AI to generate a response
          shouldSendPdf = false;
          const finalCompletion = await openai.chat.completions.create({
            model: MODEL,
            messages,
          });
          aiResponseContent = finalCompletion.choices[0].message.content || 'I apologize, but I could not find the quote. Please verify the quote number.';
          quoteCaption = aiResponseContent;
        }
        
        const aiResponse: AIResponse = {
          content: aiResponseContent,
          tool_calls: [{
            id: toolCall.id,
            type: 'function',
            function: {
              name: 'get_quote_info',
              arguments: toolCall.function.arguments,
            },
          }],
          invalid_tool_calls: [],
          additional_kwargs: {},
          response_metadata: {
            model: MODEL,
            finish_reason: 'stop',
          },
          // Only include PDF info if it's a PDF request
          quotePdfUrl: (quoteInfo && shouldSendPdf) ? quoteInfo.pdfUrl : undefined,
          quoteCaption: (quoteInfo && shouldSendPdf) ? quoteCaption : undefined,
          quoteNumber: quoteInfo?.quoteNo,
        };
        
        // Save messages to memory
        console.log('Saving messages to Postgres memory...');
        await saveChatMessage(sessionId, 'human', userMessage);
        await saveChatMessage(sessionId, 'ai', aiResponseContent);
        console.log('Messages saved to Postgres memory');
        
        return aiResponse;
      }

      // Handle get_invoice_info tool call
      if (toolCall.type === 'function' && 'function' in toolCall && toolCall.function.name === 'get_invoice_info') {
        let args = JSON.parse(toolCall.function.arguments) as { invoice_number?: string; phone_number?: string };
        const invoiceNumber = args.invoice_number;
        
        console.log(`get_invoice_info tool called with args:`, { invoice_number: invoiceNumber, phone_number: args.phone_number, customerPhoneNumber });
        
        // If no invoice number provided but we have customer phone number, automatically inject it
        if (!invoiceNumber && customerPhoneNumber && !args.phone_number) {
          console.log(`No invoice number provided, automatically using customer phone number: ${customerPhoneNumber}`);
          args = { ...args, phone_number: customerPhoneNumber };
          // Update the tool call arguments for logging
          toolCall.function.arguments = JSON.stringify(args);
        }
        
        const phoneNumber = args.phone_number || customerPhoneNumber;
        console.log(`Using phone number for invoice lookup: ${phoneNumber} (from args: ${args.phone_number}, from context: ${customerPhoneNumber})`);
        
        // Get invoice information
        let invoiceInfo: Awaited<ReturnType<typeof getInvoiceInfo>> | null = null;
        
        if (invoiceNumber) {
          // Invoice number provided - use it
          invoiceInfo = await getInvoiceInfo(invoiceNumber);
        } else if (phoneNumber) {
          // No invoice number but phone number available - find most recent invoice
          console.log(`No invoice number provided, searching for most recent invoice by phone: ${phoneNumber}`);
          invoiceInfo = await getMostRecentInvoiceByPhone(phoneNumber);
          if (invoiceInfo) {
            console.log(`Found most recent invoice: ${invoiceInfo.invoiceNo} for phone: ${phoneNumber}`);
          } else {
            console.log(`No invoices found for phone: ${phoneNumber}`);
          }
        } else {
          // Neither provided
          invoiceInfo = null;
        }
        
        // Add tool response to messages
        if (toolCall.type === 'function' && 'function' in toolCall) {
          messages.push({
            role: 'assistant',
            content: null,
            tool_calls: [
              {
                id: toolCall.id,
                type: 'function',
                function: {
                  name: 'get_invoice_info',
                  arguments: JSON.stringify(args), // Use updated args with phone number if injected
                },
              },
            ],
          });
        }
        
        // Build tool response with invoice information
        let toolResponse = '';
        if (invoiceInfo) {
          toolResponse = `Invoice found: ${invoiceInfo.invoiceNo}`;
          if (invoiceInfo.customer) {
            toolResponse += `\nCustomer: ${invoiceInfo.customer.name}`;
            if (invoiceInfo.customer.company && invoiceInfo.customer.company !== '-') {
              toolResponse += ` (${invoiceInfo.customer.company})`;
            }
          }
          if (invoiceInfo.createdAt) {
            const createdDate = new Date(invoiceInfo.createdAt).toLocaleDateString('en-ZA', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });
            toolResponse += `\nCreated: ${createdDate}`;
          }
          if (invoiceInfo.value !== null) {
            const formattedValue = new Intl.NumberFormat('en-ZA', {
              style: 'currency',
              currency: 'ZAR',
            }).format(invoiceInfo.value);
            toolResponse += `\nTotal Amount (YOU CAN AND MUST SHARE THIS WITH THE CUSTOMER): ${formattedValue}`;
          }
          toolResponse += `\nPDF URL: ${invoiceInfo.pdfUrl}`;

          // Extract and format items for easy reference
          const shareable = invoiceInfo.shareableDetails;
          if (shareable.items && Array.isArray(shareable.items)) {
            toolResponse += `\n\nItems in invoice (${shareable.items.length} items):`;
            shareable.items.forEach((item: unknown, index: number) => {
              if (typeof item === 'object' && item !== null) {
                const itemObj = item as Record<string, unknown>;
                const description = itemObj.description || itemObj.stock_code || 'Item';
                const quantity = itemObj.quantity || 0;
                const price = itemObj.price || itemObj.discountedPrice || itemObj.discounted_price || 0;
                const colour = itemObj.colour || itemObj.color || '';
                const size = itemObj.size || '';

                toolResponse += `\n${index + 1}. ${description}`;
                if (quantity) toolResponse += ` - Quantity: ${quantity}`;
                if (colour) toolResponse += ` - Color: ${colour}`;
                if (size) toolResponse += ` - Size: ${size}`;
                if (price) {
                  const formattedPrice = new Intl.NumberFormat('en-ZA', {
                    style: 'currency',
                    currency: 'ZAR',
                  }).format(typeof price === 'number' ? price : parseFloat(String(price)) || 0);
                  toolResponse += ` - Price: ${formattedPrice}`;
                }
              }
            });
          }

          // Include all shareable invoice details as JSON for the AI to reference
          toolResponse += `\n\nFull Invoice Details (all shareable with customer, excluding base_price and beforeVAT):\n${JSON.stringify(shareable, null, 2)}`;
        } else {
          if (invoiceNumber) {
            toolResponse = `Invoice not found for invoice number: ${invoiceNumber}. Please verify the invoice number.`;
          } else if (phoneNumber) {
            toolResponse = `No invoices found for this phone number. Please provide a specific invoice number or contact support.`;
          } else {
            toolResponse = `Please provide an invoice number or ensure your phone number is available to find your invoice.`;
          }
        }
        
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: toolResponse,
        });
        
        // Add customer information to system context if available
        if (invoiceInfo?.customer) {
          const customerContext = `\n\nCUSTOMER CONTEXT: The customer you are speaking with is ${invoiceInfo.customer.name}${invoiceInfo.customer.company && invoiceInfo.customer.company !== '-' ? ` from ${invoiceInfo.customer.company}` : ''}.${invoiceInfo.customer.email && invoiceInfo.customer.email !== '-' ? ` Their email is ${invoiceInfo.customer.email}.` : ''}${invoiceInfo.customer.phone && invoiceInfo.customer.phone !== '-' ? ` Their phone number is ${invoiceInfo.customer.phone}.` : ''} Remember this information for the rest of the conversation.`;
          
          const systemMessageIndex = messages.findIndex(m => m.role === 'system');
          if (systemMessageIndex !== -1 && typeof messages[systemMessageIndex].content === 'string') {
            messages[systemMessageIndex].content += customerContext;
          }
        }
        
        // Check if this is a follow-up question (not a request to send PDF)
        const userMessageLower = userMessage.toLowerCase();
        // For invoices, if they say "my invoice" or "send me my invoice", always send PDF
        // Also check if they're asking to send/resend the invoice
        // If an invoice number was provided in the tool call AND they said "send", it's a PDF request
        // If no invoice number was provided in the tool call, it's likely a "my invoice" request - always send PDF
        const isPdfRequest = !invoiceNumber || // If no invoice number provided, it's a "my invoice" request
                            userMessageLower.includes('resend') || 
                            (userMessageLower.includes('send') && (userMessageLower.includes('invoice') || invoiceNumber)) || // If they said "send" and provided invoice number, send PDF
                            userMessageLower.includes('pdf') ||
                            (userMessageLower.includes('invoice') && (userMessageLower.includes('please') || userMessageLower.includes('can you') || userMessageLower.includes('my')));
        
        let invoiceCaption = '';
        let aiResponseContent = '';
        let shouldSendPdf = false;
        
        if (invoiceInfo) {
          // Build caption for PDF
          invoiceCaption = `📄 Your Invoice: ${invoiceInfo.invoiceNo}\n\n`;
          if (invoiceInfo.customer) {
            invoiceCaption += `Customer: ${invoiceInfo.customer.name}`;
            if (invoiceInfo.customer.company && invoiceInfo.customer.company !== '-') {
              invoiceCaption += ` (${invoiceInfo.customer.company})`;
            }
            invoiceCaption += '\n';
          }
          if (invoiceInfo.createdAt) {
            const createdDate = new Date(invoiceInfo.createdAt).toLocaleDateString('en-ZA', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            });
            invoiceCaption += `Created: ${createdDate}\n`;
          }
          if (invoiceInfo.value !== null) {
            const formattedValue = new Intl.NumberFormat('en-ZA', {
              style: 'currency',
              currency: 'ZAR',
            }).format(invoiceInfo.value);
            invoiceCaption += `Total Amount: ${formattedValue}\n`;
          }
          invoiceCaption += '\nYour invoice PDF is attached below. If you have any questions, please let me know! 😊';
          
          // If it's a PDF request (including "my invoice" or "send me my invoice"), use caption and send PDF
          // If it's a follow-up question about invoice details, generate text response with AI
          if (isPdfRequest) {
            shouldSendPdf = true;
            aiResponseContent = invoiceCaption;
            console.log('Invoice PDF request detected - will send PDF with caption');
          } else {
            // Follow-up question - generate text response using AI
            shouldSendPdf = false;
            console.log('Invoice follow-up question detected - generating text response');
            const finalCompletion = await openai.chat.completions.create({
              model: MODEL,
              messages,
            });
            aiResponseContent = finalCompletion.choices[0].message.content || 'I apologize, but I encountered an error processing your request.';
          }
        } else {
          // Invoice not found - need AI to generate a response
          shouldSendPdf = false;
          const finalCompletion = await openai.chat.completions.create({
            model: MODEL,
            messages,
          });
          aiResponseContent = finalCompletion.choices[0].message.content || 'I apologize, but I could not find the invoice. Please verify the invoice number.';
        }
        
        const aiResponse: AIResponse = {
          content: aiResponseContent,
          tool_calls: [{
            id: toolCall.id,
            type: 'function',
            function: {
              name: 'get_invoice_info',
              arguments: toolCall.function.arguments,
            },
          }],
          invalid_tool_calls: [],
          additional_kwargs: {},
          response_metadata: {
            model: MODEL,
            finish_reason: 'stop',
          },
          // Only include PDF info if it's a PDF request
          invoicePdfUrl: (invoiceInfo && shouldSendPdf) ? invoiceInfo.pdfUrl : undefined,
          invoiceCaption: (invoiceInfo && shouldSendPdf) ? invoiceCaption : undefined,
          invoiceNumber: invoiceInfo?.invoiceNo,
        };
        
        // Save messages to memory
        console.log('Saving messages to Postgres memory...');
        await saveChatMessage(sessionId, 'human', userMessage);
        await saveChatMessage(sessionId, 'ai', aiResponseContent);
        console.log('Messages saved to Postgres memory');
        
        return aiResponse;
      }

      // Handle get_customer_account_info tool call
      if (toolCall.type === 'function' && 'function' in toolCall && toolCall.function.name === 'get_customer_account_info') {
        const args = JSON.parse(toolCall.function.arguments) as { identifier?: string };
        let identifier = args.identifier;

        // CRITICAL: Always use customer phone number from WhatsApp context if available
        // This ensures we search the database, not rely on chat history
        if (customerPhoneNumber) {
          console.log(`Using customer phone number from WhatsApp context: ${customerPhoneNumber}`);
          identifier = customerPhoneNumber;
          // Update the tool call arguments to reflect the actual identifier used
          toolCall.function.arguments = JSON.stringify({ identifier: customerPhoneNumber });
        } else if (!identifier) {
          console.log(`WARNING: No identifier provided and no customer phone number available`);
        } else {
          console.log(`Using provided identifier: ${identifier}`);
        }

        console.log(`get_customer_account_info tool called with identifier: ${identifier}`);

        // Get customer account information
        const accountInfo = await getCustomerAccountInfo(identifier || '');

        // Add tool response to messages
        if (toolCall.type === 'function' && 'function' in toolCall) {
          messages.push({
            role: 'assistant',
            content: null,
            tool_calls: [
              {
                id: toolCall.id,
                type: 'function',
                function: {
                  name: 'get_customer_account_info',
                  arguments: toolCall.function.arguments,
                },
              },
            ],
          });
        }

        // Build tool response with account information
        let toolResponse = '';
        if (accountInfo) {
          toolResponse = `Customer Account Information:\n`;
          if (accountInfo.customer) {
            toolResponse += `Customer: ${accountInfo.customer.name}`;
            if (accountInfo.customer.company && accountInfo.customer.company !== '-') {
              toolResponse += ` (${accountInfo.customer.company})`;
            }
            toolResponse += '\n';
          }
          toolResponse += `Order Count: ${accountInfo.orderCount}\n`;
          
          const formattedTotal = new Intl.NumberFormat('en-ZA', {
            style: 'currency',
            currency: 'ZAR',
          }).format(accountInfo.totalOrderValue);
          toolResponse += `Total Order Value: ${formattedTotal}\n`;
          
          if (accountInfo.lastOrderDate) {
            const lastOrderDate = new Date(accountInfo.lastOrderDate).toLocaleDateString('en-ZA', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            });
            toolResponse += `Last Order Date: ${lastOrderDate}\n`;
          } else {
            toolResponse += `Last Order Date: No orders yet\n`;
          }
          
          toolResponse += `\nQuotes (${accountInfo.quotes.length}):\n`;
          if (accountInfo.quotes.length > 0) {
            accountInfo.quotes.forEach((quote, index) => {
              const quoteDate = new Date(quote.createdAt).toLocaleDateString('en-ZA', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              });
              const quoteValue = quote.value !== null
                ? new Intl.NumberFormat('en-ZA', {
                    style: 'currency',
                    currency: 'ZAR',
                  }).format(quote.value)
                : 'N/A';
              toolResponse += `${index + 1}. ${quote.quoteNo} - ${quoteDate} - ${quoteValue}\n`;
            });
          } else {
            toolResponse += 'No quotes found\n';
          }
          
          toolResponse += `\nInvoices/Orders (${accountInfo.invoices.length}):\n`;
          if (accountInfo.invoices.length > 0) {
            accountInfo.invoices.forEach((invoice, index) => {
              const invoiceDate = new Date(invoice.createdAt).toLocaleDateString('en-ZA', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              });
              const invoiceValue = invoice.value !== null
                ? new Intl.NumberFormat('en-ZA', {
                    style: 'currency',
                    currency: 'ZAR',
                  }).format(invoice.value)
                : 'N/A';
              toolResponse += `${index + 1}. ${invoice.invoiceNo} - ${invoiceDate} - ${invoiceValue}\n`;
            });
          } else {
            toolResponse += 'No invoices/orders found\n';
          }
        } else {
          toolResponse = `No customer account information found for identifier: ${identifier || 'provided identifier'}. Please verify the identifier or contact support.`;
        }

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: toolResponse,
        });

        // Add customer information to system context if available
        if (accountInfo?.customer) {
          const customerContext = `\n\nCUSTOMER CONTEXT: The customer you are speaking with is ${accountInfo.customer.name}${accountInfo.customer.company && accountInfo.customer.company !== '-' ? ` from ${accountInfo.customer.company}` : ''}.${accountInfo.customer.email && accountInfo.customer.email !== '-' ? ` Their email is ${accountInfo.customer.email}.` : ''}${accountInfo.customer.phone && accountInfo.customer.phone !== '-' ? ` Their phone number is ${accountInfo.customer.phone}.` : ''} They have ${accountInfo.orderCount} orders with a total value of ${new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(accountInfo.totalOrderValue)}. Remember this information for the rest of the conversation.`;

          const systemMessageIndex = messages.findIndex(m => m.role === 'system');
          if (systemMessageIndex !== -1 && typeof messages[systemMessageIndex].content === 'string') {
            messages[systemMessageIndex].content += customerContext;
          }
        }

        // Get final response from AI
        const finalCompletion = await openai.chat.completions.create({
          model: MODEL,
          messages,
        });

        const aiResponseContent = finalCompletion.choices[0].message.content || 'I apologize, but I encountered an error processing your request.';

        // Extract metadata from the completion
        const toolCalls: ToolCall[] = [];
        if (finalCompletion.choices[0].message.tool_calls) {
          for (const tc of finalCompletion.choices[0].message.tool_calls) {
            if (tc.type === 'function' && 'function' in tc) {
              toolCalls.push({
                id: tc.id,
                type: tc.type,
                function: {
                  name: tc.function.name,
                  arguments: tc.function.arguments,
                },
              });
            }
          }
        }

        const aiResponse: AIResponse = {
          content: aiResponseContent,
          tool_calls: toolCalls,
          invalid_tool_calls: [],
          additional_kwargs: {},
          response_metadata: {
            model: finalCompletion.model,
            finish_reason: finalCompletion.choices[0].finish_reason,
          },
        };

        // Save messages to memory
        console.log('Saving messages to Postgres memory...');
        await saveChatMessage(sessionId, 'human', userMessage);
        await saveChatMessage(sessionId, 'ai', aiResponseContent);
        console.log('Messages saved to Postgres memory');

        return aiResponse;
      }

      // Handle get_order_details tool call
      if (toolCall.type === 'function' && 'function' in toolCall && toolCall.function.name === 'get_order_details') {
        const args = JSON.parse(toolCall.function.arguments) as { invoice_number: string };
        const invoiceNumber = args.invoice_number;

        console.log(`get_order_details tool called with invoice number: ${invoiceNumber}`);

        // Get order details
        const orderDetails = await getOrderDetails(invoiceNumber);

        // Add tool response to messages
        if (toolCall.type === 'function' && 'function' in toolCall) {
          messages.push({
            role: 'assistant',
            content: null,
            tool_calls: [
              {
                id: toolCall.id,
                type: 'function',
                function: {
                  name: 'get_order_details',
                  arguments: toolCall.function.arguments,
                },
              },
            ],
          });
        }

        // Build tool response with order details
        let toolResponse = '';
        if (orderDetails) {
          toolResponse = `Order Details for Invoice: ${orderDetails.invoiceNumber}\n`;
          toolResponse += `Quote Number: ${orderDetails.quoteNumber}\n\n`;
          toolResponse += `Items (${orderDetails.items.length} items):\n`;
          
          orderDetails.items.forEach((item, index) => {
            toolResponse += `\n${index + 1}. ${item.description}`;
            if (item.quantity) {
              toolResponse += ` - Quantity: ${item.quantity}`;
            }
            if (item.colour) {
              toolResponse += ` - Color: ${item.colour}`;
            }
            if (item.size) {
              toolResponse += ` - Size: ${item.size}`;
            }
            if (item.price) {
              const formattedPrice = new Intl.NumberFormat('en-ZA', {
                style: 'currency',
                currency: 'ZAR',
              }).format(item.price);
              toolResponse += ` - Price: ${formattedPrice}`;
            }
            if (item.stock_code) {
              toolResponse += ` - Stock Code: ${item.stock_code}`;
            }
          });

          if (orderDetails.customer) {
            toolResponse += `\n\nCustomer: ${orderDetails.customer.name}`;
            if (orderDetails.customer.company && orderDetails.customer.company !== '-') {
              toolResponse += ` (${orderDetails.customer.company})`;
            }
          }
        } else {
          toolResponse = `Order not found for invoice number: ${invoiceNumber}. Please verify the invoice number.`;
        }

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: toolResponse,
        });

        // Add customer information to system context if available
        if (orderDetails?.customer) {
          const customerContext = `\n\nCUSTOMER CONTEXT: The customer you are speaking with is ${orderDetails.customer.name}${orderDetails.customer.company && orderDetails.customer.company !== '-' ? ` from ${orderDetails.customer.company}` : ''}.${orderDetails.customer.email && orderDetails.customer.email !== '-' ? ` Their email is ${orderDetails.customer.email}.` : ''}${orderDetails.customer.phone && orderDetails.customer.phone !== '-' ? ` Their phone number is ${orderDetails.customer.phone}.` : ''} Remember this information for the rest of the conversation.`;

          const systemMessageIndex = messages.findIndex(m => m.role === 'system');
          if (systemMessageIndex !== -1 && typeof messages[systemMessageIndex].content === 'string') {
            messages[systemMessageIndex].content += customerContext;
          }
        }

        // Get final response from AI
        const finalCompletion = await openai.chat.completions.create({
          model: MODEL,
          messages,
        });

        const aiResponseContent = finalCompletion.choices[0].message.content || 'I apologize, but I encountered an error processing your request.';

        // Extract metadata from the completion
        const toolCalls: ToolCall[] = [];
        if (finalCompletion.choices[0].message.tool_calls) {
          for (const tc of finalCompletion.choices[0].message.tool_calls) {
            if (tc.type === 'function' && 'function' in tc) {
              toolCalls.push({
                id: tc.id,
                type: tc.type,
                function: {
                  name: tc.function.name,
                  arguments: tc.function.arguments,
                },
              });
            }
          }
        }

        const aiResponse: AIResponse = {
          content: aiResponseContent,
          tool_calls: toolCalls,
          invalid_tool_calls: [],
          additional_kwargs: {},
          response_metadata: {
            model: finalCompletion.model,
            finish_reason: finalCompletion.choices[0].finish_reason,
          },
        };

        // Save messages to memory
        console.log('Saving messages to Postgres memory...');
        await saveChatMessage(sessionId, 'human', userMessage);
        await saveChatMessage(sessionId, 'ai', aiResponseContent);
        console.log('Messages saved to Postgres memory');

        return aiResponse;
      }

      // Handle get_delivery_info tool call
      if (toolCall.type === 'function' && 'function' in toolCall && toolCall.function.name === 'get_delivery_info') {
        const args = JSON.parse(toolCall.function.arguments) as { invoice_number: string };
        const invoiceNumber = args.invoice_number;

        console.log(`get_delivery_info tool called with invoice number: ${invoiceNumber}`);

        // Get delivery information
        const deliveryInfo = await getDeliveryInfo(invoiceNumber);

        // Add tool response to messages
        if (toolCall.type === 'function' && 'function' in toolCall) {
          messages.push({
            role: 'assistant',
            content: null,
            tool_calls: [
              {
                id: toolCall.id,
                type: 'function',
                function: {
                  name: 'get_delivery_info',
                  arguments: toolCall.function.arguments,
                },
              },
            ],
          });
        }

        // Build tool response with delivery information
        let toolResponse = '';
        if (deliveryInfo) {
          toolResponse = `Delivery Information for Invoice: ${deliveryInfo.invoiceNumber}\n\n`;
          toolResponse += `Delivery Method: ${deliveryInfo.isDelivery ? 'Delivery' : 'Collection'}\n`;
          
          if (deliveryInfo.isDelivery && deliveryInfo.deliveryAddress) {
            toolResponse += `\nDelivery Address:\n`;
            const addr = deliveryInfo.deliveryAddress;
            if (addr.street) toolResponse += `${addr.street}\n`;
            if (addr.suburb) toolResponse += `${addr.suburb}\n`;
            if (addr.city) toolResponse += `${addr.city}`;
            if (addr.province) {
              toolResponse += addr.city ? `, ${addr.province}` : addr.province;
            }
            if (addr.postal_code) {
              toolResponse += addr.province || addr.city ? ` ${addr.postal_code}` : addr.postal_code;
            }
            if (addr.country) {
              toolResponse += `\n${addr.country}`;
            }
          } else if (!deliveryInfo.isDelivery) {
            toolResponse += `\nThis order is for collection. Please collect from our warehouse.`;
          } else {
            toolResponse += `\nDelivery address not available.`;
          }

          if (deliveryInfo.customer) {
            toolResponse += `\n\nCustomer: ${deliveryInfo.customer.name}`;
            if (deliveryInfo.customer.company && deliveryInfo.customer.company !== '-') {
              toolResponse += ` (${deliveryInfo.customer.company})`;
            }
          }

          // Note: Delivery date is not available from Barron API, so we don't include it
          toolResponse += `\n\nNote: For delivery date information, please contact our support team.`;
        } else {
          toolResponse = `Order not found for invoice number: ${invoiceNumber}. Please verify the invoice number.`;
        }

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: toolResponse,
        });

        // Add customer information to system context if available
        if (deliveryInfo?.customer) {
          const customerContext = `\n\nCUSTOMER CONTEXT: The customer you are speaking with is ${deliveryInfo.customer.name}${deliveryInfo.customer.company && deliveryInfo.customer.company !== '-' ? ` from ${deliveryInfo.customer.company}` : ''}.${deliveryInfo.customer.email && deliveryInfo.customer.email !== '-' ? ` Their email is ${deliveryInfo.customer.email}.` : ''}${deliveryInfo.customer.phone && deliveryInfo.customer.phone !== '-' ? ` Their phone number is ${deliveryInfo.customer.phone}.` : ''} Remember this information for the rest of the conversation.`;

          const systemMessageIndex = messages.findIndex(m => m.role === 'system');
          if (systemMessageIndex !== -1 && typeof messages[systemMessageIndex].content === 'string') {
            messages[systemMessageIndex].content += customerContext;
          }
        }

        // Get final response from AI
        const finalCompletion = await openai.chat.completions.create({
          model: MODEL,
          messages,
        });

        const aiResponseContent = finalCompletion.choices[0].message.content || 'I apologize, but I encountered an error processing your request.';

        // Extract metadata from the completion
        const toolCalls: ToolCall[] = [];
        if (finalCompletion.choices[0].message.tool_calls) {
          for (const tc of finalCompletion.choices[0].message.tool_calls) {
            if (tc.type === 'function' && 'function' in tc) {
              toolCalls.push({
                id: tc.id,
                type: tc.type,
                function: {
                  name: tc.function.name,
                  arguments: tc.function.arguments,
                },
              });
            }
          }
        }

        const aiResponse: AIResponse = {
          content: aiResponseContent,
          tool_calls: toolCalls,
          invalid_tool_calls: [],
          additional_kwargs: {},
          response_metadata: {
            model: finalCompletion.model,
            finish_reason: finalCompletion.choices[0].finish_reason,
          },
        };

        // Save messages to memory
        console.log('Saving messages to Postgres memory...');
        await saveChatMessage(sessionId, 'human', userMessage);
        await saveChatMessage(sessionId, 'ai', aiResponseContent);
        console.log('Messages saved to Postgres memory');

        return aiResponse;
      }

      // Handle escalate_to_human tool call
      if (toolCall.type === 'function' && 'function' in toolCall && toolCall.function.name === 'escalate_to_human') {
        const args = JSON.parse(toolCall.function.arguments) as { reason: string; conversation_summary?: string };
        const reason = args.reason;
        const conversationSummary = args.conversation_summary;

        console.log(`escalate_to_human tool called with reason: ${reason}`);

        // Get conversation history for context
        const history = await getChatHistory(sessionId);
        const conversationContext = history
          .slice(-10) // Last 10 messages for context
          .map(msg => `${msg.role === 'human' ? 'Customer' : 'AI'}: ${msg.content}`)
          .join('\n');

        // Build escalation context
        const escalationContext: EscalationContext = {
          reason,
          conversationSummary: conversationSummary || conversationContext,
          whatsappSessionId: sessionId,
        };

        // Try to get customer info from recent tool calls or conversation
        if (customerPhoneNumber) {
          escalationContext.customerPhone = customerPhoneNumber;
        }
        if (customerWhatsAppName) {
          escalationContext.customerName = customerWhatsAppName;
        }

        // Add tool response to messages
        if (toolCall.type === 'function' && 'function' in toolCall) {
          messages.push({
            role: 'assistant',
            content: null,
            tool_calls: [
              {
                id: toolCall.id,
                type: 'function',
                function: {
                  name: 'escalate_to_human',
                  arguments: toolCall.function.arguments,
                },
              },
            ],
          });
        }

        // Send escalation email
        let escalationResult = '';
        try {
          await sendEscalationEmail(escalationContext);
          escalationResult = 'Escalation email sent successfully to staff. Staff will take over the conversation shortly.';
          console.log('Escalation email sent successfully');
        } catch (error) {
          console.error('Error sending escalation email:', error);
          escalationResult = `Escalation requested but email failed to send: ${error instanceof Error ? error.message : String(error)}. Please contact support directly.`;
        }

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: escalationResult,
        });

        // Get final response from AI
        const finalCompletion = await openai.chat.completions.create({
          model: MODEL,
          messages,
        });

        const aiResponseContent = finalCompletion.choices[0].message.content || 'I have escalated your request to our team. A team member will be in touch with you shortly. Thank you for your patience!';

        // Extract metadata from the completion
        const toolCalls: ToolCall[] = [];
        if (finalCompletion.choices[0].message.tool_calls) {
          for (const tc of finalCompletion.choices[0].message.tool_calls) {
            if (tc.type === 'function' && 'function' in tc) {
              toolCalls.push({
                id: tc.id,
                type: tc.type,
                function: {
                  name: tc.function.name,
                  arguments: tc.function.arguments,
                },
              });
            }
          }
        }

        const aiResponse: AIResponse = {
          content: aiResponseContent,
          tool_calls: toolCalls,
          invalid_tool_calls: [],
          additional_kwargs: {},
          response_metadata: {
            model: finalCompletion.model,
            finish_reason: finalCompletion.choices[0].finish_reason,
          },
        };

        // Save messages to memory
        console.log('Saving messages to Postgres memory...');
        await saveChatMessage(sessionId, 'human', userMessage);
        await saveChatMessage(sessionId, 'ai', aiResponseContent);
        console.log('Messages saved to Postgres memory');

        return aiResponse;
      }
    }
    
    // No tool calls, just return the response
    const aiResponseContent = response.message.content || 'I apologize, but I encountered an error processing your request.';
    
    // Extract metadata from the completion
    const toolCalls: ToolCall[] = [];
    if (response.message.tool_calls) {
      for (const tc of response.message.tool_calls) {
        // Type guard: check if it's a function tool call
        if (tc.type === 'function' && 'function' in tc) {
          toolCalls.push({
            id: tc.id,
            type: tc.type,
            function: {
              name: tc.function.name,
              arguments: tc.function.arguments,
            },
          });
        }
      }
    }
    
    const aiResponse: AIResponse = {
      content: aiResponseContent,
      tool_calls: toolCalls,
      invalid_tool_calls: [],
      additional_kwargs: {},
      response_metadata: {
        model: completion.model,
        finish_reason: response.finish_reason,
      },
    };
    
    // Save messages to memory
    console.log('Saving messages to Postgres memory...');
    await saveChatMessage(sessionId, 'human', userMessage);
    await saveChatMessage(sessionId, 'ai', aiResponseContent);
    console.log('Messages saved to Postgres memory');
    
    return aiResponse;
  } catch (error) {
    console.error('Error processing message with AI:', error);
    throw error;
  }
}

