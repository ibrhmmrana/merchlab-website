/**
 * Send a WhatsApp message using the WhatsApp Business API
 */
export async function sendWhatsAppMessage(
  phoneNumber: string,
  message: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _customerName?: string // Reserved for future use (e.g., personalization)
): Promise<void> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  // Use phone number ID if provided, otherwise fall back to business account ID
  // Note: Phone number ID is typically required for sending messages
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '1877523409779615';
  
  if (!accessToken) {
    throw new Error('WHATSAPP_ACCESS_TOKEN environment variable is required');
  }
  
  // Format phone number (ensure it's in international format without +)
  const formattedNumber = phoneNumber.replace(/^\+/, '').replace(/\D/g, '');
  
  const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formattedNumber,
      type: 'text',
      text: {
        body: message,
      },
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('WhatsApp API error:', errorText);
    throw new Error(`Failed to send WhatsApp message: ${response.status} ${errorText}`);
  }
  
  const data = await response.json();
  console.log('WhatsApp message sent successfully:', data);
}

/**
 * Send a WhatsApp document (PDF) using the WhatsApp Business API
 */
export async function sendWhatsAppDocument(
  phoneNumber: string,
  documentUrl: string,
  caption: string,
  filename?: string
): Promise<void> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '1877523409779615';
  
  if (!accessToken) {
    throw new Error('WHATSAPP_ACCESS_TOKEN environment variable is required');
  }
  
  // Format phone number (ensure it's in international format without +)
  const formattedNumber = phoneNumber.replace(/^\+/, '').replace(/\D/g, '');
  
  const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;
  
  // Extract filename from URL if not provided
  const docFilename = filename || documentUrl.split('/').pop() || 'document.pdf';
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formattedNumber,
      type: 'document',
      document: {
        link: documentUrl,
        caption: caption,
        filename: docFilename,
      },
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('WhatsApp API error:', errorText);
    throw new Error(`Failed to send WhatsApp document: ${response.status} ${errorText}`);
  }
  
  const data = await response.json();
  console.log('WhatsApp document sent successfully:', data);
}

