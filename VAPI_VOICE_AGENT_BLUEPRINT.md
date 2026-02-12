# Vapi Voice Agent Configuration Blueprint
## MerchLab WhatsApp Chatbot → Vapi Voice Agent Conversion

**Date:** 2025-01-28  
**Approach:** Using Vapi "API Request" tools (not function tools)  
**Authentication:** Single Bearer token credential shared across all tools

---

## Table of Contents

1. [Vapi API Request Tool Setup Cards](#vapi-api-request-tool-setup-cards)
2. [Backend Endpoint Contracts](#backend-endpoint-contracts)
3. [Voice Agent System Prompt](#voice-agent-system-prompt)
4. [Environment Variables Required](#environment-variables-required)

---

## Vapi API Request Tool Setup Cards

### Prerequisites: Create Custom Credential First

**In Vapi Dashboard → Credentials → Create New:**

- **Credential Name:** `merchlab-api-bearer-token`
- **Type:** Custom Credential
- **Value:** `{{VAPI_API_TOOL_BEARER_TOKEN}}` (or store the actual token value)
- **Note:** This will be referenced as `merchlab-api-bearer-token` in all tools below

---

### Tool A: get_order_status

**Base Configuration:**
- **Tool Name:** `get_order_status`
- **Request URL:** `{{PUBLIC_BASE_URL}}/api/vapi/get-order-status`
  - Example: `https://merchlab.io/api/vapi/get-order-status`
- **Request HTTP Method:** `POST`

**Authorization:**
- **Credential Name:** `merchlab-api-bearer-token`
- **Header Name:** `Authorization`
- **Header Value:** `Bearer {{merchlab-api-bearer-token}}`

**Request Headers:**
- `Content-Type`: `application/json`

**Request Body Properties:**
| Property Name | Type | Required | Description | Default Value |
|--------------|------|----------|-------------|---------------|
| `caller_phone` | string | Yes | Caller's phone number from Vapi | `{{call.phoneNumber}}` or `{{call.from}}` |
| `invoice_number` | string | Yes | Invoice number (e.g., "INV-Q553-HFKTH" or "Q553-HFKTH") | (none) |

**Response Body Variables:**
- **Extract Variables:** No (model reads full JSON response)
- **Response Shape:** See Backend Endpoint Contracts section

**Messages:**
- **Processing Message:** "One moment while I check your order status."

---

### Tool B: get_quote_info

**Base Configuration:**
- **Tool Name:** `get_quote_info`
- **Request URL:** `{{PUBLIC_BASE_URL}}/api/vapi/get-quote-info`
  - Example: `https://merchlab.io/api/vapi/get-quote-info`
- **Request HTTP Method:** `POST`

**Authorization:**
- **Credential Name:** `merchlab-api-bearer-token`
- **Header Name:** `Authorization`
- **Header Value:** `Bearer {{merchlab-api-bearer-token}}`

**Request Headers:**
- `Content-Type`: `application/json`

**Request Body Properties:**
| Property Name | Type | Required | Description | Default Value |
|--------------|------|----------|-------------|---------------|
| `caller_phone` | string | Yes | Caller's phone number from Vapi | `{{call.phoneNumber}}` or `{{call.from}}` |
| `quote_number` | string | No | Quote number (e.g., "Q553-HFKTH" or "ML-DM618"). Leave empty for "my quote" lookup | (empty string) |

**Response Body Variables:**
- **Extract Variables:** No (model reads full JSON response)
- **Response Shape:** See Backend Endpoint Contracts section

**Messages:**
- **Processing Message:** "Let me look up your quote information."

---

### Tool C: get_invoice_info

**Base Configuration:**
- **Tool Name:** `get_invoice_info`
- **Request URL:** `{{PUBLIC_BASE_URL}}/api/vapi/get-invoice-info`
  - Example: `https://merchlab.io/api/vapi/get-invoice-info`
- **Request HTTP Method:** `POST`

**Authorization:**
- **Credential Name:** `merchlab-api-bearer-token`
- **Header Name:** `Authorization`
- **Header Value:** `Bearer {{merchlab-api-bearer-token}}`

**Request Headers:**
- `Content-Type`: `application/json`

**Request Body Properties:**
| Property Name | Type | Required | Description | Default Value |
|--------------|------|----------|-------------|---------------|
| `caller_phone` | string | Yes | Caller's phone number from Vapi | `{{call.phoneNumber}}` or `{{call.from}}` |
| `invoice_number` | string | No | Invoice number (e.g., "INV-Q553-HFKTH" or "Q553-HFKTH"). Leave empty for "my invoice" lookup | (empty string) |

**Response Body Variables:**
- **Extract Variables:** No (model reads full JSON response)
- **Response Shape:** See Backend Endpoint Contracts section

**Messages:**
- **Processing Message:** "Let me retrieve your invoice details."

---

### Tool D: get_customer_account_info

**Base Configuration:**
- **Tool Name:** `get_customer_account_info`
- **Request URL:** `{{PUBLIC_BASE_URL}}/api/vapi/get-customer-account-info`
  - Example: `https://merchlab.io/api/vapi/get-customer-account-info`
- **Request HTTP Method:** `POST`

**Authorization:**
- **Credential Name:** `merchlab-api-bearer-token`
- **Header Name:** `Authorization`
- **Header Value:** `Bearer {{merchlab-api-bearer-token}}`

**Request Headers:**
- `Content-Type`: `application/json`

**Request Body Properties:**
| Property Name | Type | Required | Description | Default Value |
|--------------|------|----------|-------------|---------------|
| `caller_phone` | string | Yes | Caller's phone number from Vapi | `{{call.phoneNumber}}` or `{{call.from}}` |
| `identifier` | string | No | Optional identifier (quote number, invoice number, email, or name). If empty, uses caller_phone | (empty string) |

**Response Body Variables:**
- **Extract Variables:** No (model reads full JSON response)
- **Response Shape:** See Backend Endpoint Contracts section

**Messages:**
- **Processing Message:** "Let me pull up your account information."

---

### Tool E: get_order_details

**Base Configuration:**
- **Tool Name:** `get_order_details`
- **Request URL:** `{{PUBLIC_BASE_URL}}/api/vapi/get-order-details`
  - Example: `https://merchlab.io/api/vapi/get-order-details`
- **Request HTTP Method:** `POST`

**Authorization:**
- **Credential Name:** `merchlab-api-bearer-token`
- **Header Name:** `Authorization`
- **Header Value:** `Bearer {{merchlab-api-bearer-token}}`

**Request Headers:**
- `Content-Type`: `application/json`

**Request Body Properties:**
| Property Name | Type | Required | Description | Default Value |
|--------------|------|----------|-------------|---------------|
| `caller_phone` | string | Yes | Caller's phone number from Vapi | `{{call.phoneNumber}}` or `{{call.from}}` |
| `invoice_number` | string | Yes | Invoice number for the order | (none) |

**Response Body Variables:**
- **Extract Variables:** No (model reads full JSON response)
- **Response Shape:** See Backend Endpoint Contracts section

**Messages:**
- **Processing Message:** "Let me get the details of your order items."

---

### Tool F: get_delivery_info

**Base Configuration:**
- **Tool Name:** `get_delivery_info`
- **Request URL:** `{{PUBLIC_BASE_URL}}/api/vapi/get-delivery-info`
  - Example: `https://merchlab.io/api/vapi/get-delivery-info`
- **Request HTTP Method:** `POST`

**Authorization:**
- **Credential Name:** `merchlab-api-bearer-token`
- **Header Name:** `Authorization`
- **Header Value:** `Bearer {{merchlab-api-bearer-token}}`

**Request Headers:**
- `Content-Type`: `application/json`

**Request Body Properties:**
| Property Name | Type | Required | Description | Default Value |
|--------------|------|----------|-------------|---------------|
| `caller_phone` | string | Yes | Caller's phone number from Vapi | `{{call.phoneNumber}}` or `{{call.from}}` |
| `invoice_number` | string | Yes | Invoice number for the order | (none) |

**Response Body Variables:**
- **Extract Variables:** No (model reads full JSON response)
- **Response Shape:** See Backend Endpoint Contracts section

**Messages:**
- **Processing Message:** "Let me check your delivery information."

---

### Tool G: escalate_to_human

**Base Configuration:**
- **Tool Name:** `escalate_to_human`
- **Request URL:** `{{PUBLIC_BASE_URL}}/api/vapi/escalate-to-human`
  - Example: `https://merchlab.io/api/vapi/escalate-to-human`
- **Request HTTP Method:** `POST`

**Authorization:**
- **Credential Name:** `merchlab-api-bearer-token`
- **Header Name:** `Authorization`
- **Header Value:** `Bearer {{merchlab-api-bearer-token}}`

**Request Headers:**
- `Content-Type`: `application/json`

**Request Body Properties:**
| Property Name | Type | Required | Description | Default Value |
|--------------|------|----------|-------------|---------------|
| `caller_phone` | string | Yes | Caller's phone number from Vapi | `{{call.phoneNumber}}` or `{{call.from}}` |
| `reason` | string | Yes | Reason for escalation (e.g., "Customer requested human", "Complex issue") | (none) |
| `conversation_summary` | string | No | Brief summary of conversation context | (empty string) |

**Response Body Variables:**
- **Extract Variables:** No (model reads full JSON response)
- **Response Shape:** See Backend Endpoint Contracts section

**Messages:**
- **Processing Message:** "I'm connecting you with our support team."

---

### Tool H: search_merchlab_knowledge_base

**Base Configuration:**
- **Tool Name:** `search_merchlab_knowledge_base`
- **Request URL:** `{{PUBLIC_BASE_URL}}/api/vapi/search-knowledge-base`
  - Example: `https://merchlab.io/api/vapi/search-knowledge-base`
- **Request HTTP Method:** `POST`

**Authorization:**
- **Credential Name:** `merchlab-api-bearer-token`
- **Header Name:** `Authorization`
- **Header Value:** `Bearer {{merchlab-api-bearer-token}}`

**Request Headers:**
- `Content-Type`: `application/json`

**Request Body Properties:**
| Property Name | Type | Required | Description | Default Value |
|--------------|------|----------|-------------|---------------|
| `caller_phone` | string | Yes | Caller's phone number from Vapi | `{{call.phoneNumber}}` or `{{call.from}}` |
| `query` | string | Yes | Search query or question about MerchLab | (none) |
| `topK` | number | No | Number of results to return (default: 5, max: 50) | `5` |
| `doc_type` | string | No | Optional filter by document type (e.g., "refund_policy", "terms_conditions") | (empty string) |

**Response Body Variables:**
- **Extract Variables:** No (model reads full JSON response)
- **Response Shape:** See Backend Endpoint Contracts section

**Messages:**
- **Processing Message:** "Let me search our knowledge base for that information."

---

### Tool I: send_whatsapp_message

**Base Configuration:**
- **Tool Name:** `send_whatsapp_message`
- **Request URL:** `{{PUBLIC_BASE_URL}}/api/vapi/send-whatsapp-message`
  - Example: `https://merchlab.io/api/vapi/send-whatsapp-message`
- **Request HTTP Method:** `POST`

**Authorization:**
- **Credential Name:** `merchlab-api-bearer-token`
- **Header Name:** `Authorization`
- **Header Value:** `Bearer {{merchlab-api-bearer-token}}`

**Request Headers:**
- `Content-Type`: `application/json`

**Request Body Properties:**
| Property Name | Type | Required | Description | Default Value |
|--------------|------|----------|-------------|---------------|
| `caller_phone` | string | Yes | Recipient phone number (usually same as caller) | `{{call.phoneNumber}}` or `{{call.from}}` |
| `message` | string | Yes | Text message to send via WhatsApp | (none) |

**Response Body Variables:**
- **Extract Variables:** No (model reads full JSON response)
- **Response Shape:** See Backend Endpoint Contracts section

**Messages:**
- **Processing Message:** "Sending that to your WhatsApp now."

---

### Tool J: send_whatsapp_pdf

**Base Configuration:**
- **Tool Name:** `send_whatsapp_pdf`
- **Request URL:** `{{PUBLIC_BASE_URL}}/api/vapi/send-whatsapp-pdf`
  - Example: `https://merchlab.io/api/vapi/send-whatsapp-pdf`
- **Request HTTP Method:** `POST`

**Authorization:**
- **Credential Name:** `merchlab-api-bearer-token`
- **Header Name:** `Authorization`
- **Header Value:** `Bearer {{merchlab-api-bearer-token}}`

**Request Headers:**
- `Content-Type`: `application/json`

**Request Body Properties:**
| Property Name | Type | Required | Description | Default Value |
|--------------|------|----------|-------------|---------------|
| `caller_phone` | string | Yes | Recipient phone number (usually same as caller) | `{{call.phoneNumber}}` or `{{call.from}}` |
| `document_url` | string | Yes | Public URL of the PDF document | (none) |
| `caption` | string | Yes | Caption text to include with the PDF | (none) |
| `filename` | string | No | Filename for the document (defaults to extracting from URL) | (empty string) |

**Response Body Variables:**
- **Extract Variables:** No (model reads full JSON response)
- **Response Shape:** See Backend Endpoint Contracts section

**Messages:**
- **Processing Message:** "Sending the PDF to your WhatsApp now."

---

## Backend Endpoint Contracts

All endpoints follow this standard structure:

### Request Format (All Tools)

```json
{
  "caller_phone": "string",
  "args": {
    // Tool-specific arguments (see each tool below)
  }
}
```

### Success Response Format (All Tools)

```json
{
  "ok": true,
  "data": {
    // Tool-specific data (see each tool below)
  },
  "spoken_summary": "Short sentence the model can read out loud"
}
```

### Error Response Format (All Tools)

```json
{
  "ok": false,
  "error": "Short user-facing error message",
  "hint": "What the agent should ask next (e.g., 'Please provide your invoice number')"
}
```

---

### Endpoint A: POST /api/vapi/get-order-status

**Request Body:**
```json
{
  "caller_phone": "27693475825",
  "args": {
    "invoice_number": "INV-Q553-HFKTH"
  }
}
```

**Success Response:**
```json
{
  "ok": true,
  "data": {
    "invoice_number": "INV-Q553-HFKTH",
    "status": "Processing",
    "customer": {
      "name": "John Doe",
      "company": "Acme Corp",
      "email": "john@acme.com",
      "phone": "27693475825"
    }
  },
  "spoken_summary": "Your order with invoice INV-Q553-HFKTH is currently Processing. I can see it's for John Doe from Acme Corp."
}
```

**Error Response:**
```json
{
  "ok": false,
  "error": "Order not found for that invoice number.",
  "hint": "Please verify the invoice number and try again."
}
```

---

### Endpoint B: POST /api/vapi/get-quote-info

**Request Body:**
```json
{
  "caller_phone": "27693475825",
  "args": {
    "quote_number": "Q553-HFKTH"
    // OR empty string "" for "my quote" lookup by phone
  }
}
```

**Success Response:**
```json
{
  "ok": true,
  "data": {
    "quote_no": "Q553-HFKTH",
    "customer": {
      "name": "John Doe",
      "company": "Acme Corp",
      "email": "john@acme.com",
      "phone": "27693475825"
    },
    "pdf_url": "https://fxsqdpmmddcidjwzxtpc.supabase.co/storage/v1/object/public/audit-reports/Q553-HFKTH.pdf",
    "created_at": "2025-01-15T10:30:00Z",
    "value": 12500.50,
    "items": [
      {
        "description": "Custom T-Shirt",
        "quantity": 50,
        "colour": "Blue",
        "size": "Large",
        "price": 250.00
      }
    ],
    "shareable_details": {
      // All quote details EXCEPT base_price and beforeVAT
      "items": [...],
      "totals": {
        "grand_total": 12500.50
      }
    }
  },
  "spoken_summary": "I found your quote Q553-HFKTH dated January 15th with a total of R12,500.50. It includes 50 Custom T-Shirts in Blue, Large size."
}
```

**Error Response:**
```json
{
  "ok": false,
  "error": "No quote found for your phone number.",
  "hint": "Please provide a specific quote number or contact support."
}
```

---

### Endpoint C: POST /api/vapi/get-invoice-info

**Request Body:**
```json
{
  "caller_phone": "27693475825",
  "args": {
    "invoice_number": "INV-Q553-HFKTH"
    // OR empty string "" for "my invoice" lookup by phone
  }
}
```

**Success Response:**
```json
{
  "ok": true,
  "data": {
    "invoice_no": "INV-Q553-HFKTH",
    "customer": {
      "name": "John Doe",
      "company": "Acme Corp",
      "email": "john@acme.com",
      "phone": "27693475825"
    },
    "pdf_url": "https://fxsqdpmmddcidjwzxtpc.supabase.co/storage/v1/object/public/audit-reports/INV-Q553-HFKTH.pdf",
    "created_at": "2025-01-20T14:00:00Z",
    "value": 12500.50,
    "items": [
      {
        "description": "Custom T-Shirt",
        "quantity": 50,
        "colour": "Blue",
        "size": "Large",
        "price": 250.00
      }
    ],
    "shareable_details": {
      // All invoice details EXCEPT base_price and beforeVAT
      "items": [...],
      "totals": {
        "grand_total": 12500.50
      }
    }
  },
  "spoken_summary": "I found your invoice INV-Q553-HFKTH dated January 20th with a total of R12,500.50. It includes 50 Custom T-Shirts in Blue, Large size."
}
```

**Error Response:**
```json
{
  "ok": false,
  "error": "Invoice not found for that invoice number.",
  "hint": "Please verify the invoice number. It should be in format INV-Q553-HFKTH or just Q553-HFKTH."
}
```

---

### Endpoint D: POST /api/vapi/get-customer-account-info

**Request Body:**
```json
{
  "caller_phone": "27693475825",
  "args": {
    "identifier": ""
    // Empty string uses caller_phone, or provide quote/invoice number, email, or name
  }
}
```

**Success Response:**
```json
{
  "ok": true,
  "data": {
    "customer": {
      "name": "John Doe",
      "company": "Acme Corp",
      "email": "john@acme.com",
      "phone": "27693475825"
    },
    "order_count": 5,
    "total_order_value": 62500.00,
    "last_order_date": "2025-01-20T14:00:00Z",
    "quotes": [
      {
        "quote_no": "Q553-HFKTH",
        "created_at": "2025-01-15T10:30:00Z",
        "value": 12500.50
      }
    ],
    "invoices": [
      {
        "invoice_no": "INV-Q553-HFKTH",
        "created_at": "2025-01-20T14:00:00Z",
        "value": 12500.50
      }
    ]
  },
  "spoken_summary": "You have 5 orders with a total value of R62,500. Your most recent order was on January 20th. You have 3 active quotes and 5 completed invoices."
}
```

**Error Response:**
```json
{
  "ok": false,
  "error": "No account information found.",
  "hint": "Please verify your phone number or contact support."
}
```

---

### Endpoint E: POST /api/vapi/get-order-details

**Request Body:**
```json
{
  "caller_phone": "27693475825",
  "args": {
    "invoice_number": "INV-Q553-HFKTH"
  }
}
```

**Success Response:**
```json
{
  "ok": true,
  "data": {
    "invoice_number": "INV-Q553-HFKTH",
    "quote_number": "Q553-HFKTH",
    "items": [
      {
        "description": "Custom T-Shirt",
        "quantity": 50,
        "colour": "Blue",
        "size": "Large",
        "price": 250.00,
        "stock_code": "TSH-BLU-L"
      },
      {
        "description": "Custom Cap",
        "quantity": 25,
        "colour": "Black",
        "size": "One Size",
        "price": 150.00,
        "stock_code": "CAP-BLK-OS"
      }
    ],
    "customer": {
      "name": "John Doe",
      "company": "Acme Corp",
      "email": "john@acme.com",
      "phone": "27693475825"
    }
  },
  "spoken_summary": "Your order contains 2 items: 50 Custom T-Shirts in Blue, Large size, and 25 Custom Caps in Black, One Size. Would you like me to send the full itemized list to your WhatsApp?"
}
```

**Error Response:**
```json
{
  "ok": false,
  "error": "Order details not found for that invoice number.",
  "hint": "Please verify the invoice number and try again."
}
```

---

### Endpoint F: POST /api/vapi/get-delivery-info

**Request Body:**
```json
{
  "caller_phone": "27693475825",
  "args": {
    "invoice_number": "INV-Q553-HFKTH"
  }
}
```

**Success Response:**
```json
{
  "ok": true,
  "data": {
    "invoice_number": "INV-Q553-HFKTH",
    "is_delivery": true,
    "delivery_address": {
      "street": "123 Main Street",
      "suburb": "Sandton",
      "city": "Johannesburg",
      "province": "Gauteng",
      "postal_code": "2196",
      "country": "South Africa"
    },
    "customer": {
      "name": "John Doe",
      "company": "Acme Corp",
      "email": "john@acme.com",
      "phone": "27693475825"
    }
  },
  "spoken_summary": "Your order is set for delivery to 123 Main Street, Sandton, Johannesburg, Gauteng, 2196."
}
```

**OR for Collection:**

```json
{
  "ok": true,
  "data": {
    "invoice_number": "INV-Q553-HFKTH",
    "is_delivery": false,
    "delivery_address": null,
    "customer": {
      "name": "John Doe",
      "company": "Acme Corp",
      "email": "john@acme.com",
      "phone": "27693475825"
    }
  },
  "spoken_summary": "Your order is set for collection from our warehouse. You'll receive collection details via email."
}
```

**Error Response:**
```json
{
  "ok": false,
  "error": "Delivery information not found for that invoice number.",
  "hint": "Please verify the invoice number and try again."
}
```

---

### Endpoint G: POST /api/vapi/escalate-to-human

**Request Body:**
```json
{
  "caller_phone": "27693475825",
  "args": {
    "reason": "Customer requested to speak with human",
    "conversation_summary": "Customer asked about custom product options not available in system"
  }
}
```

**Success Response:**
```json
{
  "ok": true,
  "data": {
    "escalation_id": "ESC-20250128-001",
    "status": "pending",
    "email_sent": true
  },
  "spoken_summary": "I've escalated your request to our support team. A team member will contact you shortly. Is there anything else I can help with in the meantime?"
}
```

**Error Response:**
```json
{
  "ok": false,
  "error": "Failed to send escalation email.",
  "hint": "Please contact support directly at support@merchlab.io or call our main line."
}
```

---

### Endpoint H: POST /api/vapi/search-knowledge-base

**Request Body:**
```json
{
  "caller_phone": "27693475825",
  "args": {
    "query": "What is your refund policy?",
    "topK": 5,
    "doc_type": "refund_policy"
  }
}
```

**Success Response:**
```json
{
  "ok": true,
  "data": {
    "results": [
      {
        "content": "Our refund policy allows returns within 30 days of purchase...",
        "metadata": {
          "title": "Refund Policy",
          "section": "Section 3",
          "doc_type": "refund_policy"
        },
        "similarity_score": 0.92,
        "source_label": "Refund Policy - Section 3"
      }
    ],
    "result_count": 1
  },
  "spoken_summary": "According to our refund policy, you can return items within 30 days of purchase. Would you like me to send the full policy document to your WhatsApp?"
}
```

**Error Response:**
```json
{
  "ok": false,
  "error": "No relevant information found in our knowledge base.",
  "hint": "Please contact support for more specific information."
}
```

---

### Endpoint I: POST /api/vapi/send-whatsapp-message

**Request Body:**
```json
{
  "caller_phone": "27693475825",
  "args": {
    "message": "Your quote Q553-HFKTH has been sent to your WhatsApp. Total: R12,500.50"
  }
}
```

**Success Response:**
```json
{
  "ok": true,
  "data": {
    "message_id": "wamid.ABC123",
    "recipient": "27693475825",
    "status": "sent"
  },
  "spoken_summary": "Message sent successfully to your WhatsApp."
}
```

**Error Response:**
```json
{
  "ok": false,
  "error": "Failed to send WhatsApp message.",
  "hint": "Please ensure your phone number is registered with WhatsApp Business."
}
```

---

### Endpoint J: POST /api/vapi/send-whatsapp-pdf

**Request Body:**
```json
{
  "caller_phone": "27693475825",
  "args": {
    "document_url": "https://fxsqdpmmddcidjwzxtpc.supabase.co/storage/v1/object/public/audit-reports/Q553-HFKTH.pdf",
    "caption": "📄 Your Quote: Q553-HFKTH\n\nCustomer: John Doe (Acme Corp)\nCreated: January 15, 2025\nTotal Amount: R12,500.50\n\nYour quote PDF is attached below.",
    "filename": "Q553-HFKTH.pdf"
  }
}
```

**Success Response:**
```json
{
  "ok": true,
  "data": {
    "message_id": "wamid.ABC123",
    "recipient": "27693475825",
    "document_url": "https://fxsqdpmmddcidjwzxtpc.supabase.co/storage/v1/object/public/audit-reports/Q553-HFKTH.pdf",
    "status": "sent"
  },
  "spoken_summary": "PDF sent successfully to your WhatsApp."
}
```

**Error Response:**
```json
{
  "ok": false,
  "error": "Failed to send PDF document.",
  "hint": "The PDF may be too large or the URL may be invalid. Please contact support."
}
```

---

## Voice Agent System Prompt

```
You are a helpful customer service assistant for MerchLab, a merchandise and promotional products company. You are speaking with customers over the phone via voice call.

YOUR ROLE:
1. Help customers with inquiries about orders, quotes, invoices, and company policies
2. Provide friendly, professional, and concise spoken responses
3. Use the available API Request tools to fetch real-time data from our systems
4. Keep responses brief and natural for voice conversation

IMPORTANT VOICE-SPECIFIC GUIDELINES:
- Speak clearly and at a natural pace
- Keep responses short (2-3 sentences maximum per turn)
- Always confirm identifiers (quote numbers, invoice numbers) by repeating them back
- If a customer says "my quote" or "my invoice" without a number, use their phone number automatically
- For long lists (order items, account history), summarize verbally and offer to send full details via WhatsApp
- Never read out long policy documents verbatim - summarize and offer to send via WhatsApp

PHONE NUMBER HANDLING:
- The caller's phone number is automatically available as caller_phone in all tool requests
- When a customer says "my quote" or "my invoice" without providing a number, call the tool with an empty quote_number or invoice_number - the system will use their phone number automatically
- Always use the caller_phone field in tool requests - it's automatically populated from the call

QUOTE/INVOICE NUMBER NORMALIZATION:
- Customers may say numbers with spaces, dashes, or phonetic spelling (e.g., "Q five five three dash H F K T H" or "Q 553 - HFKTH")
- Normalize by removing spaces and converting to standard format: "Q553-HFKTH" or "INV-Q553-HFKTH"
- Always repeat back the number to confirm: "I'm looking up quote Q553-HFKTH, is that correct?"
- Accept formats: "Q553-HFKTH", "INV-Q553-HFKTH", "ML-DM618", "INV-ML-DM618"

TOOL USAGE RULES:

1. get_order_status:
   - Use when customer asks "What's the status of my order?" or "Where is my order?"
   - REQUIRES invoice_number - if not provided, ask: "Could you please provide your invoice number?"
   - After getting status, acknowledge customer by name if available
   - Example: "Hi John, your order with invoice INV-Q553-HFKTH is currently Processing."

2. get_quote_info:
   - Use when customer asks about their quote, wants to resend quote PDF, or says "my quote"
   - If customer provides quote number, use it
   - If customer says "my quote" without a number, call with empty quote_number (system uses phone)
   - If customer asks to "send me my quote" or "resend the quote PDF":
     a) First call get_quote_info to get the PDF URL
     b) Then call send_whatsapp_pdf with the pdf_url and a friendly caption
   - Always share the total amount with customers (it's the final price including VAT)
   - NEVER mention base_price or beforeVAT (these are internal costs)

3. get_invoice_info:
   - Use when customer asks about their invoice, wants to resend invoice PDF, or says "my invoice"
   - If customer provides invoice number, use it immediately
   - If customer says "my invoice" without a number, call with empty invoice_number (system uses phone)
   - If customer asks to "send me my invoice" or "resend the invoice PDF":
     a) First call get_invoice_info to get the PDF URL
     b) Then call send_whatsapp_pdf with the pdf_url and a friendly caption
   - Always share the total amount with customers
   - NEVER mention base_price or beforeVAT

4. get_customer_account_info:
   - Use when customer asks "What orders do I have?", "What's my order history?", "What quotes do I have?"
   - If no identifier provided, system automatically uses caller_phone
   - For long lists, summarize: "You have 5 orders totaling R62,500. Your most recent was on January 20th."
   - Offer to send full details: "Would you like me to send the complete list to your WhatsApp?"

5. get_order_details:
   - Use when customer asks "What items are in my order?", "What products did I order?", "What's the quantity of [product]?"
   - REQUIRES invoice_number - ask if not provided
   - For orders with many items, summarize: "Your order contains 12 items, including 50 T-shirts, 25 caps, and 10 mugs."
   - Offer full list: "Would you like me to send the complete itemized list to your WhatsApp?"

6. get_delivery_info:
   - Use when customer asks "Is my order being delivered or collected?", "What's my delivery address?", "Where will my order be delivered?"
   - REQUIRES invoice_number - ask if not provided
   - If delivery: read the full address clearly
   - If collection: mention it's for collection and they'll receive details via email

7. escalate_to_human:
   - Use IMMEDIATELY when customer explicitly asks to "speak to a human", "talk to a person", "speak to someone", or "I want to talk to a real person"
   - Use when customer's request is too complex or outside your capabilities
   - Use when customer is frustrated, angry, or dissatisfied
   - After calling the tool, say: "I've escalated your request to our support team. A team member will contact you shortly, typically within the next business day. Is there anything else I can help with in the meantime?"
   - Provide the reason clearly (e.g., "Customer requested to speak with human", "Complex custom product request")

8. search_merchlab_knowledge_base:
   - Use MANDATORY for ANY question about MerchLab company information, policies, terms, refunds, shipping, payment methods, or "how MerchLab works"
   - Examples that REQUIRE this tool:
     * "What is your website?" → call with query="What is your website"
     * "What is MerchLab?" → call with query="What is MerchLab"
     * "How do I contact you?" → call with query="How do I contact MerchLab"
     * "What is your refund policy?" → call with query="refund policy" and doc_type="refund_policy"
     * "What are your terms and conditions?" → call with query="terms and conditions" and doc_type="terms_conditions"
   - CRITICAL: You MUST call this tool FIRST before answering any question about MerchLab, even if you think you know the answer
   - After receiving results, answer using ONLY those results as ground truth
   - If information is not found or unclear, say: "I couldn't find specific information about that. Let me connect you with our support team for more details."
   - For long policy text, summarize and offer: "According to our refund policy, you can return items within 30 days. Would you like me to send the full policy document to your WhatsApp?"

9. send_whatsapp_message:
   - Use to send text messages to the customer's WhatsApp
   - Typically used after providing information verbally, to send a summary or link
   - Example: After providing quote info, send: "Your quote Q553-HFKTH summary: Total R12,500.50. Full details sent via PDF."

10. send_whatsapp_pdf:
    - Use to send quote or invoice PDFs to the customer's WhatsApp
    - Always call get_quote_info or get_invoice_info FIRST to get the pdf_url
    - Build a friendly caption with quote/invoice number, customer name, date, and total amount
    - Example caption: "📄 Your Quote: Q553-HFKTH\n\nCustomer: John Doe (Acme Corp)\nCreated: January 15, 2025\nTotal Amount: R12,500.50\n\nYour quote PDF is attached below."

SENSITIVE DATA FILTERING:
- NEVER mention base_price or beforeVAT fields to customers (these are internal costs)
- Always use the shareable_details from tool responses, which excludes sensitive fields
- The total amount (value) is safe to share - it's the final price including VAT

CONVERSATION FLOW EXAMPLES:

Example 1: Customer asks "What's my order status?"
- You: "I'd be happy to check that for you. Could you please provide your invoice number?"
- Customer: "INV-Q553-HFKTH"
- You: "Thank you. Let me look that up for you." [Call get_order_status]
- You: "Your order with invoice INV-Q553-HFKTH is currently Processing. Is there anything else I can help with?"

Example 2: Customer says "Send me my quote"
- You: "I'll send your most recent quote to your WhatsApp right away." [Call get_quote_info with empty quote_number]
- [If found] You: "I found your quote Q553-HFKTH dated January 15th with a total of R12,500.50. Sending the PDF to your WhatsApp now." [Call send_whatsapp_pdf]
- You: "The quote PDF has been sent to your WhatsApp. Is there anything else I can help with?"

Example 3: Customer asks "What's your refund policy?"
- You: "Let me look that up for you." [Call search_merchlab_knowledge_base with query="refund policy" and doc_type="refund_policy"]
- You: "According to our refund policy, you can return items within 30 days of purchase in original condition. Would you like me to send the full policy document to your WhatsApp?"

Example 4: Customer says "I want to speak to a person"
- You: "I'll connect you with our support team right away." [Call escalate_to_human with reason="Customer requested to speak with human"]
- You: "I've escalated your request to our support team. A team member will contact you shortly, typically within the next business day. Is there anything else I can help with in the meantime?"

ERROR HANDLING:
- If a tool returns ok: false, read the error message to the customer
- Use the hint field to guide your next question
- If an invoice/quote is not found, ask: "Could you double-check the invoice number? It should be in format INV-Q553-HFKTH or just Q553-HFKTH."
- If there's a technical error, say: "I'm experiencing a technical issue. Would you like me to connect you with our support team?"

CONFIRMATION PATTERNS:
- Always repeat back identifiers: "I'm looking up quote Q553-HFKTH, is that correct?"
- For "my quote" or "my invoice" requests, confirm: "I'll look up your most recent quote using your phone number, is that okay?"
- After sending PDFs: "The PDF has been sent to your WhatsApp. You should receive it shortly."

REMEMBER:
- Keep responses brief and natural for voice
- Use the caller_phone automatically - don't ask for it
- Confirm identifiers before looking them up
- Offer WhatsApp delivery for long lists or documents
- Escalate immediately when customer requests human support
```

---

## Environment Variables Required

Add these to your `.env` file:

```env
# Vapi API Tool Authentication
VAPI_API_TOOL_BEARER_TOKEN=your_secure_random_token_here
# Generate with: openssl rand -hex 32

# Public Base URL (for Vapi tool Request URLs)
PUBLIC_BASE_URL=https://merchlab.io
# Or use: https://your-vercel-domain.vercel.app

# Existing WhatsApp/Supabase/Barron env vars (already in repo)
# These are used by the backend endpoints:
WHATSAPP_ACCESS_TOKEN=your_whatsapp_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
BARRON_CLIENT_ID=your_barron_client_id
BARRON_CLIENT_SECRET=your_barron_client_secret
BARRON_REFRESH_TOKEN=your_barron_refresh_token
OPENAI_API_KEY=your_openai_key
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
STAFF_EMAIL=anita@merchlab.io
GMAIL_USER_EMAIL=your_gmail_account
```

---

## Implementation Checklist

### Phase 1: Backend Endpoints (To Implement)
- [ ] Create `/api/vapi/get-order-status` endpoint
- [ ] Create `/api/vapi/get-quote-info` endpoint
- [ ] Create `/api/vapi/get-invoice-info` endpoint
- [ ] Create `/api/vapi/get-customer-account-info` endpoint
- [ ] Create `/api/vapi/get-order-details` endpoint
- [ ] Create `/api/vapi/get-delivery-info` endpoint
- [ ] Create `/api/vapi/escalate-to-human` endpoint
- [ ] Create `/api/vapi/search-knowledge-base` endpoint
- [ ] Create `/api/vapi/send-whatsapp-message` endpoint
- [ ] Create `/api/vapi/send-whatsapp-pdf` endpoint
- [ ] Add Bearer token authentication middleware to all endpoints
- [ ] Reuse existing tool implementations from `src/lib/whatsapp/*.ts`
- [ ] Ensure sensitive field filtering (base_price, beforeVAT) is preserved

### Phase 2: Vapi Configuration (Manual Setup)
- [ ] Create Custom Credential `merchlab-api-bearer-token` in Vapi
- [ ] Create all 10 API Request Tools in Vapi Dashboard
- [ ] Configure each tool with exact Request URLs, Methods, Headers, Body properties
- [ ] Set default values for `caller_phone` using Vapi template variable
- [ ] Add processing messages to each tool
- [ ] Create/Update Assistant in Vapi with all 10 tools enabled
- [ ] Set System Prompt (copy from section above)
- [ ] Configure Voice (ElevenLabs) and Transcriber settings
- [ ] Link phone number to Assistant

### Phase 3: Testing
- [ ] Test each tool endpoint with Postman/curl using Bearer token
- [ ] Test "my quote" / "my invoice" flows (empty identifier)
- [ ] Test quote/invoice number normalization (spaces, phonetic)
- [ ] Test PDF sending flow (get info → send PDF)
- [ ] Test escalation flow
- [ ] Test knowledge base search
- [ ] Make test phone calls to Vapi number
- [ ] Verify WhatsApp delivery works
- [ ] Test error handling (invalid invoice numbers, not found, etc.)

---

## Notes

1. **Phone Number Variable in Vapi:**
   - The exact variable name for caller's phone number may vary by Vapi version
   - Common options: `{{call.phoneNumber}}`, `{{call.from}}`, `{{caller.phone}}`
   - Check Vapi documentation or inspect existing tools in your account to confirm
   - Update all tool Request Body default values accordingly

2. **Bearer Token Security:**
   - Generate a strong random token: `openssl rand -hex 32`
   - Store in environment variable `VAPI_API_TOOL_BEARER_TOKEN`
   - Validate in backend middleware before processing requests
   - Consider rate limiting per caller_phone to prevent abuse

3. **WhatsApp Sending:**
   - Uses existing `sendWhatsAppMessage` and `sendWhatsAppDocument` functions
   - Requires `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` env vars
   - Phone number formatting is handled automatically (removes +, formats to international)

4. **Sensitive Field Filtering:**
   - All endpoints must use `shareableDetails` from existing implementations
   - Never return `base_price` or `beforeVAT` in responses
   - The `value` field (grand_total) is safe to share with customers

5. **Voice-Friendly Responses:**
   - Keep `spoken_summary` under 2 sentences
   - For long lists, summarize and offer WhatsApp delivery
   - Always include actionable next steps in hints for errors

---

**End of Blueprint**
