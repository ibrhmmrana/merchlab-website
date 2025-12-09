import { ParsedEmail } from './parser';

/**
 * Email categories
 */
export type EmailCategory = 
  | 'order_status'
  | 'quote_request'
  | 'invoice_request'
  | 'account_info'
  | 'delivery_info'
  | 'order_details'
  | 'general_support'
  | 'escalation'
  | 'unknown';

/**
 * Categorization result
 */
export interface CategorizationResult {
  category: EmailCategory;
  confidence: number;
  keywords: string[];
}

/**
 * Simple keyword-based email categorization
 * Can be enhanced with AI-based categorization later
 */
export function categorizeEmail(email: ParsedEmail): CategorizationResult {
  const subject = email.subject.toLowerCase();
  const body = email.body.toLowerCase();
  const combined = `${subject} ${body}`;

  const keywords: string[] = [];
  let category: EmailCategory = 'unknown';
  let confidence = 0.5;

  // Order status keywords
  if (
    combined.includes('order status') ||
    combined.includes('order tracking') ||
    combined.includes('where is my order') ||
    combined.includes('has my order shipped') ||
    combined.includes('order shipped') ||
    combined.includes('order delivered')
  ) {
    category = 'order_status';
    confidence = 0.8;
    keywords.push('order', 'status', 'tracking');
  }
  // Quote request keywords
  else if (
    combined.includes('quote') ||
    combined.includes('quotation') ||
    combined.includes('pricing') ||
    combined.includes('price') ||
    combined.includes('cost estimate')
  ) {
    category = 'quote_request';
    confidence = 0.8;
    keywords.push('quote', 'pricing');
  }
  // Invoice request keywords
  else if (
    combined.includes('invoice') ||
    combined.includes('receipt') ||
    combined.includes('bill') ||
    combined.includes('payment')
  ) {
    category = 'invoice_request';
    confidence = 0.8;
    keywords.push('invoice', 'receipt');
  }
  // Account info keywords
  else if (
    combined.includes('my orders') ||
    combined.includes('order history') ||
    combined.includes('my account') ||
    combined.includes('my quotes') ||
    combined.includes('order value')
  ) {
    category = 'account_info';
    confidence = 0.8;
    keywords.push('account', 'history');
  }
  // Delivery info keywords
  else if (
    combined.includes('delivery') ||
    combined.includes('shipping') ||
    combined.includes('delivery address') ||
    combined.includes('when will') ||
    combined.includes('delivery date')
  ) {
    category = 'delivery_info';
    confidence = 0.8;
    keywords.push('delivery', 'shipping');
  }
  // Order details keywords
  else if (
    combined.includes('order details') ||
    combined.includes('what items') ||
    combined.includes('what products') ||
    combined.includes('items in my order')
  ) {
    category = 'order_details';
    confidence = 0.8;
    keywords.push('order', 'items', 'products');
  }
  // Escalation keywords
  else if (
    combined.includes('speak to human') ||
    combined.includes('talk to person') ||
    combined.includes('speak to someone') ||
    combined.includes('manager') ||
    combined.includes('supervisor') ||
    combined.includes('complaint') ||
    combined.includes('dissatisfied') ||
    combined.includes('angry') ||
    combined.includes('frustrated')
  ) {
    category = 'escalation';
    confidence = 0.9;
    keywords.push('escalation', 'human');
  }
  // General support (default)
  else {
    category = 'general_support';
    confidence = 0.6;
    keywords.push('support', 'help');
  }

  return {
    category,
    confidence,
    keywords,
  };
}

