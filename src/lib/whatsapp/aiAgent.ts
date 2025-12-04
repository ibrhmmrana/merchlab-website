import OpenAI from 'openai';
import { getChatHistory, saveChatMessage } from './memory';
import { getOrderStatus } from './orderStatus';
import { getQuoteInfo } from './quoteInfo';

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
- NEVER mention the cost or price (totalIncVat) of orders to customers
- Only provide the order status, not financial information
- REMEMBER customer information from previous interactions - if you've checked an order status, you know the customer's name, email, and other details
- When a customer asks about their information (name, email, etc.), use the information you've already retrieved from order status checks
- If you don't know something, politely say you'll need to check with the team
- Use emojis sparingly and only when appropriate

When checking order status:
- Ask the customer for their invoice number
- Once provided, use the get_order_status tool to check
- The tool will return the order status and customer information
- Always acknowledge the customer by name when providing order status (e.g., "Hi [Customer Name], your order...")
- If customer information is available, personalize your response
- Report the status in a friendly, clear manner
- If the order is not found, apologize and ask them to verify the invoice number

When handling quote requests:
- If a customer asks about their quote, wants to see their quote, needs the quote PDF, or asks "can you send me my quote", use the get_quote_info tool
- Ask for the quote number if not provided (format: "Q553-HFKTH" or "ML-DM618")
- The tool will return quote information including a PDF URL
- Always acknowledge the customer by name when providing quote information
- Provide a friendly message confirming you're sending their quote PDF
- The PDF will be sent automatically after your message`;

/**
 * Process a message with the AI agent
 */
export async function processMessage(
  sessionId: string,
  userMessage: string
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
            description: 'Get quote information by quote number. The quote number can be in formats like "Q553-HFKTH" or "ML-DM618". Use this when customers ask about their quote, want to see their quote, need the quote PDF, or want to know quote details. Always ask for the quote number if not provided.',
            parameters: {
              type: 'object',
              properties: {
                quote_number: {
                  type: 'string',
                  description: 'The quote number provided by the customer (e.g., "Q553-HFKTH" or "ML-DM618")',
                },
              },
              required: ['quote_number'],
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
          toolResponse += `\nPDF URL: ${quoteInfo.pdfUrl}`;
        } else {
          toolResponse = `Quote not found for quote number: ${quoteNumber}. Please verify the quote number.`;
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
        
        // Build a well-structured caption for PDF that includes all the information
        let quoteCaption = '';
        if (quoteInfo) {
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
          quoteCaption += '\nYour quote PDF is attached below. If you have any questions or would like to proceed with this quote, please let me know! 😊';
        } else {
          quoteCaption = aiResponseContent; // Fallback to AI response if quote not found
        }
        
        const aiResponse: AIResponse = {
          content: aiResponseContent, // Keep for logging/memory, but won't be sent
          tool_calls: toolCalls,
          invalid_tool_calls: [],
          additional_kwargs: {},
          response_metadata: {
            model: finalCompletion.model,
            finish_reason: finalCompletion.choices[0].finish_reason,
          },
          quotePdfUrl: quoteInfo?.pdfUrl,
          quoteCaption: quoteInfo ? quoteCaption : undefined,
          quoteNumber: quoteInfo?.quoteNo, // Add quote number for filename
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

