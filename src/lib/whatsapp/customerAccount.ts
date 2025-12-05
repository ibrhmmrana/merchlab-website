import { getSupabaseAdmin } from '../supabaseAdmin';
import { parseGrandTotal } from '@/server/admin/metrics';

interface CustomerInfo {
  name: string;
  company: string;
  email: string;
  phone: string;
}

interface QuoteSummary {
  quoteNo: string;
  createdAt: string;
  value: number | null;
}

interface InvoiceSummary {
  invoiceNo: string;
  createdAt: string;
  value: number | null;
}

export interface CustomerAccountInfo {
  customer: CustomerInfo | null;
  orderCount: number; // Number of invoices (completed orders)
  totalOrderValue: number; // Sum of all invoice values
  lastOrderDate: string | null; // Date of most recent invoice
  quotes: QuoteSummary[];
  invoices: InvoiceSummary[];
}

// Helper to safely extract string from unknown object
function pickStr(obj: unknown, keys: string[], fallback = ''): string {
  if (!obj || typeof obj !== 'object') return fallback;
  const rec = obj as Record<string, unknown>;
  for (const k of keys) {
    const v = rec[k];
    if (typeof v === 'string' && v.trim() !== '') return v;
  }
  return fallback;
}

// Parse payload to extract customer and totals
function parsePayload(payload: unknown): Record<string, unknown> | null {
  if (typeof payload === 'string') {
    try {
      return JSON.parse(payload) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  return (payload && typeof payload === 'object') ? payload as Record<string, unknown> : null;
}

// Extract customer details from payload
function extractCustomerFromPayload(payload: unknown): CustomerInfo | null {
  const p = parsePayload(payload);
  if (!p) {
    return null;
  }
  
  // Extract customer info - prefer enquiryCustomer, fallback to customer
  const customerUnknown = (p?.enquiryCustomer ?? p?.customer) as unknown;
  
  if (!customerUnknown || typeof customerUnknown !== 'object') {
    return null;
  }

  const firstName = pickStr(customerUnknown, ['firstName', 'first_name']);
  const lastName = pickStr(customerUnknown, ['lastName', 'last_name']);
  const company = pickStr(customerUnknown, ['company'], '-');
  const email = pickStr(customerUnknown, ['email']);
  const phone = pickStr(customerUnknown, ['telephoneNumber', 'telephone', 'phone', 'phoneNumber']);

  const customerName = `${firstName} ${lastName}`.trim() || 'Unknown';

  return {
    name: customerName,
    company: company || '-',
    email: email || '-',
    phone: phone || '-',
  };
}

/**
 * Normalize phone number to extract the 9-digit core
 * Handles formats: "27XXXXXXXXX", "0XXXXXXXXX", "XXXXXXXXX"
 */
function extractPhoneCore(phone: string): string | null {
  if (!phone) return null;

  // Remove all spaces, dashes, and parentheses
  const cleaned = phone.replace(/[\s\-()]/g, '');

  // Extract 9 digits - try different patterns
  const match27 = cleaned.match(/^27(\d{9})$/);
  if (match27) return match27[1];

  const match0 = cleaned.match(/^0(\d{9})$/);
  if (match0) return match0[1];

  const match9 = cleaned.match(/^(\d{9})$/);
  if (match9) return match9[1];

  return null;
}

/**
 * Check if a phone number in payload matches the target phone core
 */
function phoneMatches(payload: unknown, targetPhoneCore: string): boolean {
  if (!targetPhoneCore) return false;

  const p = parsePayload(payload);
  if (!p || typeof p !== 'object') return false;

  const customerUnknown = (p?.customer ?? p?.enquiryCustomer) as unknown;
  if (!customerUnknown || typeof customerUnknown !== 'object') return false;

  const customer = customerUnknown as Record<string, unknown>;
  const phone = pickStr(customer, ['phone', 'telephone', 'telephoneNumber', 'phoneNumber']);
  if (!phone) return false;

  const phoneCore = extractPhoneCore(phone);
  return phoneCore === targetPhoneCore;
}

/**
 * Check if email in payload matches target email
 */
function emailMatches(payload: unknown, targetEmail: string): boolean {
  if (!targetEmail) return false;

  const p = parsePayload(payload);
  if (!p || typeof p !== 'object') return false;

  const customerUnknown = (p?.customer ?? p?.enquiryCustomer) as unknown;
  if (!customerUnknown || typeof customerUnknown !== 'object') return false;

  const customer = customerUnknown as Record<string, unknown>;
  const email = pickStr(customer, ['email']);
  if (!email) return false;

  return email.toLowerCase().trim() === targetEmail.toLowerCase().trim();
}

/**
 * Check if customer name in payload matches target name
 */
function nameMatches(payload: unknown, targetName: string): boolean {
  if (!targetName) return false;

  const p = parsePayload(payload);
  if (!p || typeof p !== 'object') return false;

  const customerUnknown = (p?.customer ?? p?.enquiryCustomer) as unknown;
  if (!customerUnknown || typeof customerUnknown !== 'object') return false;

  const customer = customerUnknown as Record<string, unknown>;
  const firstName = pickStr(customer, ['firstName', 'first_name']);
  const lastName = pickStr(customer, ['lastName', 'last_name']);
  const fullName = `${firstName} ${lastName}`.trim().toLowerCase();
  const targetNameLower = targetName.toLowerCase().trim();

  // Check if target name matches full name or first name or last name
  return fullName === targetNameLower ||
         firstName.toLowerCase() === targetNameLower ||
         lastName.toLowerCase() === targetNameLower;
}

/**
 * Get customer account information by identifier (phone, email, name, or quote/invoice number)
 */
export async function getCustomerAccountInfo(identifier: string): Promise<CustomerAccountInfo | null> {
  const supabase = getSupabaseAdmin();

  console.log(`getCustomerAccountInfo: Looking up customer with identifier: "${identifier}"`);

  // Try to identify customer by:
  // 1. Quote/invoice number (extract customer from that quote/invoice)
  // 2. Phone number
  // 3. Email
  // 4. Name

  let customerInfo: CustomerInfo | null = null;
  let phoneCore: string | null = null;
  let email: string | null = null;
  let name: string | null = null;

  // Check if identifier is a quote number
  const quoteMatch = identifier.match(/^(Q\d+[-]\w+|ML-[\w]+)$/i);
  if (quoteMatch) {
    console.log(`Identifier appears to be a quote number: ${identifier}`);
    const { data: quoteData } = await supabase
      .from('quote_docs')
      .select('payload')
      .eq('quote_no', identifier.toUpperCase())
      .single();

    if (quoteData) {
      customerInfo = extractCustomerFromPayload(quoteData.payload);
      if (customerInfo) {
        phoneCore = extractPhoneCore(customerInfo.phone);
        email = customerInfo.email !== '-' ? customerInfo.email : null;
        name = customerInfo.name !== 'Unknown' ? customerInfo.name : null;
        console.log(`Found customer from quote: ${customerInfo.name}, phone: ${phoneCore}, email: ${email}`);
      }
    }
  }

  // Check if identifier is an invoice number
  if (!customerInfo) {
    const invoiceMatch = identifier.match(/^INV-(Q\d+[-]\w+|ML-[\w]+)$/i);
    if (invoiceMatch) {
      console.log(`Identifier appears to be an invoice number: ${identifier}`);
      const cleanInvoiceNo = identifier.toUpperCase();
      const { data: invoiceData } = await supabase
        .from('invoice_docs')
        .select('payload')
        .eq('invoice_no', cleanInvoiceNo)
        .single();

      if (invoiceData) {
        customerInfo = extractCustomerFromPayload(invoiceData.payload);
        if (customerInfo) {
          phoneCore = extractPhoneCore(customerInfo.phone);
          email = customerInfo.email !== '-' ? customerInfo.email : null;
          name = customerInfo.name !== 'Unknown' ? customerInfo.name : null;
          console.log(`Found customer from invoice: ${customerInfo.name}, phone: ${phoneCore}, email: ${email}`);
        }
      }
    }
  }

  // If not found via quote/invoice, try to extract phone/email/name from identifier
  if (!customerInfo) {
    // Try as phone number
    phoneCore = extractPhoneCore(identifier);
    if (phoneCore) {
      console.log(`Identifier appears to be a phone number, extracted core: ${phoneCore}`);
    } else {
      // Try as email
      if (identifier.includes('@')) {
        email = identifier.toLowerCase().trim();
        console.log(`Identifier appears to be an email: ${email}`);
      } else {
        // Try as name
        name = identifier.trim();
        console.log(`Identifier appears to be a name: ${name}`);
      }
    }
  }

  // Fetch all quotes and invoices
  const [quotesResult, invoicesResult] = await Promise.all([
    supabase.from('quote_docs').select('quote_no, created_at, payload').order('created_at', { ascending: false }),
    supabase.from('invoice_docs').select('invoice_no, created_at, payload').order('created_at', { ascending: false }),
  ]);

  const allQuotes = quotesResult.data || [];
  const allInvoices = invoicesResult.data || [];

  console.log(`Fetched ${allQuotes.length} quotes and ${allInvoices.length} invoices`);

  // Filter quotes and invoices by customer identifier
  const matchingQuotes: QuoteSummary[] = [];
  const matchingInvoices: InvoiceSummary[] = [];

  for (const quote of allQuotes) {
    let matches = false;

    if (phoneCore && phoneMatches(quote.payload, phoneCore)) {
      matches = true;
      if (!customerInfo) {
        customerInfo = extractCustomerFromPayload(quote.payload);
      }
    } else if (email && emailMatches(quote.payload, email)) {
      matches = true;
      if (!customerInfo) {
        customerInfo = extractCustomerFromPayload(quote.payload);
      }
    } else if (name && nameMatches(quote.payload, name)) {
      matches = true;
      if (!customerInfo) {
        customerInfo = extractCustomerFromPayload(quote.payload);
      }
    }

    if (matches) {
      const value = parseGrandTotal(quote.payload);
      matchingQuotes.push({
        quoteNo: quote.quote_no,
        createdAt: quote.created_at || '',
        value,
      });
    }
  }

  for (const invoice of allInvoices) {
    let matches = false;

    if (phoneCore && phoneMatches(invoice.payload, phoneCore)) {
      matches = true;
      if (!customerInfo) {
        customerInfo = extractCustomerFromPayload(invoice.payload);
      }
    } else if (email && emailMatches(invoice.payload, email)) {
      matches = true;
      if (!customerInfo) {
        customerInfo = extractCustomerFromPayload(invoice.payload);
      }
    } else if (name && nameMatches(invoice.payload, name)) {
      matches = true;
      if (!customerInfo) {
        customerInfo = extractCustomerFromPayload(invoice.payload);
      }
    }

    if (matches) {
      const value = parseGrandTotal(invoice.payload);
      matchingInvoices.push({
        invoiceNo: invoice.invoice_no,
        createdAt: invoice.created_at || '',
        value,
      });
    }
  }

  console.log(`Found ${matchingQuotes.length} matching quotes and ${matchingInvoices.length} matching invoices`);

  // Calculate totals
  const orderCount = matchingInvoices.length;
  const totalOrderValue = matchingInvoices.reduce((sum, inv) => sum + (inv.value || 0), 0);
  const lastOrderDate = matchingInvoices.length > 0 ? matchingInvoices[0].createdAt : null;

  return {
    customer: customerInfo,
    orderCount,
    totalOrderValue,
    lastOrderDate,
    quotes: matchingQuotes,
    invoices: matchingInvoices,
  };
}

