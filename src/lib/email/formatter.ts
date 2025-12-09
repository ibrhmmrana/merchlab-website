import { AIResponse } from '../whatsapp/aiAgent';

/**
 * Extended AI response with email metadata
 */
interface EmailAIResponse extends AIResponse {
  emailMetadata?: {
    threadId: string;
    messageId: string;
    subject: string;
  };
}

/**
 * Format AI response as HTML email
 */
export function formatEmailResponse(
  aiResponse: EmailAIResponse | AIResponse,
  customerName?: string,
  isReply: boolean = false,
  originalSubject?: string
): { subject: string; htmlBody: string; plainTextBody: string } {
  // Extract subject from original email or create new one
  const subject = isReply 
    ? `Re: ${(aiResponse as EmailAIResponse).emailMetadata?.subject || originalSubject || 'Your Inquiry'}`
    : 'Re: Your Inquiry';

  // Greeting
  const greeting = customerName 
    ? `Dear ${customerName},`
    : 'Hello,';

  // Format the AI response content
  // Convert markdown-style formatting to HTML
  let htmlContent = aiResponse.content
    // Convert **bold** to <strong>
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Convert *italic* to <em>
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Convert line breaks to <br>
    .replace(/\n/g, '<br>\n')
    // Convert numbered lists
    .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
    // Wrap consecutive <li> in <ol>
    .replace(/(<li>.*<\/li>\n?)+/g, '<ol>$&</ol>');

  // If there are list items, wrap them properly
  if (htmlContent.includes('<li>')) {
    htmlContent = htmlContent.replace(/(<ol>)?(<li>.*<\/li>)(<\/ol>)?/g, (match, open, item) => {
      if (!open) return `<ol>${item}</ol>`;
      return match;
    });
  }

  // Build HTML email
  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .greeting {
      margin-bottom: 20px;
    }
    .content {
      margin-bottom: 20px;
    }
    .signature {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
    }
    ol, ul {
      margin: 10px 0;
      padding-left: 30px;
    }
    li {
      margin: 5px 0;
    }
    strong {
      font-weight: 600;
    }
    em {
      font-style: italic;
    }
  </style>
</head>
<body>
  <div class="greeting">
    ${greeting}
  </div>
  <div class="content">
    ${htmlContent}
  </div>
  <div class="signature">
    <p>Best regards,<br>
    <strong>MerchLab AI Assistant</strong></p>
    <p style="font-size: 12px; color: #666; margin-top: 20px;">
      This is an automated response from MerchLab's AI assistant. 
      If you need to speak with a human representative, please reply to this email or contact us directly.
    </p>
  </div>
</body>
</html>
  `.trim();

  // Plain text version (fallback)
  const plainTextBody = `
${greeting}

${aiResponse.content}

Best regards,
MerchLab AI Assistant

---
This is an automated response from MerchLab's AI assistant. 
If you need to speak with a human representative, please reply to this email or contact us directly.
  `.trim();

  return {
    subject,
    htmlBody,
    plainTextBody,
  };
}

