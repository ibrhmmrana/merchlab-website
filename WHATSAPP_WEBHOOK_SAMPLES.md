# WhatsApp Webhook Data Samples

This document shows sample webhook payloads that the WhatsApp webhook endpoint receives when a customer sends a message.

## Format 1: Direct WhatsApp Business API Array Format

This is the format received directly from WhatsApp Business API:

```json
[
  {
    "messaging_product": "whatsapp",
    "metadata": {
      "display_phone_number": "27686154770",
      "phone_number_id": "669403502916315"
    },
    "contacts": [
      {
        "profile": {
          "name": "Ibrahim"
        },
        "wa_id": "27693475825"
      }
    ],
    "messages": [
      {
        "from": "27693475825",
        "id": "wamid.HBgLMjc2OTM0NzU4MjUVAgASGBQzQTVCNzBEMjdDNTE3QUY4RkY5RgA=",
        "timestamp": "1764612486",
        "text": {
          "body": "Hi"
        },
        "type": "text"
      }
    ],
    "field": "messages"
  }
]
```

**Key fields extracted:**
- `contacts[0].wa_id` → WhatsApp ID (e.g., "27693475825")
- `contacts[0].profile.name` → Customer name (e.g., "Ibrahim")
- `messages[0].text.body` → Message text (e.g., "Hi")
- `messages[0].type` → Message type (e.g., "text")

---

## Format 2: Standard WhatsApp Business API Format

This format is used when the webhook is configured through Meta's webhook settings:

```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "27686154770",
              "phone_number_id": "669403502916315"
            },
            "contacts": [
              {
                "profile": {
                  "name": "Ibrahim"
                },
                "wa_id": "27693475825"
              }
            ],
            "messages": [
              {
                "from": "27693475825",
                "id": "wamid.HBgLMjc2OTM0NzU4MjUVAgASGBQzQTVCNzBEMjdDNTE3QUY4RkY5RgA=",
                "timestamp": "1764612486",
                "text": {
                  "body": "Hi"
                },
                "type": "text"
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

**Key fields extracted:**
- `entry[0].changes[0].value.contacts[0].wa_id` → WhatsApp ID
- `entry[0].changes[0].value.contacts[0].profile.name` → Customer name
- `entry[0].changes[0].value.messages[0].text.body` → Message text

---

## Format 3: BotPenguin/n8n Webhook Format

This format is received when messages come through BotPenguin or n8n:

```json
{
  "event": {
    "value": {
      "messaging_product": "whatsapp",
      "metadata": {
        "display_phone_number": "27686012148",
        "phone_number_id": "515861714943790"
      },
      "contacts": [
        {
          "profile": {
            "name": "Ibrahim"
          },
          "wa_id": "27693475825"
        }
      ],
      "messages": [
        {
          "from": "27693475825",
          "id": "wamid.HBgLMjc2OTM0NzU4MjUVAgASGBQzQUM0Q0U4RTZBNDdDOEFDNDUwOQA=",
          "timestamp": "1759321944",
          "text": {
            "body": "Give me the IRREGULAR EXPENDITURE AT POWER UTILITY ESKOM BETWEEN 2012 AND 2018"
          },
          "type": "text"
        }
      ]
    },
    "field": "messages"
  }
}
```

**Key fields extracted:**
- `event.value.contacts[0].wa_id` → WhatsApp ID
- `event.value.contacts[0].profile.name` → Customer name
- `event.value.messages[0].text.body` → Message text

---

## Format 4: Nested Body Format (n8n)

This format is received when n8n wraps the event in a `body` object:

```json
{
  "body": {
    "event": {
      "value": {
        "messaging_product": "whatsapp",
        "metadata": {
          "display_phone_number": "27686012148",
          "phone_number_id": "515861714943790"
        },
        "contacts": [
          {
            "profile": {
              "name": "Ibrahim"
            },
            "wa_id": "27693475825"
          }
        ],
        "messages": [
          {
            "from": "27693475825",
            "id": "wamid.HBgLMjc2OTM0NzU4MjUVAgASGBQzQUM0Q0U4RTZBNDdDOEFDNDUwOQA=",
            "timestamp": "1759321944",
            "text": {
              "body": "Send me my quote please"
            },
            "type": "text"
          }
        ]
      },
      "field": "messages"
    }
  },
  "webhookUrl": "https://n8n.intakt.co.za/webhook/joziai-webhook",
  "executionMode": "production"
}
```

**Key fields extracted:**
- `body.event.value.contacts[0].wa_id` → WhatsApp ID
- `body.event.value.contacts[0].profile.name` → Customer name
- `body.event.value.messages[0].text.body` → Message text

---

## Format 5: Direct Format (Fallback)

This is a simplified format used as a fallback:

```json
{
  "contacts": [
    {
      "profile": {
        "name": "Ibrahim"
      },
      "wa_id": "27693475825"
    }
  ],
  "messages": [
    {
      "from": "27693475825",
      "text": {
        "body": "Hi"
      },
      "type": "text"
    }
  ]
}
```

**Key fields extracted:**
- `contacts[0].wa_id` → WhatsApp ID
- `contacts[0].profile.name` → Customer name
- `messages[0].text.body` → Message text

---

## Important Notes

1. **WhatsApp ID Format**: The `wa_id` field contains the full phone number with country code (e.g., "27693475825" where "27" is South Africa's country code).

2. **Phone Number Extraction**: The webhook extracts the 9-digit core from the WhatsApp ID by removing the "27" prefix (e.g., "27693475825" → "693475825") to match against phone numbers stored in the database.

3. **Message Types**: Only `type: "text"` messages are processed. Other types (images, videos, documents, etc.) are skipped.

4. **Session ID**: The session ID is created as `ML-{wa_id}` (e.g., "ML-27693475825") to group messages from the same customer.

5. **Customer Name**: If `profile.name` is not available, the WhatsApp ID is used as the customer name.

