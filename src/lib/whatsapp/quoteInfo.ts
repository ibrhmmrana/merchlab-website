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
 * Returns quote details including customer info, PDF URL, creation date, total amount, and shareable quote details
 */
export interface QuoteInfo {
  quoteNo: string;
  customer: CustomerInfo | null;
  pdfUrl: string;
  createdAt: string | null;
  value: number | null; // Grand total amount
  shareableDetails: Record<string, unknown>; // All quote details except base_price and beforeVAT
}

/**
 * Find the most recent quote by phone number
 * Returns the most recent quote for the given phone number
 */
export async function getMostRecentQuoteByPhone(phoneNumber: string): Promise<QuoteInfo | null> {
  const supabase = getSupabaseAdmin();
  
  console.log(`getMostRecentQuoteByPhone: Looking up quote for phone number: ${phoneNumber}`);
  
  // Extract phone core (9 digits) from phone number
  const phoneCore = extractPhoneCore(phoneNumber);
  if (!phoneCore) {
    console.log(`getMostRecentQuoteByPhone: Could not extract phone core from: ${phoneNumber}`);
    return null;
  }
  
  console.log(`getMostRecentQuoteByPhone: Extracted phone core: ${phoneCore} from input: ${phoneNumber}`);
  
  try {
    // Fetch all quotes ordered by creation date (most recent first)
    const { data: quotes, error } = await supabase
      .from('quote_docs')
      .select('quote_no, created_at, payload')
      .order('created_at', { ascending: false });
    
    if (error || !quotes) {
      console.error('Error fetching quotes:', error);
      return null;
    }
    
    console.log(`getMostRecentQuoteByPhone: Fetched ${quotes.length} quotes from database`);
    
    // Find quotes matching the phone number
    const matchingQuotes = quotes.filter((q) => phoneMatches(q.payload, phoneCore));
    
    console.log(`getMostRecentQuoteByPhone: Found ${matchingQuotes.length} matching quotes for phone core: ${phoneCore}`);
    
    if (matchingQuotes.length === 0) {
      console.log(`getMostRecentQuoteByPhone: No quotes found matching phone core: ${phoneCore}`);
      return null;
    }
    
    // Get the most recent quote (first in the array since we ordered by created_at desc)
    const mostRecentQuote = matchingQuotes[0];
    
    const customer = extractCustomerFromPayload(mostRecentQuote.payload);
    const value = parseGrandTotal(mostRecentQuote.payload);
    const shareableDetails = extractShareableQuoteDetails(mostRecentQuote.payload);
    
    return {
      quoteNo: mostRecentQuote.quote_no,
      customer,
      pdfUrl: formatPdfUrl(mostRecentQuote.quote_no),
      createdAt: mostRecentQuote.created_at,
      value,
      shareableDetails,
    };
  } catch (error) {
    console.error('Error finding quote by phone number:', error);
    return null;
  }
}

// Helper to extract phone core (9 digits) from phone number
function extractPhoneCore(phone: string): string | null {
  if (!phone) return null;
  
  // Remove all spaces, dashes, and parentheses
  const cleaned = phone.replace(/[\s\-()]/g, '');
  
  // Extract 9 digits - try different patterns
  // Pattern 1: Starts with 27 followed by 9 digits (e.g., "27693475825" -> "693475825")
  const match27 = cleaned.match(/^27(\d{9})$/);
  if (match27) {
    console.log(`Extracted phone core from ${cleaned}: ${match27[1]} (removed country code 27)`);
    return match27[1];
  }
  
  // Pattern 2: Starts with 0 followed by 9 digits (e.g., "0693475825" -> "693475825")
  const match0 = cleaned.match(/^0(\d{9})$/);
  if (match0) {
    console.log(`Extracted phone core from ${cleaned}: ${match0[1]} (removed leading 0)`);
    return match0[1];
  }
  
  // Pattern 3: Just 9 digits (e.g., "693475825" -> "693475825")
  const match9 = cleaned.match(/^(\d{9})$/);
  if (match9) {
    console.log(`Extracted phone core from ${cleaned}: ${match9[1]} (already 9 digits)`);
    return match9[1];
  }
  
  console.log(`Could not extract phone core from: ${cleaned}`);
  return null;
}

