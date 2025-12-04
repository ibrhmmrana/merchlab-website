import OpenAI from 'openai';
import { getChatHistory, saveChatMessage } from './memory';
import { getOrderStatus } from './orderStatus';

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
- If you don't know something, politely say you'll need to check with the team
- Use emojis sparingly and only when appropriate

When checking order status:
- Ask the customer for their invoice number
- Once provided, use the get_order_status tool to check
- Report the status in a friendly, clear manner
- If the order is not found, apologize and ask them to verify the invoice number`;

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
      ],
      tool_choice: 'auto',
    });
    
    const response = completion.choices[0];
    
    // Handle tool calls
    if (response.message.tool_calls && response.message.tool_calls.length > 0) {
      const toolCall = response.message.tool_calls[0];
      
      if (toolCall.function.name === 'get_order_status') {
        const args = JSON.parse(toolCall.function.arguments);
        const invoiceNumber = args.invoice_number;
        
        // Get order status
        const orderStatus = await getOrderStatus(invoiceNumber);
        
        // Add tool response to messages
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
        
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: orderStatus 
            ? `Order status: ${orderStatus}`
            : `Order not found for invoice number: ${invoiceNumber}. Please verify the invoice number.`,
        });
        
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
        await saveChatMessage(sessionId, 'human', userMessage);
        await saveChatMessage(sessionId, 'ai', aiResponseContent);
        
        return aiResponse;
      }
    }
    
    // No tool calls, just return the response
    const aiResponseContent = response.message.content || 'I apologize, but I encountered an error processing your request.';
    
    // Extract metadata from the completion
    const toolCalls: ToolCall[] = [];
    if (response.message.tool_calls) {
      for (const tc of response.message.tool_calls) {
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
    await saveChatMessage(sessionId, 'human', userMessage);
    await saveChatMessage(sessionId, 'ai', aiResponseContent);
    
    return aiResponse;
  } catch (error) {
    console.error('Error processing message with AI:', error);
    throw error;
  }
}

