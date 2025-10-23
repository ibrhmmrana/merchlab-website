import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    let rpcOk: Record<string, any> = {};

    const supabase = createServerClient();

    // Try small, safe RPC calls:
    const facets = await supabase.rpc("get_catalog_facets");
    rpcOk.get_catalog_facets = facets.error
      ? { ok: false, error: facets.error.message }
      : { ok: true, sample: Object.keys((Array.isArray(facets.data)?facets.data[0]:facets.data) || {}).slice(0,5) };

    const groups = await supabase.rpc("search_products_grouped", {
      p_query: null,
      p_categories: null,
      p_types: null,
      p_brands: null,
      p_colours: null,
      p_sizes: null,
      p_genders: null,
      p_garment_types: null,
      p_stock_min: 0,
      p_page: 1,
      p_page_size: 4
    });
    rpcOk.search_products_grouped = groups.error
      ? { ok: false, error: groups.error.message }
      : { ok: true, count: (groups.data || []).length };

    return NextResponse.json({
      env_seen: {
        NEXT_PUBLIC_SUPABASE_URL: url || "(missing)",
        NEXT_PUBLIC_SUPABASE_ANON_KEY_present: hasKey,
        MERCHLAB_QUOTE_WEBHOOK: process.env.MERCHLAB_QUOTE_WEBHOOK || "(missing)"
      },
      rpc: rpcOk
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