// Helper to check if phone number in payload matches target phone core
function phoneMatches(payload: unknown, targetPhoneCore: string): boolean {
  if (!targetPhoneCore) {
    console.log('phoneMatches: No target phone core provided');
    return false;
  }
  
  const p = parsePayload(payload);
  if (!p || typeof p !== 'object') {
    console.log('phoneMatches: Could not parse payload');
    return false;
  }
  
  // Check both customer and enquiryCustomer
  const customerUnknown = (p?.customer ?? p?.enquiryCustomer) as unknown;
  if (!customerUnknown || typeof customerUnknown !== 'object') {
    console.log('phoneMatches: No customer or enquiryCustomer found in payload');
    return false;
  }
  
  const customer = customerUnknown as Record<string, unknown>;
  const phone = pickStr(customer, ['phone', 'telephone', 'telephoneNumber', 'phoneNumber']);
  if (!phone) {
    console.log('phoneMatches: No phone number found in customer data');
    return false;
  }
  
  const phoneCore = extractPhoneCore(phone);
  const matches = phoneCore === targetPhoneCore;
  console.log(`phoneMatches: Comparing "${phoneCore}" (from payload: "${phone}") with "${targetPhoneCore}" -> ${matches}`);
  return matches;
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
        const shareableDetails = extractShareableQuoteDetails(altData.payload);
        return {
          quoteNo: altData.quote_no,
          customer,
          pdfUrl: formatPdfUrl(altData.quote_no),
          createdAt: altData.created_at,
          value,
          shareableDetails,
        };
      }
    }
    
    return null;
  }

  const customer = extractCustomerFromPayload(data.payload);
  const value = parseGrandTotal(data.payload);
  const shareableDetails = extractShareableQuoteDetails(data.payload);
  
  return {
    quoteNo: data.quote_no,
    customer,
    pdfUrl: formatPdfUrl(data.quote_no),
    createdAt: data.created_at,
    value,
    shareableDetails,
  };
}

// Parse grand total from payload (matches metrics.ts structure)
function parseGrandTotal(payload: unknown): number | null {
  const p = parsePayload(payload);
  if (!p) return null;
  
  // Check totals.grand_total first (standard structure)
  const totals = p.totals as Record<string, unknown> | undefined;
  if (totals?.grand_total) {
    const total = totals.grand_total;
    if (typeof total === 'number') return total;
    if (typeof total === 'string') {
      const parsed = parseFloat(total);
      if (!isNaN(parsed)) return parsed;
    }
  }
  
  // Fallback to other possible field names
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

// Extract shareable quote details from payload (excluding base_price and beforeVAT)
function extractShareableQuoteDetails(payload: unknown): Record<string, unknown> {
  const p = parsePayload(payload);
  if (!p) return {};
  
  const shareable: Record<string, unknown> = {};
  
  // Copy all fields except base_price and beforeVAT
  for (const [key, value] of Object.entries(p)) {
    // Skip base_price and beforeVAT (case-insensitive)
    if (key.toLowerCase() === 'base_price' || key.toLowerCase() === 'beforevat') {
      continue;
    }
    
    // If it's an items array, clean each item
    if (key === 'items' && Array.isArray(value)) {
      shareable[key] = value.map((item: unknown) => {
        if (typeof item === 'object' && item !== null) {
          const cleanedItem: Record<string, unknown> = {};
          for (const [itemKey, itemValue] of Object.entries(item as Record<string, unknown>)) {
            // Skip base_price and beforeVAT in items too
            if (itemKey.toLowerCase() !== 'base_price' && itemKey.toLowerCase() !== 'beforevat') {
              cleanedItem[itemKey] = itemValue;
            }
          }
          return cleanedItem;
        }
        return item;
      });
    } else {
      shareable[key] = value;
    }
  }
  
  return shareable;
}

