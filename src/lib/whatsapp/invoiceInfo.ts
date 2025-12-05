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

// Extract customer details from invoice payload
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

// Format PDF URL for invoice
function formatPdfUrl(invoiceNo: string): string {
  return `${STORAGE_BASE_URL}/${invoiceNo}.pdf`;
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

// Extract shareable invoice details from payload (excluding base_price and beforeVAT)
function extractShareableInvoiceDetails(payload: unknown): Record<string, unknown> {
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
  if (match27) {
    console.log(`Extracted phone core from ${cleaned}: ${match27[1]} (removed country code 27)`);
    return match27[1];
  }

  // Pattern 2: Starts with 0 followed by 9 digits
  const match0 = cleaned.match(/^0(\d{9})$/);
  if (match0) {
    console.log(`Extracted phone core from ${cleaned}: ${match0[1]} (removed leading 0)`);
    return match0[1];
  }

  // Pattern 3: Just 9 digits
  const match9 = cleaned.match(/^(\d{9})$/);
  if (match9) {
    console.log(`Extracted phone core from ${cleaned}: ${match9[1]} (already 9 digits)`);
    return match9[1];
  }

  console.log(`Could not extract phone core from: ${cleaned}`);
  return null;
}

/**
 * Check if a phone number in payload matches the target phone core
 */
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

/**
 * Get invoice information by invoice number
 * Returns invoice details including customer info, PDF URL, creation date, total amount, and shareable invoice details
 */
export interface InvoiceInfo {
  invoiceNo: string;
  customer: CustomerInfo | null;
  pdfUrl: string;
  createdAt: string | null;
  value: number | null; // Grand total amount
  shareableDetails: Record<string, unknown>; // All invoice details except base_price and beforeVAT
}

export async function getInvoiceInfo(invoiceNumber: string): Promise<InvoiceInfo | null> {
  const supabase = getSupabaseAdmin();

  // Clean the invoice number
  const cleanInvoiceNo = invoiceNumber.trim();
  console.log(`getInvoiceInfo: Looking up invoice with number: "${cleanInvoiceNo}"`);

  // The database stores invoice numbers with "INV-" prefix (e.g., "INV-Q450-Z6IYO" or "INV-ML-FL1KC")
  // Try both with and without the prefix
  const variations: string[] = [];
  
  // If it already has INV- prefix, use it as is
  if (cleanInvoiceNo.toUpperCase().startsWith('INV-')) {
    // Try exact match first (most common case)
    variations.push(cleanInvoiceNo);
    variations.push(cleanInvoiceNo.toUpperCase());
    variations.push(cleanInvoiceNo.toLowerCase());
    // Also try without prefix
    variations.push(cleanInvoiceNo.substring(4));
    variations.push(cleanInvoiceNo.substring(4).toUpperCase());
    variations.push(cleanInvoiceNo.substring(4).toLowerCase());
  } else {
    // If no prefix, try with and without
    variations.push(`INV-${cleanInvoiceNo}`);
    variations.push(`INV-${cleanInvoiceNo.toUpperCase()}`);
    variations.push(`INV-${cleanInvoiceNo.toLowerCase()}`);
    variations.push(cleanInvoiceNo);
    variations.push(cleanInvoiceNo.toUpperCase());
    variations.push(cleanInvoiceNo.toLowerCase());
  }

  console.log(`getInvoiceInfo: Trying variations: ${variations.join(', ')}`);

  // Try to find the invoice with each variation
  for (const variation of variations) {
    console.log(`getInvoiceInfo: Trying variation: "${variation}"`);
    const { data, error } = await supabase
      .from('invoice_docs')
      .select('invoice_no, created_at, payload')
      .eq('invoice_no', variation)
      .single();

    if (error) {
      console.log(`getInvoiceInfo: Error for variation "${variation}":`, error.message, error.code);
      // Continue to next variation
      continue;
    }

    if (data) {
      console.log(`getInvoiceInfo: Found invoice: ${data.invoice_no} (matched variation: "${variation}")`);
      const customer = extractCustomerFromPayload(data.payload);
      const value = parseGrandTotal(data.payload);
      const shareableDetails = extractShareableInvoiceDetails(data.payload);
      return {
        invoiceNo: data.invoice_no, // Use the actual invoice_no from database (with INV- prefix)
        customer,
        pdfUrl: formatPdfUrl(data.invoice_no), // Use the actual invoice_no for PDF URL
        createdAt: data.created_at,
        value,
        shareableDetails,
      };
    }
  }

  console.log(`getInvoiceInfo: Invoice not found for: "${invoiceNumber}" (tried ${variations.length} variations: ${variations.join(', ')})`);
  
  // As a last resort, try a case-insensitive search using ilike (PostgreSQL)
  // This is a fallback in case there are any hidden characters or encoding issues
  console.log(`getInvoiceInfo: Trying case-insensitive search as fallback`);
  const { data: fallbackData, error: fallbackError } = await supabase
    .from('invoice_docs')
    .select('invoice_no, created_at, payload')
    .ilike('invoice_no', cleanInvoiceNo)
    .limit(1)
    .maybeSingle();

  if (!fallbackError && fallbackData) {
    console.log(`getInvoiceInfo: Found invoice using case-insensitive search: ${fallbackData.invoice_no}`);
    const customer = extractCustomerFromPayload(fallbackData.payload);
    const value = parseGrandTotal(fallbackData.payload);
    const shareableDetails = extractShareableInvoiceDetails(fallbackData.payload);
    return {
      invoiceNo: fallbackData.invoice_no,
      customer,
      pdfUrl: formatPdfUrl(fallbackData.invoice_no),
      createdAt: fallbackData.created_at,
      value,
      shareableDetails,
    };
  }

  return null;
}

/**
 * Get the most recent invoice for a given phone number.
 */
export async function getMostRecentInvoiceByPhone(phoneNumber: string): Promise<InvoiceInfo | null> {
  const phoneCore = extractPhoneCore(phoneNumber);
  if (!phoneCore) {
    console.log(`Invalid phone number format for lookup: ${phoneNumber}`);
    return null;
  }

  const supabase = getSupabaseAdmin();

  try {
    // Fetch all invoices ordered by creation date (most recent first)
    const { data: invoices, error } = await supabase
      .from('invoice_docs')
      .select('invoice_no, created_at, payload')
      .order('created_at', { ascending: false }); // Most recent first

    if (error) {
      console.error('Error fetching invoices for phone lookup:', error);
      return null;
    }

    if (!invoices || invoices.length === 0) {
      console.log('No invoices found in database for phone lookup.');
      return null;
    }

    console.log(`getMostRecentInvoiceByPhone: Fetched ${invoices.length} invoices from database`);

    // Find the first invoice that matches the phone number
    for (const invoice of invoices) {
      if (phoneMatches(invoice.payload, phoneCore)) {
        console.log(`Found most recent invoice by phone number: ${invoice.invoice_no}`);
        const customer = extractCustomerFromPayload(invoice.payload);
        const value = parseGrandTotal(invoice.payload);
        const shareableDetails = extractShareableInvoiceDetails(invoice.payload);

        return {
          invoiceNo: invoice.invoice_no,
          customer,
          pdfUrl: formatPdfUrl(invoice.invoice_no),
          createdAt: invoice.created_at,
          value,
          shareableDetails,
        };
      }
    }

    console.log(`No invoices found matching phone number: ${phoneNumber}`);
    return null;
  } catch (error) {
    console.error('Error in getMostRecentInvoiceByPhone:', error);
    return null;
  }
}

