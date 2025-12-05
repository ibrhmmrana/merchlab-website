import OpenAI from 'openai';
import { getChatHistory, saveChatMessage } from './memory';
import { getOrderStatus } from './orderStatus';
import { getQuoteInfo, getMostRecentQuoteByPhone } from './quoteInfo';

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
- Ask for the quote number if not provided (format: "Q553-HFKTH" or "ML-DM618")
- The tool will return quote information including total amount, items with quantities and descriptions, and all quote details
- You MUST share the quote total amount with customers - it is the final price they will pay (including VAT if applicable)
- You can share ALL quote information with the customer EXCEPT base_price and beforeVAT fields (these are internal costs and should never be mentioned)
- Always acknowledge the customer by name when providing quote information
- When answering questions about quote items, use the items array from the tool response to list products, quantities, descriptions, colors, sizes, etc.
- When sending a quote PDF, the PDF will be sent automatically with a caption`;

/**
 * Process a message with the AI agent
 */
export async function processMessage(
  sessionId: string,
  userMessage: string,
  customerPhoneNumber?: string
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
            description: 'Get quote information by quote number or phone number. Use this tool whenever a customer asks about their quote, including: 1) When they ask to resend/send the quote PDF, 2) When they ask about quote details (items, total, quantities, descriptions, etc.), 3) When they ask follow-up questions about a quote (e.g., "What items are in my quote?", "What\'s the total?", "What products did I order?"). If the customer says "my quote" or "send me my quote" without providing a quote number, use their phone number to find their most recent quote. Always call this tool to get accurate, up-to-date quote information rather than relying on memory. The tool will return all quote details including items, quantities, descriptions, total amount, and customer information.',
            parameters: {
              type: 'object',
              properties: {
                quote_number: {
                  type: 'string',
                  description: 'The quote number provided by the customer (e.g., "Q553-HFKTH" or "ML-DM618"). If the customer mentions a quote number in the conversation, use that. If they ask about "my quote" or "the quote" without specifying a quote number, leave this empty and use phone_number instead.',
                },
                phone_number: {
                  type: 'string',
                  description: 'The customer\'s phone number. Use this when the customer asks about "my quote" or "send me my quote" without providing a specific quote number. The phone number will be used to find their most recent quote.',
                },
              },
              required: [],
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
        const args = JSON.parse(toolCall.function.arguments) as { quote_number: string };
        const quoteNumber = args.quote_number;
        
        // Get quote information
        const quoteInfo = await getQuoteInfo(quoteNumber);
        
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
                  name: 'get_quote_info',
                  arguments: toolCall.function.arguments,
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
                            userMessageLower.includes('quote') && (userMessageLower.includes('please') || userMessageLower.includes('can you'));
        
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

