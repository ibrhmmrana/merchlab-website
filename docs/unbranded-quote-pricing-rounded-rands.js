// Margin (UNBRANDED) — fixed 25% margin on cost (ex-VAT) for all basket sizes
// Matches the FIRST flow:
// - Lines are EX-VAT (no per-line VAT)
// - VAT is ONE total at the end (on subtotal EX-VAT incl delivery)
// - Delivery threshold uses ITEMS subtotal incl VAT (excluding delivery)
// - All amounts rounded to the nearest rand (like shop page)

const VAT_RATE = 0.15;

// ---------- margin config ----------
const TARGET_MARGIN = 0.25;                    // 25% margin target
const MARGIN_FACTOR = 1 / (1 - TARGET_MARGIN); // 1.333333...

// ---------- helpers ----------
const toNum = (v) => {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const toCents = (n) => Math.round(Number(n) * 100);
const fromCents = (c) => Number((c / 100).toFixed(2));
// Round cents to nearest rand (whole number) — like shop page
const toNearestRand = (cents) => Math.round(cents / 100);
const s = (v) => {
  if (v === null || v === undefined) return null;
  const t = String(v).trim();
  return t && t.toLowerCase() !== "null" && t.toLowerCase() !== "undefined" ? t : null;
};

const normalize = (o = {}) => ({
  ...o,
  price: o.price !== undefined ? toNum(o.price) : (o.unit_price !== undefined ? toNum(o.unit_price) : toNum(o.price)),
  qty_available: toNum(o.qty_available),
  requested_qty: toNum(o.requested_qty ?? o.quantity ?? o.qty ?? 0),
});

// ---------- 0) Get Organize payload ----------
const org = $("Organize").first()?.json ?? {};
const body = org && typeof org.body === "object" ? org.body : org;

// ---------- 1) Customer + shipping address ----------
const customer = {
  first_name: s(body?.customer?.first_name),
  last_name: s(body?.customer?.last_name),
  company: s(body?.customer?.company),
  email: s(body?.customer?.email),
  phone: s(body?.customer?.phone),
};

const shipping_address = {
  street: s(body?.shipping_address?.street),
  suburb: s(body?.shipping_address?.suburb),
  city: s(body?.shipping_address?.city),
  province: s(body?.shipping_address?.province),
  postal_code: s(body?.shipping_address?.postal_code),
  country: s(body?.shipping_address?.country),
};

// ---------- 2) Items: prefer node input; else Organize.items/line_items ----------
const inputItems = $input.all();
const rawItems = inputItems.length
  ? inputItems.map((i) => normalize(i.json))
  : (Array.isArray(body?.items)
      ? body.items
      : Array.isArray(body?.line_items)
        ? body.line_items
        : []
    ).map(normalize);

// ---------- 3) Pre-margin basket (for reference/analytics only): COST ex-VAT using effective qty ----------
let baseSubtotalCents = 0;
for (const it of rawItems) {
  const available = toNum(it.qty_available);
  const requested = toNum(it.requested_qty);
  const qty = Math.min(requested, available);

  if (available === 0 || qty <= 0) continue;
  const unitCost = toNum(it.price); // cost per unit ex-VAT
  baseSubtotalCents += toCents(unitCost * qty);
}
const baseSubtotal = toNearestRand(baseSubtotalCents); // nearest rand

// ---------- 4) Fixed 25% margin ----------
const marginRate = TARGET_MARGIN; // 0.25
const markupRateEquivalent = MARGIN_FACTOR - 1; // 0.333333...

// ---------- 5) Price each line (EX-VAT lines; round to nearest rand at line) ----------
const items = rawItems.map((it) => {
  const availableQty = toNum(it.qty_available);
  const requestedQty = toNum(it.requested_qty);
  const qty = Math.min(requestedQty, availableQty); // CAP HERE

  const basePrice = toNum(it.price); // cost per unit ex-VAT

  // Keep only requested_qty (drop qty/quantity/unit_price)
  const { qty: _q, quantity, unit_price, ...rest } = it;

  // OOS or zero effective qty → zero the line
  if (availableQty === 0 || qty <= 0) {
    return {
      ...rest,
      requested_qty: qty,
      base_price: toNearestRand(toCents(basePrice)), // cost ex-VAT, nearest rand
      price: 0,          // unit sell ex-VAT after margin
      beforeVAT: 0,      // EX-VAT line after margin
      vat: 0,            // VAT is totals-level now
      line_total: 0,     // EX-VAT line total
      out_of_stock: true,
    };
  }

  // EX-VAT line after margin (in cents)
  const beforeVAT_exact = basePrice * qty * MARGIN_FACTOR;
  const beforeVAT_cents = toCents(beforeVAT_exact);

  // Round line total to nearest rand; unit price = line total / qty, then round to nearest rand
  const beforeVAT_rands = toNearestRand(beforeVAT_cents);
  const unit_after_margin_rands = qty > 0 ? Math.round(beforeVAT_rands / qty) : toNearestRand(toCents(basePrice * MARGIN_FACTOR));

  return {
    ...rest,
    requested_qty: qty,
    base_price: toNearestRand(toCents(basePrice)),   // cost ex-VAT, nearest rand
    price: unit_after_margin_rands,                 // sell ex-VAT per unit after margin, nearest rand
    beforeVAT: beforeVAT_rands,                     // ex-VAT line after margin, nearest rand
    vat: 0,                                         // totals-level VAT only
    line_total: beforeVAT_rands,                    // ex-VAT "Amount", nearest rand
  };
});

// ---------- 6) Totals & delivery (VAT like first flow: one VAT total at the end; all rounded to nearest rand) ----------
const items_subtotal_exVAT_rands = items.reduce((sum, it) => sum + toNum(it.beforeVAT), 0);

// Delivery threshold based on ITEMS subtotal incl VAT (excluding delivery), like first flow
const items_vat_rands = Math.round(items_subtotal_exVAT_rands * VAT_RATE);
const items_subtotal_incVAT_rands = items_subtotal_exVAT_rands + items_vat_rands;

const hasChargeable = items_subtotal_exVAT_rands > 0;
const delivery_exVAT_rands = hasChargeable
  ? (items_subtotal_incVAT_rands >= 1000 ? 0 : 99)
  : 0;

// "Their way": subtotal EX-VAT includes delivery; VAT calculated once on that subtotal; all in whole rands
const subtotal_exVAT_rands = items_subtotal_exVAT_rands + delivery_exVAT_rands;
const vat_total_rands = Math.round(subtotal_exVAT_rands * VAT_RATE);
const grand_total_rands = subtotal_exVAT_rands + vat_total_rands;

// ---------- 7) Output ----------
return [
  {
    json: {
      customer,
      shipping_address,
      items,
      margin_rate: marginRate,
      markup_rate: markupRateEquivalent,
      delivery_fee: delivery_exVAT_rands,           // EX-VAT, nearest rand (VAT is in totals.vat)
      totals: {
        subtotal: subtotal_exVAT_rands,             // EX-VAT subtotal (includes delivery), nearest rand
        vat: vat_total_rands,                       // VAT total on subtotal, nearest rand
        grand_total: grand_total_rands,             // VAT-inclusive grand total, nearest rand
        base_subtotal: baseSubtotal,                // pre-margin COST basket (EX-VAT) using capped qtys, nearest rand
      },
    },
  },
];
