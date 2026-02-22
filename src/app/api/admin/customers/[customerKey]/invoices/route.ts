import { NextRequest, NextResponse } from 'next/server';
import { isAuthed, noIndexHeaders } from '@/lib/adminAuth';
import { readInvoices } from '@/server/admin/metrics';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// --- helpers ---
const pickStr = (obj: unknown, keys: string[], fallback = ''): string => {
  if (!obj || typeof obj !== 'object') return fallback;
  const rec = obj as Record<string, unknown>;
  for (const k of keys) {
    const v = rec[k];
    if (typeof v === 'string' && v.trim() !== '') return v;
  }
  return fallback;
};

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

function parseGrandTotal(payload: unknown): number {
  const p = parsePayload(payload);
  const totals = p?.totals as Record<string, unknown> | undefined;
  const total = totals?.grand_total;
  if (typeof total === 'number') return total;
  if (typeof total === 'string') {
    const parsed = parseFloat(total);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

const STORAGE_BASE_URL = 'https://fxsqdpmmddcidjwzxtpc.supabase.co/storage/v1/object/public/audit-reports';

function formatPdfUrl(id: string): string {
  if (!id.startsWith('INV-')) {
    id = `INV-${id}`;
  }
  return `${STORAGE_BASE_URL}/${id}.pdf`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ customerKey: string }> }
) {
  if (!(await isAuthed())) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: noIndexHeaders() }
    );
  }

  try {
    const { customerKey } = await params;
    // Decode the customer key (format: "Customer Name|Company")
    const decoded = decodeURIComponent(customerKey);
    const [customerName, company] = decoded.split('|');
    
    // Fetch all invoices
    const invoices = await readInvoices();
    
    // Filter invoices for this customer
    const customerInvoices = invoices
      .map((inv) => {
        const p = parsePayload(inv.payload);
        const customerUnknown = (p?.customer ?? p?.enquiryCustomer) as unknown;
        
        const firstName = pickStr(customerUnknown, ['firstName', 'first_name']);
        const lastName = pickStr(customerUnknown, ['lastName', 'last_name']);
        const invCompany = pickStr(customerUnknown, ['company'], '-');
        
        const invCustomerName = `${firstName} ${lastName}`.trim() || 'Unknown';
        const invCompanyNormalized = invCompany || '-';
        
        // Match by customer name and company
        if (
          invCustomerName.toLowerCase() === customerName.toLowerCase() &&
          invCompanyNormalized.toLowerCase() === (company || '-').toLowerCase()
        ) {
          return {
            created_at: inv.created_at,
            invoice_no: inv.invoice_no,
            value: parseGrandTotal(inv.payload),
            pdf_url: formatPdfUrl(inv.invoice_no),
          };
        }
        return null;
      })
      .filter((inv): inv is NonNullable<typeof inv> => inv !== null)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json(
      {
        invoices: customerInvoices,
        total: customerInvoices.length,
      },
      {
        headers: {
          ...noIndexHeaders(),
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('Customer invoices API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: noIndexHeaders() }
    );
  }
}

