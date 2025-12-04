/**
 * Send a WhatsApp message using the WhatsApp Business API
 */
export async function sendWhatsAppMessage(
  phoneNumber: string,
  message: string,
  customerName?: string
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
  
  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
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

