import { NextRequest, NextResponse } from 'next/server';
import { isAuthed, noIndexHeaders } from '@/lib/adminAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { parseGrandTotal } from '@/server/admin/metrics';

export const runtime = 'nodejs';

// OAuth2 configuration
function getBarronOAuthConfig() {
  const clientId = process.env.BARRON_CLIENT_ID;
  const clientSecret = process.env.BARRON_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new Error('BARRON_CLIENT_ID and BARRON_CLIENT_SECRET environment variables are required');
  }
  
  return {
    clientId,
    clientSecret,
    tokenUrl: 'https://barronb2c.b2clogin.com/barronb2c.onmicrosoft.com/B2C_1_SignIn_US/oauth2/v2.0/token',
    scope: 'openid offline_access https://barronb2c.onmicrosoft.com/4fbb5489-a64f-4ff6-a9f0-05f5fa2f72e5/Orders',
    ordersApiUrl: 'https://integration.barron.com/orders/salesorders',
  };
}

// In-memory token cache
let accessTokenCache: { token: string; expiresAt: number; refreshToken?: string } | null = null;

// Get OAuth2 access token using refresh token
async function getAccessToken(): Promise<string> {
  if (accessTokenCache && accessTokenCache.expiresAt > Date.now()) {
    return accessTokenCache.token;
  }

  const refreshToken = process.env.BARRON_REFRESH_TOKEN || accessTokenCache?.refreshToken;
  if (!refreshToken) {
    throw new Error('BARRON_REFRESH_TOKEN environment variable is not set');
  }

  const config = getBarronOAuthConfig();
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
    scope: config.scope,
  });

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 400 || response.status === 401) {
      accessTokenCache = null;
      throw new Error(`Refresh token is invalid or expired: ${errorText}`);
    }
    throw new Error(`Failed to get access token: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  accessTokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + ((data.expires_in || 3600) - 300) * 1000,
    refreshToken: data.refresh_token || refreshToken,
  };

  return data.access_token;
}

// Fetch orders from Barron API
async function fetchOrdersFromBarron(): Promise<Array<{
  orderId: string;
  contactPersonId: string;
  customerReference: string;
  orderDate: string;
  totalIncVat: number;
  sample: boolean;
  cartId: string;
  branded: boolean;
  status: string;
  hexCode: string;
  orderTaker: string;
  isDelivery: boolean;
}>> {
  const accessToken = await getAccessToken();
  const config = getBarronOAuthConfig();
  const response = await fetch(config.ordersApiUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch orders: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  if (Array.isArray(data) && data.length > 0 && data[0].results) {
    return data[0].results;
  }
  if (data && typeof data === 'object' && !Array.isArray(data) && data.results) {
    return data.results;
  }
  return [];
}

// Helper functions
function pickStr(obj: unknown, keys: string[], fallback = ''): string {
  if (!obj || typeof obj !== 'object') return fallback;
  const rec = obj as Record<string, unknown>;
  for (const k of keys) {
    const v = rec[k];
    if (typeof v === 'string' && v.trim() !== '') return v;
  }
  return fallback;
}

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

function extractQuoteNumber(customerReference: string): string | null {
  if (!customerReference) return null;
  let cleaned = customerReference.trim().replace(/^[\s*:]+|[\s*:]+$/g, '');
  if (cleaned.startsWith('Q')) {
    const match = cleaned.match(/^(Q\d+[-]\w+)/);
    if (match) return match[1];
    const match2 = cleaned.match(/^(Q\d+[-][A-Z0-9]+)/);
    if (match2) return match2[1];
  }
  return null;
}

async function findInvoiceNumberFromQuote(quoteNo: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data: invoices } = await supabase
    .from('invoice_docs')
    .select('invoice_no, payload')
    .order('created_at', { ascending: false })
    .limit(1000);

  if (!invoices) return null;

  const cleanQuoteNo = quoteNo.trim();
  for (const invoice of invoices) {
    const payloadStr = typeof invoice.payload === 'string' 
      ? invoice.payload 
      : JSON.stringify(invoice.payload);
    if (payloadStr.includes(cleanQuoteNo) || payloadStr.includes(cleanQuoteNo.toUpperCase()) || payloadStr.includes(cleanQuoteNo.toLowerCase())) {
      return invoice.invoice_no;
    }
  }
  return null;
}

async function getQuoteDetails(quoteNo: string): Promise<{
  sellingPrice: number | null;
  customer: { name: string; company: string; email: string; phone: string; } | null;
  invoiceNo: string | null;
}> {
  const supabase = getSupabaseAdmin();
  const cleanQuoteNo = quoteNo.trim();
  const { data, error } = await supabase
    .from('quote_docs')
    .select('payload')
    .eq('quote_no', cleanQuoteNo)
    .single();

  if (error || !data) {
    const variations = [cleanQuoteNo, cleanQuoteNo.toUpperCase(), cleanQuoteNo.toLowerCase()];
    for (const variation of variations) {
      const { data: altData } = await supabase
        .from('quote_docs')
        .select('payload')
        .eq('quote_no', variation)
        .single();
      if (altData) {
        const p = parsePayload(altData.payload);
        const sellingPrice = parseGrandTotal(altData.payload);
        const customerUnknown = (p?.enquiryCustomer ?? p?.customer) as unknown;
        let customer = null;
        if (customerUnknown && typeof customerUnknown === 'object') {
          const firstName = pickStr(customerUnknown, ['firstName', 'first_name']);
          const lastName = pickStr(customerUnknown, ['lastName', 'last_name']);
          const company = pickStr(customerUnknown, ['company'], '-');
          const email = pickStr(customerUnknown, ['email']);
          const phone = pickStr(customerUnknown, ['telephoneNumber', 'telephone', 'phone', 'phoneNumber']);
          customer = {
            name: `${firstName} ${lastName}`.trim() || 'Unknown',
            company: company || '-',
            email: email || '-',
            phone: phone || '-',
          };
        }
        const invoiceNo = await findInvoiceNumberFromQuote(cleanQuoteNo);
        return { sellingPrice, customer, invoiceNo };
      }
    }
    const invoiceNo = await findInvoiceNumberFromQuote(cleanQuoteNo);
    return { sellingPrice: null, customer: null, invoiceNo };
  }

  const p = parsePayload(data.payload);
  const sellingPrice = parseGrandTotal(data.payload);
  const customerUnknown = (p?.enquiryCustomer ?? p?.customer) as unknown;
  let customer = null;
  if (customerUnknown && typeof customerUnknown === 'object') {
    const firstName = pickStr(customerUnknown, ['firstName', 'first_name']);
    const lastName = pickStr(customerUnknown, ['lastName', 'last_name']);
    const company = pickStr(customerUnknown, ['company'], '-');
    const email = pickStr(customerUnknown, ['email']);
    const phone = pickStr(customerUnknown, ['telephoneNumber', 'telephone', 'phone', 'phoneNumber']);
    customer = {
      name: `${firstName} ${lastName}`.trim() || 'Unknown',
      company: company || '-',
      email: email || '-',
      phone: phone || '-',
    };
  }
  const invoiceNo = await findInvoiceNumberFromQuote(cleanQuoteNo);
  return { sellingPrice, customer, invoiceNo };
}

function escapeHtml(text: string | number | null | undefined): string {
  if (text === null || text === undefined) return 'N/A';
  const str = String(text);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatCurrency(value: number | null): string {
  if (value === null) return 'N/A';
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function renderOrdersHTML(orders: Array<{
  orderId: string;
  customerReference: string;
  orderDate: string;
  totalIncVat: number;
  status: string;
  sellingPrice: number | null;
  profit: number | null;
  profitMargin: number | null;
  customer: { name: string; company: string; email: string; phone: string; } | null;
  invoiceNo: string | null;
}>): string {
  const brandLogoUrl = process.env.REPORT_BRAND_LOGO_URL || '';
  const sigLogoUrl = process.env.REPORT_SIG_LOGO_URL || '';
  const dateStr = new Date().toISOString().split('T')[0];
  const reportRef = `ORD-${dateStr}-${Date.now().toString().slice(-4)}`;

  const totalCost = orders.reduce((sum, o) => sum + o.totalIncVat, 0);
  const totalSelling = orders.reduce((sum, o) => sum + (o.sellingPrice || 0), 0);
  const totalProfit = orders.reduce((sum, o) => sum + (o.profit || 0), 0);
  const avgMargin = orders.length > 0 
    ? orders.reduce((sum, o) => sum + (o.profitMargin || 0), 0) / orders.length 
    : 0;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 11px; color: #1e293b; line-height: 1.5; }
    .page { width: 210mm; min-height: 297mm; padding: 20mm; background: white; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #e2e8f0; }
    .logo { height: 40px; }
    .title { font-size: 24px; font-weight: 700; color: #0f172a; }
    .meta { font-size: 9px; color: #64748b; margin-top: 8px; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
    .summary-card { background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0; }
    .summary-label { font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .summary-value { font-size: 16px; font-weight: 600; color: #0f172a; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th { background: #f1f5f9; padding: 8px 6px; text-align: left; font-size: 9px; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0; }
    td { padding: 8px 6px; border-bottom: 1px solid #e2e8f0; font-size: 10px; }
    .text-right { text-align: right; }
    .status { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 9px; font-weight: 500; }
    .status-delivered { background: #dcfce7; color: #166534; }
    .status-transit { background: #dbeafe; color: #1e40af; }
    .status-invoiced { background: #f3e8ff; color: #6b21a8; }
    .status-error { background: #fee2e2; color: #991b1b; }
    .status-default { background: #f1f5f9; color: #475569; }
    .positive { color: #16a34a; font-weight: 600; }
    .negative { color: #dc2626; font-weight: 600; }
    .footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 9px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div>
        <div class="title">Orders Report</div>
        <div class="meta">Generated: ${new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} | Reference: ${reportRef}</div>
      </div>
      ${brandLogoUrl ? `<img src="${brandLogoUrl}" alt="Logo" class="logo" />` : ''}
    </div>

    <div class="summary">
      <div class="summary-card">
        <div class="summary-label">Total Orders</div>
        <div class="summary-value">${orders.length}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Total Cost</div>
        <div class="summary-value">${formatCurrency(totalCost)}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Total Revenue</div>
        <div class="summary-value">${formatCurrency(totalSelling)}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Total Profit</div>
        <div class="summary-value ${totalProfit >= 0 ? 'positive' : 'negative'}">${formatCurrency(totalProfit)}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Order ID</th>
          <th>Date</th>
          <th>Customer Reference</th>
          <th>Customer</th>
          <th>Company</th>
          <th>Status</th>
          <th class="text-right">Cost Price</th>
          <th class="text-right">Selling Price</th>
          <th class="text-right">Profit</th>
          <th class="text-right">Margin</th>
        </tr>
      </thead>
      <tbody>
        ${orders.map(order => {
          const statusClass = order.status.toLowerCase().includes('delivered') ? 'status-delivered' :
            order.status.toLowerCase().includes('transit') ? 'status-transit' :
            order.status.toLowerCase().includes('invoiced') ? 'status-invoiced' :
            order.status.toLowerCase().includes('error') ? 'status-error' : 'status-default';
          return `
          <tr>
            <td>${escapeHtml(order.orderId)}</td>
            <td>${formatDate(order.orderDate)}</td>
            <td>${escapeHtml(order.customerReference || '-')}</td>
            <td>${escapeHtml(order.customer?.name || 'N/A')}</td>
            <td>${escapeHtml(order.customer?.company || 'N/A')}</td>
            <td><span class="status ${statusClass}">${escapeHtml(order.status)}</span></td>
            <td class="text-right">${formatCurrency(order.totalIncVat)}</td>
            <td class="text-right">${formatCurrency(order.sellingPrice)}</td>
            <td class="text-right ${order.profit !== null && order.profit >= 0 ? 'positive' : order.profit !== null ? 'negative' : ''}">${formatCurrency(order.profit)}</td>
            <td class="text-right ${order.profitMargin !== null && order.profitMargin >= 0 ? 'positive' : order.profitMargin !== null ? 'negative' : ''}">${order.profitMargin !== null ? order.profitMargin.toFixed(1) + '%' : 'N/A'}</td>
          </tr>
          `;
        }).join('')}
      </tbody>
    </table>

    <div class="footer">
      <p>This report contains ${orders.length} order${orders.length !== 1 ? 's' : ''} | Average Margin: ${avgMargin.toFixed(1)}%</p>
      ${sigLogoUrl ? `<img src="${sigLogoUrl}" alt="Signature" style="height: 24px; margin-top: 8px;" />` : ''}
    </div>
  </div>
</body>
</html>`;
}

