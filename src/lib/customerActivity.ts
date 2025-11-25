import { getSupabaseAdmin } from './supabaseAdmin';
import { parseGrandTotal } from '@/server/admin/metrics';

// Helper to parse payload (same as in metrics.ts)
function parsePayload(payload: unknown): unknown {
  if (typeof payload === 'string') {
    try {
      return JSON.parse(payload);
    } catch {
      return null;
    }
  }
  return payload;
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

/**
 * Normalize phone number to extract the 9-digit core
 * Handles formats: "27XXXXXXXXX", "0XXXXXXXXX", "XXXXXXXXX"
 */
function extractPhoneCore(phone: string): string | null {
  if (!phone) return null;
  
  // Remove all spaces, dashes, and parentheses
  const cleaned = phone.replace(/[\s\-()]/g, '');
  
  // Extract 9 digits - try different patterns
  // Pattern 1: Starts with 27 followed by 9 digits
  const match27 = cleaned.match(/^27(\d{9})$/);
  if (match27) return match27[1];
  
  // Pattern 2: Starts with 0 followed by 9 digits
  const match0 = cleaned.match(/^0(\d{9})$/);
  if (match0) return match0[1];
  
  // Pattern 3: Just 9 digits
  const match9 = cleaned.match(/^(\d{9})$/);
  if (match9) return match9[1];
  
  return null;
}

/**
 * Check if a phone number in payload matches the target phone core
 */
function phoneMatches(payload: unknown, targetPhoneCore: string): boolean {
  if (!targetPhoneCore) return false;
  
  const p = parsePayload(payload) as Record<string, unknown> | null;
  if (!p) return false;
  
  // Check both customer and enquiryCustomer
  const customerUnknown = (p?.customer ?? p?.enquiryCustomer) as unknown;
  if (!customerUnknown || typeof customerUnknown !== 'object') return false;
  
  const customer = customerUnknown as Record<string, unknown>;
  const phone = pickStr(customer, ['phone', 'telephone', 'telephoneNumber', 'phoneNumber']);
  if (!phone) return false;
  
  const phoneCore = extractPhoneCore(phone);
  return phoneCore === targetPhoneCore;
}

export type CustomerActivity = {
  customerName: string;
  company: string;
  email: string;
  phone: string;
  quotes: Array<{
    quoteNo: string;
    createdAt: string;
    value: number;
    pdfUrl: string;
  }>;
  invoices: Array<{
    invoiceNo: string;
    createdAt: string;
    value: number;
    pdfUrl: string;
  }>;
  totalSpent: number;
  totalQuotes: number;
  totalInvoices: number;
};

/**
 * Get customer activity by phone number
 * Phone number should be in format: "27" + 9 digits (e.g., "27693475825")
 */
export async function getCustomerActivityByPhone(phoneNumber: string): Promise<CustomerActivity | null> {
  const phoneCore = extractPhoneCore(phoneNumber);
  if (!phoneCore) {
    return null;
  }

  try {
    const supabase = getSupabaseAdmin();

    // Fetch all quotes and invoices
    const [quotesResult, invoicesResult] = await Promise.all([
      supabase
        .from('quote_docs')
        .select('quote_no, created_at, payload')
        .order('created_at', { ascending: false }),
      supabase
        .from('invoice_docs')
        .select('invoice_no, created_at, payload')
        .order('created_at', { ascending: false }),
    ]);

    if (quotesResult.error) {
      console.error('Error fetching quotes:', quotesResult.error);
      return null;
    }

    if (invoicesResult.error) {
      console.error('Error fetching invoices:', invoicesResult.error);
      return null;
    }

    // Filter quotes and invoices by phone number
    const matchingQuotes = (quotesResult.data || []).filter((q) =>
      phoneMatches(q.payload, phoneCore)
    );

    const matchingInvoices = (invoicesResult.data || []).filter((inv) =>
      phoneMatches(inv.payload, phoneCore)
    );

    // If no matches, return null
    if (matchingQuotes.length === 0 && matchingInvoices.length === 0) {
      return null;
    }

    // Extract customer info from the first quote or invoice
    let customerName = 'Unknown';
    let company = '-';
    let email = '';
    let phone = '';
    
    if (matchingQuotes.length > 0) {
      const firstQuote = matchingQuotes[0];
      const p = parsePayload(firstQuote.payload) as Record<string, unknown> | null;
      const customerUnknown = (p?.enquiryCustomer ?? p?.customer) as unknown;
      
      const firstName = pickStr(customerUnknown, ['firstName', 'first_name']);
      const lastName = pickStr(customerUnknown, ['lastName', 'last_name']);
      customerName = `${firstName} ${lastName}`.trim() || 'Unknown';
      company = pickStr(customerUnknown, ['company'], '-');
      email = pickStr(customerUnknown, ['email']);
      phone = pickStr(customerUnknown, ['phone', 'telephone', 'telephoneNumber', 'phoneNumber']);
    } else if (matchingInvoices.length > 0) {
      const firstInvoice = matchingInvoices[0];
      const p = parsePayload(firstInvoice.payload) as Record<string, unknown> | null;
      const customerUnknown = (p?.customer ?? p?.enquiryCustomer) as unknown;
      
      const firstName = pickStr(customerUnknown, ['firstName', 'first_name']);
      const lastName = pickStr(customerUnknown, ['lastName', 'last_name']);
      customerName = `${firstName} ${lastName}`.trim() || 'Unknown';
      company = pickStr(customerUnknown, ['company'], '-');
      email = pickStr(customerUnknown, ['email']);
      phone = pickStr(customerUnknown, ['phone', 'telephone', 'telephoneNumber', 'phoneNumber']);
    }

    // Format quotes
    const quotes = matchingQuotes.map((q) => ({
      quoteNo: q.quote_no,
      createdAt: q.created_at,
      value: parseGrandTotal(q.payload),
      pdfUrl: `https://fxsqdpmmddcidjwzxtpc.supabase.co/storage/v1/object/public/audit-reports/${q.quote_no}.pdf`,
    }));

    // Format invoices
    const invoices = matchingInvoices.map((inv) => ({
      invoiceNo: inv.invoice_no,
      createdAt: inv.created_at,
      value: parseGrandTotal(inv.payload),
      pdfUrl: `https://fxsqdpmmddcidjwzxtpc.supabase.co/storage/v1/object/public/audit-reports/${inv.invoice_no}.pdf`,
    }));

    // Calculate totals
    const totalSpent = invoices.reduce((sum, inv) => sum + inv.value, 0);

    return {
      customerName,
      company,
      email,
      phone,
      quotes,
      invoices,
      totalSpent,
      totalQuotes: quotes.length,
      totalInvoices: invoices.length,
    };
  } catch (error) {
    console.error('Error getting customer activity:', error);
    return null;
  }
}
