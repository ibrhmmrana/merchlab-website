import { notFound } from "next/navigation";
import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import RefreshQuoteClient, {
  type QuoteDisplayData,
  type QuoteDisplayItem,
  type QuoteDisplayTotals,
  type QuoteDisplayCustomer,
  type QuoteDisplayAddress,
} from "./RefreshQuoteClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function roundRand(n: number): number {
  return Math.round(Number(n));
}

function parsePayload(payload: unknown): Record<string, unknown> | null {
  if (typeof payload === "string") {
    try {
      return JSON.parse(payload) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  if (payload && typeof payload === "object") return payload as Record<string, unknown>;
  return null;
}

function toDisplayItem(raw: Record<string, unknown>): QuoteDisplayItem {
  const branding = Array.isArray(raw.branding)
    ? (raw.branding as Record<string, unknown>[]).map((b) => ({
        brandingType: String(b.brandingType ?? b.branding_type ?? ""),
        brandingPosition: String(b.brandingPosition ?? b.branding_position ?? ""),
        brandingSize: String(b.brandingSize ?? b.branding_size ?? ""),
      }))
    : undefined;
  return {
    description: String(raw.description ?? ""),
    colour: String(raw.colour ?? ""),
    size: String(raw.size ?? ""),
    requested_qty: Number(raw.requested_qty ?? raw.quantity ?? 0) || 0,
    price: roundRand(Number(raw.price ?? 0)),
    line_total: roundRand(Number(raw.line_total ?? 0)),
    image_url: typeof raw.image_url === "string" ? raw.image_url : null,
    branding: branding?.length ? branding : undefined,
  };
}

function toDisplayTotals(totalsRaw: Record<string, unknown>, payload: Record<string, unknown>): QuoteDisplayTotals {
  const subtotal = roundRand(Number(totalsRaw.subtotal ?? 0));
  const delivery_fee = roundRand(Number(totalsRaw.delivery_fee ?? payload.delivery_fee ?? 0));
  const vat = roundRand(Number(totalsRaw.vat ?? 0));
  const grand_total = roundRand(Number(totalsRaw.grand_total ?? 0));
  return { subtotal, delivery_fee, vat, grand_total };
}

function toDisplayCustomer(raw: unknown): QuoteDisplayCustomer {
  if (!raw || typeof raw !== "object") {
    return { first_name: "", last_name: "", email: "", phone: "" };
  }
  const o = raw as Record<string, unknown>;
  return {
    first_name: String(o.first_name ?? o.firstName ?? ""),
    last_name: String(o.last_name ?? o.lastName ?? ""),
    email: String(o.email ?? ""),
    phone: String(o.phone ?? o.telephoneNumber ?? o.telephone ?? ""),
    company: o.company ? String(o.company) : undefined,
  };
}

function toDisplayAddress(raw: unknown): QuoteDisplayAddress {
  if (!raw || typeof raw !== "object") {
    return { street: "", suburb: "", city: "", province: "", postal_code: "", country: "" };
  }
  const o = raw as Record<string, unknown>;
  return {
    street: String(o.street ?? ""),
    suburb: String(o.suburb ?? ""),
    city: String(o.city ?? ""),
    province: String(o.province ?? ""),
    postal_code: String(o.postal_code ?? o.postalCode ?? ""),
    country: String(o.country ?? ""),
  };
}

export default async function RefreshQuotePage({
  params,
}: {
  params: Promise<{ quoteNo: string }>;
}) {
  const { quoteNo } = await params;
  if (!quoteNo?.trim()) notFound();

  const supabase = getSupabaseAdmin();
  const normalized = quoteNo.trim();
  const variations = [normalized, normalized.toUpperCase(), normalized.toLowerCase()];

  let payload: Record<string, unknown> | null = null;
  let quoteNoFromDb = normalized;
  for (const v of variations) {
    const { data, error } = await supabase
      .from("quote_docs")
      .select("quote_no, payload")
      .eq("quote_no", v)
      .maybeSingle();

    if (!error && data?.payload) {
      payload = parsePayload(data.payload);
      if (payload) {
        quoteNoFromDb = String(data.quote_no ?? v);
        break;
      }
    }
  }

  if (!payload) notFound();

  const itemsRaw = Array.isArray(payload.items) ? payload.items : [];
  const items: QuoteDisplayItem[] = itemsRaw.map((it) =>
    toDisplayItem(it && typeof it === "object" ? (it as Record<string, unknown>) : {})
  );

  const totalsRaw = payload.totals && typeof payload.totals === "object" ? (payload.totals as Record<string, unknown>) : {};
  const totals = toDisplayTotals(totalsRaw, payload);

  const customer = toDisplayCustomer(payload.customer ?? payload.enquiryCustomer);
  const shipping_address = toDisplayAddress(payload.shipping_address ?? payload.address);

  const displayData: QuoteDisplayData = {
    quoteNo: quoteNoFromDb,
    items,
    totals,
    customer,
    shipping_address,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link href="/" className="text-sm text-primary hover:underline">
            &larr; MerchLab
          </Link>
        </div>
      </div>
      <RefreshQuoteClient data={displayData} />
    </div>
  );
}