export async function POST(request: NextRequest) {
  if (!isAuthed(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: noIndexHeaders() }
    );
  }

  const n8nPdfUrl = process.env.N8N_PDF_URL;
  if (!n8nPdfUrl) {
    return NextResponse.json(
      { error: 'Server configuration error: N8N_PDF_URL is not set' },
      { status: 500, headers: noIndexHeaders() }
    );
  }

  try {
    const orders = await fetchOrdersFromBarron();
    
    // Enrich orders with quote details
    const enrichedOrders = await Promise.all(
      orders.map(async (order) => {
        const quoteNo = extractQuoteNumber(order.customerReference);
        let sellingPrice: number | null = null;
        let customer: { name: string; company: string; email: string; phone: string; } | null = null;
        let invoiceNo: string | null = null;

        if (quoteNo) {
          const quoteDetails = await getQuoteDetails(quoteNo);
          sellingPrice = quoteDetails.sellingPrice;
          customer = quoteDetails.customer;
          invoiceNo = quoteDetails.invoiceNo;
        }

        return {
          ...order,
          sellingPrice,
          customer,
          invoiceNo,
          profit: sellingPrice !== null ? sellingPrice - order.totalIncVat : null,
          profitMargin: sellingPrice !== null && sellingPrice > 0 
            ? ((sellingPrice - order.totalIncVat) / sellingPrice) * 100 
            : null,
        };
      })
    );

    enrichedOrders.sort((a, b) => {
      const dateA = new Date(a.orderDate).getTime();
      const dateB = new Date(b.orderDate).getTime();
      return dateB - dateA;
    });

    const html = renderOrdersHTML(enrichedOrders);
    const htmlFile = new Blob([html], { type: 'text/html' });

    const formData = new FormData();
    formData.append('printBackground', 'true');
    formData.append('preferCssPageSize', 'true');
    formData.append('marginTop', '0');
    formData.append('marginBottom', '0');
    formData.append('marginLeft', '0');
    formData.append('marginRight', '0');
    formData.append('scale', '1');
    formData.append('files', htmlFile, 'index.html');

    const pdfResponse = await fetch(n8nPdfUrl, {
      method: 'POST',
      body: formData,
    });

    if (!pdfResponse.ok) {
      const errorText = await pdfResponse.text().catch(() => 'Unknown error');
      return NextResponse.json(
        { error: `PDF generation failed: ${errorText}` },
        { status: 502, headers: noIndexHeaders() }
      );
    }

    const pdfBlob = await pdfResponse.blob();
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `MerchLab-Orders-Report_${dateStr}.pdf`;

    return new NextResponse(pdfBlob, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        ...noIndexHeaders(),
      },
    });
  } catch (error) {
    console.error('Orders PDF export error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500, headers: noIndexHeaders() }
    );
  }
}

