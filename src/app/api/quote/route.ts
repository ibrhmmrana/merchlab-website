import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type IncomingItem = {
  quantity: number;
  stock_id: number;
  stock_header_id: number;
  stock_code: string;
  description: string;
  colour: string | null;
  size: string | null;
  image_url: string | null;
  brand: string | null;
  base_price: number | null;
  discounted_price: number | null;
  qty_available: number;
  category: string | null;
  type: string | null;
  gender: string | null;
  garment_type: string | null;
  weight_per_unit: number | null;
  royalty_factor: number | null;
  color_status: string | null;
  // Camel case aliases for compatibility
  stockId?: number;
  stockHeaderId?: number;
};

type EnquiryData = {
  items: IncomingItem[];
  [key: string]: unknown;
};

type WebhookPayload = {
  fullEnquiryJson: string;
  timestamp: string;
  merchant_order_no: string;
};

function normColour(c?: string | null): string {
  return (c ?? '').toLowerCase().split('/')[0].trim();
}

async function ensureStockIds(items: IncomingItem[]): Promise<IncomingItem[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.warn('ensureStockIds: Missing Supabase credentials');
    return items; // best effort
  }

  const sb = createClient(supabaseUrl, supabaseKey);

  // Collect unique headers for a single batched fetch
  const headerIds = Array.from(
    new Set(items.map(i => i.stockHeaderId))
  );

  console.log('ensureStockIds: Checking headers:', headerIds);

  // Pull all rows for those headers once, then match locally by colour/size
  const { data, error } = await sb
    .from('products_flat')
    .select('stock_id, stock_header_id, colour, size')
    .in('stock_header_id', headerIds);

  if (error) {
    console.warn('ensureStockIds: supabase error', error);
    return items; // best effort
  }

  const rows = data ?? [];
  console.log('ensureStockIds: Found', rows.length, 'rows from Supabase');

  for (const item of items) {
    const looksWrong = !item.stockId || item.stockId === item.stockHeaderId;

    if (looksWrong) {
      console.log(`ensureStockIds: Fixing item with stockId=${item.stockId}, header=${item.stockHeaderId}`);
      
      const match = rows.find(r =>
        r.stock_header_id === item.stockHeaderId &&
        normColour(r.colour) === normColour(item.colour) &&
        String(r.size ?? '').trim().toLowerCase() === String(item.size ?? '').trim().toLowerCase()
      );
      
      if (match?.stock_id) {
        const before = item.stockId;
        item.stockId = match.stock_id;
        console.info('Fixed stock id', { before, after: item.stockId, colour: item.colour, size: item.size });
      } else {
        console.warn(`ensureStockIds: No match found for header=${item.stockHeaderId}, colour=${item.colour}, size=${item.size}`);
      }
    }
  }

  // Hard assertion: Check for any remaining bad stock_ids
  const badItems = items.filter(item => !item.stockId || item.stockId === item.stockHeaderId);
  if (badItems.length > 0) {
    console.error('StockId resolution failed for items:', badItems);
    throw new Error(`StockId resolution failed for ${badItems.length} items. Check logs for details.`);
  }

  return items;
}

export async function POST(req: Request) {
  try {
    const { fullEnquiryJson, timestamp, merchant_order_no } = await req.json();
    
    // Temporary log for debugging
    console.log('SERVER RECEIVED CLIENT BODY', JSON.stringify({ 
      fullEnquiryJson: typeof fullEnquiryJson === 'string' ? JSON.parse(fullEnquiryJson) : fullEnquiryJson,
      timestamp, 
      merchant_order_no 
    }, null, 2));
    
    // Parse the fullEnquiryJson to get items and fix stock_ids
    let enquiryData: EnquiryData;
    try {
      enquiryData = JSON.parse(fullEnquiryJson);
    } catch (e) {
      console.error('Failed to parse fullEnquiryJson:', e);
      return NextResponse.json({ error: "Invalid fullEnquiryJson format" }, { status: 400 });
    }

    // Extract items from the enquiry data
    const items = enquiryData.items || [];
    if (items.length === 0) {
      return NextResponse.json({ error: "No items in enquiry" }, { status: 400 });
    }

    console.log('Original items before fix:', items.map(i => ({ 
      stockId: i.stockId, 
      stockHeaderId: i.stockHeaderId, 
      colour: i.colour, 
      size: i.size 
    })));

    // Repair stockId if any are wrong/missing
    const fixedItems = await ensureStockIds(items);

    // Update the enquiry data with fixed items
    enquiryData.items = fixedItems;

    console.log('Fixed items after repair:', fixedItems.map(i => ({ 
      stockId: i.stockId, 
      stockHeaderId: i.stockHeaderId, 
      colour: i.colour, 
      size: i.size 
    })));

    // Use the specific webhook URL for MerchLab enquiries
    const webhookUrl = "https://ai.intakt.co.za/webhook/merchlab-enquiries";
    
    // Prepare the payload with the fixed data
    const payload: WebhookPayload = {
      fullEnquiryJson: JSON.stringify(enquiryData),
      timestamp,
      merchant_order_no
    };

    console.log("Sending quote to webhook:", webhookUrl);
    console.log("SERVER OUTBOUND WEBHOOK BODY", JSON.stringify(payload, null, 2));
    
    // Additional webhook items log
    try {
      const enquiryData = JSON.parse(payload.fullEnquiryJson) as EnquiryData;
      console.log('SERVER WEBHOOK OUT', JSON.stringify(
        enquiryData.items?.map((i: IncomingItem) => ({
          sid: i.stockId, 
          sh: i.stockHeaderId, 
          c: i.colour, 
          s: i.size
        })), null, 2
      ));
    } catch {
      console.log('Could not parse webhook items for logging');
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { 
        "content-type": "application/json",
        "user-agent": "MerchLab-Quote-System/1.0"
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Webhook failed:", response.status, errorText);
      return NextResponse.json({ 
        error: "Webhook failed", 
        details: errorText,
        status: response.status 
      }, { status: 500 });
    }

    const responseData = await response.text();
    console.log("Webhook response:", responseData);
    
    return NextResponse.json({ 
      ok: true, 
      message: "Quote submitted successfully",
      merchant_order_no 
    });
  } catch (e: unknown) {
    console.error("Quote submission error:", e);
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ 
      error: errorMessage
    }, { status: 500 });
  }
}