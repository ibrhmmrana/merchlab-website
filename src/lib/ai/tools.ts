/**
 * Shared tools definition for MerchLab AI agents (WhatsApp and Email)
 * This ensures both agents have access to the same tools
 */

/**
 * Get the complete tools array for MerchLab AI agents
 * Includes: order status, quotes, invoices, customer account, order details, delivery info, escalation, and knowledge base
 */
export function getMerchlabAgentTools(): Array<{
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: string;
      properties: Record<string, unknown>;
      required: string[];
    };
  };
}> {
  return [
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
        name: 'get_order_details',
        description: 'Get detailed information about items in an order by invoice number. Use this tool when a customer asks: "What items are in my order?", "What products did I order?", "What\'s the quantity of [product] in my order?". The tool requires an invoice number - if the customer hasn\'t provided one, ask them for their invoice number first. The tool will return: product list with descriptions, quantities, colors, sizes, and prices.',
        parameters: {
          type: 'object',
          properties: {
            invoice_number: {
              type: 'string',
              description: 'The invoice number for the order (e.g., "INV-Q553-HFKTH" or "Q553-HFKTH")',
            },
          },
          required: ['invoice_number'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'get_delivery_info',
        description: 'Get delivery information for an order by invoice number. Use this tool when a customer asks: "Is my order being delivered or collected?", "What\'s my delivery address?", "When will my order be delivered?". The tool requires an invoice number - if the customer hasn\'t provided one, ask them for their invoice number first. The tool will return: whether the order is delivery or collection, delivery address (if applicable), and customer information.',
        parameters: {
          type: 'object',
          properties: {
            invoice_number: {
              type: 'string',
              description: 'The invoice number for the order (e.g., "INV-Q553-HFKTH" or "Q553-HFKTH")',
            },
          },
          required: ['invoice_number'],
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
    {
      type: 'function',
      function: {
        name: 'search_merchlab_knowledge_base',
        description: 'MANDATORY: Use this tool to answer ANY question about MerchLab, including company information (website, contact details, about us), policies (refund policy, terms and conditions, privacy policy), shipping/delivery, payment methods, product information, or any factual information about MerchLab. You MUST call this tool FIRST before answering any question about MerchLab, even if you think you know the answer. The knowledge base is the authoritative source of truth. Examples: "What is your website?" → call this tool, "What is MerchLab?" → call this tool, "How do I contact you?" → call this tool, "What is your refund policy?" → call this tool. Search the knowledge base using semantic search to find relevant information chunks.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The user\'s question or search query about MerchLab. Examples: "What is your website?", "What is MerchLab?", "How do I contact MerchLab?", "What is your refund policy?", "What are your terms and conditions?", "How does shipping work?", "What is your privacy policy?", "MerchLab company information", "MerchLab contact details". Always use the exact question or a close paraphrase.',
            },
            topK: {
              type: 'number',
              description: 'Optional. Number of knowledge base chunks to return (default: 5, max: 50). Use 5 for most queries.',
            },
            doc_type: {
              type: 'string',
              description: 'Optional. Filter to narrow search to a specific document type. Use values like: "terms_conditions", "privacy_policy", "refund_policy", "general_info", etc. Only use if you need to search a specific document type.',
            },
          },
          required: ['query'],
        },
      },
    },
  ];
}

