/**
 * Send a WhatsApp message using BotPenguin API
 */
export async function sendWhatsAppMessage(
  phoneNumber: string,
  message: string,
  customerName?: string
): Promise<void> {
  const apiKey = process.env.BOTPENGUIN_API_KEY;
  
  if (!apiKey) {
    throw new Error('BOTPENGUIN_API_KEY environment variable is required');
  }
  
  // Format phone number (ensure it's in international format without +)
  const formattedNumber = phoneNumber.replace(/^\+/, '').replace(/\D/g, '');
  
  // Clean message text - replace ** with * (as shown in user's reference)
  const cleanedMessage = message.replace(/\*\*/g, '*');
  
  const url = `https://api.v7.botpenguin.com/whatsapp-automation/wa/send-message?apiKey=${encodeURIComponent(apiKey)}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apiKey': apiKey,
    },
    body: JSON.stringify({
      userName: customerName || formattedNumber,
      wa_id: formattedNumber,
      type: 'text',
      'message.text': cleanedMessage,
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('BotPenguin API error:', errorText);
    throw new Error(`Failed to send WhatsApp message: ${response.status} ${errorText}`);
  }
  
  const data = await response.json();
  console.log('WhatsApp message sent successfully:', data);
}

