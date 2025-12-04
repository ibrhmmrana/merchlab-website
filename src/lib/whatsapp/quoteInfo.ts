import { getSupabaseAdmin } from '../supabaseAdmin';

const STORAGE_BASE_URL = 'https://fxsqdpmmddcidjwzxtpc.supabase.co/storage/v1/object/public/audit-reports';

interface CustomerInfo {
  name: string;
  company: string;
  email: string;
  phone: string;
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

// Extract customer details from quote payload
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

// Format PDF URL for quote
function formatPdfUrl(quoteNo: string): string {
  return `${STORAGE_BASE_URL}/${quoteNo}.pdf`;
}

/**
 * Get quote information by quote number
 * Returns quote details including customer info, PDF URL, and creation date
 */
export interface QuoteInfo {
  quoteNo: string;
  customer: CustomerInfo | null;
  pdfUrl: string;
  createdAt: string | null;
  value: number | null;
}

export async function getQuoteInfo(quoteNumber: string): Promise<QuoteInfo | null> {
  const supabase = getSupabaseAdmin();
  
  // Clean the quote number (remove any prefixes if needed)
  let cleanQuoteNo = quoteNumber.trim();
  
  // Remove common prefixes if present
  if (cleanQuoteNo.toUpperCase().startsWith('QUOTE-')) {
    cleanQuoteNo = cleanQuoteNo.substring(6);
  }
  
  // Try to find the quote
  const { data, error } = await supabase
    .from('quote_docs')
    .select('quote_no, created_at, payload')
    .eq('quote_no', cleanQuoteNo)
    .single();

  if (error || !data) {
    // Try with different formats
    const variations = [
      cleanQuoteNo,
      cleanQuoteNo.toUpperCase(),
      cleanQuoteNo.toLowerCase(),
    ];
    
    for (const variation of variations) {
      const { data: altData } = await supabase
        .from('quote_docs')
        .select('quote_no, created_at, payload')
        .eq('quote_no', variation)
        .single();
      
      if (altData) {
        const customer = extractCustomerFromPayload(altData.payload);
        const value = parseGrandTotal(altData.payload);
        return {
          quoteNo: altData.quote_no,
          customer,
          pdfUrl: formatPdfUrl(altData.quote_no),
          createdAt: altData.created_at,
          value,
        };
      }
    }
    
    return null;
  }

  const customer = extractCustomerFromPayload(data.payload);
  const value = parseGrandTotal(data.payload);
  
  return {
    quoteNo: data.quote_no,
    customer,
    pdfUrl: formatPdfUrl(data.quote_no),
    createdAt: data.created_at,
    value,
  };
}

// Parse grand total from payload (reused from metrics)
function parseGrandTotal(payload: unknown): number | null {
  const p = parsePayload(payload);
  if (!p) return null;
  
  // Try different possible field names for grand total
  const grandTotal = p.grandTotal ?? p.grand_total ?? p.total ?? p.totalCost ?? p.total_cost;
  
  if (typeof grandTotal === 'number') {
    return grandTotal;
  }
  
  if (typeof grandTotal === 'string') {
    const parsed = parseFloat(grandTotal);
    if (!isNaN(parsed)) {
      return parsed;
    }
  }
  
  return null;
}

