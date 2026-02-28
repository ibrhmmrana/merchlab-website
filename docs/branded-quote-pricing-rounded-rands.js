// Pricing with MULTIPLE branding rows per item (reads customer/address from "Code in JavaScript2")
// - FIXED TARGET MARGIN: 25% margin regardless of basket size
// - Margin applies to (product + SUM(branding unit) + SUM(branding setup))  [all ex-VAT]
// - VAT 15% calculated like the sample doc: VAT is computed on the FINAL ex-VAT subtotal (items + delivery), then added once
// - Line totals are EX-VAT (after margin). We do NOT add VAT per line anymore.
// - If qty_available == 0 or effective qty==0: zero the whole line
// - Delivery: only if any chargeable line; (items subtotal incl. VAT) >= 1000 => 0, else 99
// - Delivery is treated as EX-VAT and included in VAT base (like the sample doc)
// - Cap requested quantity to available quantity
// - branding[].logoFile is a STRING from the corresponding item in "separate items1"
// - All amounts rounded to the nearest rand (like shop page)

const VAT_RATE = 0.15;

/* ---------------- helpers ---------------- */
const toNum = (v) => {
  if (v === null || v === undefined || v === '') return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const toCents   = (n) => Math.round(Number(n) * 100);
const fromCents = (c) => Number((c / 100).toFixed(2));
// Round cents to nearest rand (whole number) — like shop page
const toNearestRand = (cents) => Math.round(cents / 100);

const clean = (v) => {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string') {
    const t = v.trim();
    if (!t) return null;
    if (t.toLowerCase() === 'null' || t.toLowerCase() === 'undefined') return null;
    return v;
  }
  return v;
};

// If array → first element as string, else return meaningful string or null
const firstString = (v) => {
  if (Array.isArray(v)) return v.length ? String(v[0]).trim() || null : null;
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s : null;
};

// Derive a loose "identity" for an item so we can match across nodes if counts/order differ
const itemKey = (j = {}) => {
  const sid  = j.stock_id ?? j.stockId ?? '';
  const shid = j.stock_header_id ?? j.stockHeaderId ?? '';
  const code = j.itemNumber ?? j.item_code ?? '';
  const col  = j.colour ?? j.color ?? '';
  const size = j.size ?? '';
  return [sid, shid, code, col, size].filter(Boolean).join('|').toLowerCase();
};

// Extract a per-item logo from a JSON blob with multiple possible shapes
const extractItemLogo = (j = {}) =>
  firstString(
    j.logoFile
    ?? j.branding_items?.[0]?.logoFile
    ?? j.brandingItems?.[0]?.logoFile
    ?? j.branding?.[0]?.logoFile
  );

/* ---------------- pull inputs ---------------- */
const launch = $('Code in JavaScript2').first()?.json ?? {};
const launchBody = Array.isArray(launch) ? (launch[0] ?? {}) : launch;
const body = (launchBody && typeof launchBody.body === 'object') ? launchBody.body : launchBody;

const inputItems = $input.all();                        // items we are pricing
const sepItems   = $items('separate items1') ?? [];     // parallel items with logos

// Build per-index logo list from "separate items1"
const logosByIndex = sepItems.map(it => extractItemLogo(it.json));

// Build a key→logo map in case the order/count differ
const logosByKey = {};
for (const it of sepItems) {
  const k = itemKey(it.json);
  const logo = extractItemLogo(it.json);
  if (k && logo && !logosByKey[k]) logosByKey[k] = logo;
}

// Global fallback (first non-empty from separate items)
const globalLogoDefault = logosByIndex.find(Boolean) ?? null;

/* ---------------- normalizers ---------------- */
const normalizeBranding = (b = {}, defaultLogo = null) => ({
  brandingType:     clean(b.brandingType),
  brandingPosition: clean(b.brandingPosition),
  brandingSize:     clean(b.brandingSize),
  colourCount:      toNum(b.colourCount),
  unitPrice:        toNum(b.unitPrice),  // per-unit, ex-VAT, pre-margin
  setupFee:         toNum(b.setupFee),   // once per line, ex-VAT, pre-margin
  // Use the branding row's own logo (if any), else per-item default, else global
  logoFile:         clean(firstString(b.logoFile) ?? defaultLogo ?? globalLogoDefault),
});

const normalizeItem = (o = {}, defaultLogo = null) => ({
  ...o,
  price:         o.price !== undefined ? toNum(o.price) : (o.unit_price !== undefined ? toNum(o.unit_price) : toNum(o.price)),
  qty_available: toNum(o.qty_available),
  requested_qty: toNum(o.requested_qty ?? o.quantity ?? o.qty ?? 0),
  branding: Array.isArray(o.branding)
    ? o.branding.map(b => normalizeBranding(b, defaultLogo))
    : [],
});

/* ---------------- customer/address ---------------- */
const customer = {
  first_name: clean(body?.customer?.first_name ?? body?.firstName),
  last_name:  clean(body?.customer?.last_name  ?? body?.lastName),
  company:    clean(body?.customer?.company    ?? body?.company),
  email:      clean(body?.customer?.email      ?? body?.email),
  phone:      clean(body?.customer?.phone      ?? body?.telephoneNumber),
};

const a = body?.shipping_address ?? body?.address ?? {};
const shipping_address = {
  street:      clean(a.street),
  suburb:      clean(a.suburb),
  city:        clean(a.city),
  province:    clean(a.province),
  postal_code: clean(a.postal_code ?? a.postalCode),
  country:     clean(a.country),
};

/* ---------------- 1) Input items + attach per-item logo ---------------- */
const rawItems = inputItems.map((i, idx) => {
  // Prefer same-index logo from "separate items1"
  let defaultLogo = logosByIndex[idx] ?? null;

  // If missing, try match by composite key
  if (!defaultLogo) {
    const k = itemKey(i.json);
    if (k && logosByKey[k]) defaultLogo = logosByKey[k];
  }

  // If still missing, use global fallback
  if (!defaultLogo) defaultLogo = globalLogoDefault;

  return normalizeItem(i.json, defaultLogo);
});

/* ---------------- 2) base_subtotal (pre-margin basket incl. branding; ignore OOS) ---------------- */
let basketPreMarginCents = 0;
for (const it of rawItems) {
  const available = toNum(it.qty_available);
  const requested = toNum(it.requested_qty);
  const qty = Math.min(requested, available);
  if (available === 0 || qty <= 0) continue;

  const baseProduct = toNum(it.price);
  const bUnits = (it.branding || []).reduce((s, b) => s + toNum(b.unitPrice), 0);
  const bSetup = (it.branding || []).reduce((s, b) => s + toNum(b.setupFee), 0);

  const exact = (baseProduct * qty) + (bUnits * qty) + bSetup;
  basketPreMarginCents += toCents(exact);
}
const basketPreMargin = toNearestRand(basketPreMarginCents); // nearest rand

/* ---------------- 3) Fixed target margin (ALWAYS) ---------------- */
const marginRate = 0.25;                 // ALWAYS 25% margin
const factor = 1 / (1 - marginRate);     // 1.333333...
const markupRateEquivalent = factor - 1; // 0.333333...

/* ---------------- 4) Per-item pricing (margin-based; EX-VAT lines; round to nearest rand) ---------------- */
const items = rawItems.map(it => {
  const availableQty = toNum(it.qty_available);
  const requestedQty = toNum(it.requested_qty);
  const qty = Math.min(requestedQty, availableQty);

  const baseProduct = toNum(it.price); // ex-VAT
  const bUnits  = (it.branding || []).reduce((s, b) => s + toNum(b.unitPrice), 0);
  const bSetup  = (it.branding || []).reduce((s, b) => s + toNum(b.setupFee), 0);

  const { qty: _q, quantity, unit_price, ...rest } = it;

  if (availableQty === 0 || qty <= 0) {
    return {
      ...rest,
      requested_qty: qty,
      base_price: toNearestRand(toCents(baseProduct)),
      price: 0,           // unit after margin (ex-VAT)
      beforeVAT: 0,       // kept for compatibility (now equals line_total)
      vat: 0,             // VAT is handled at totals level now
      line_total: 0,      // EX-VAT line total
      out_of_stock: true,
    };
  }

  // Bundle cost ex-VAT, pre-margin
  const bundle_cost_exact =
    (baseProduct * qty) +
    (bUnits * qty) +
    (bSetup);

  // Apply target margin via factor: sell_exVAT = cost_exVAT * factor
  const line_exVAT_exact = bundle_cost_exact * factor;

  // Round line to nearest rand (whole number)
  const line_exVAT_cents = toCents(line_exVAT_exact);
  const line_exVAT_rands = toNearestRand(line_exVAT_cents);

  // Per-unit ex-VAT after margin (derived from rounded line total)
  const unit_after_margin_rands = qty > 0 ? Math.round(line_exVAT_rands / qty) : 0;

  return {
    ...rest,
    requested_qty: qty,
    base_price: toNearestRand(toCents(baseProduct)),
    price: unit_after_margin_rands,       // unit after margin (ex-VAT), nearest rand
    beforeVAT: line_exVAT_rands,         // compatibility, nearest rand
    vat:        0,                        // VAT moved to totals
    line_total: line_exVAT_rands,        // EX-VAT line total, nearest rand
  };
});

/* ---------------- 5) Totals & delivery (VAT like sample doc; all nearest rand) ---------------- */
// Items subtotal EX-VAT (sum of rounded line totals)
const items_subtotal_exVAT_rands = items.reduce((s, it) => s + toNum(it.line_total), 0);

// Delivery rule uses ITEMS subtotal INCL VAT (but excludes delivery), like your original rule wording.
const hasChargeable = items.some(it => toNum(it.line_total) > 0);
const items_vat_rands = Math.round(items_subtotal_exVAT_rands * VAT_RATE);
const items_subtotal_inclVAT_rands = items_subtotal_exVAT_rands + items_vat_rands;

const delivery_fee_rands = hasChargeable
  ? (items_subtotal_inclVAT_rands >= 1000 ? 0 : 99)
  : 0;

// Subtotal EX-VAT shown on doc (items + delivery), like the sample doc
const subtotal_exVAT_rands = items_subtotal_exVAT_rands + delivery_fee_rands;

// VAT computed once on the subtotal EX-VAT (items + delivery)
const vat_total_rands = Math.round(subtotal_exVAT_rands * VAT_RATE);

// Grand total incl VAT
const grand_total_rands = subtotal_exVAT_rands + vat_total_rands;

/* ---------------- 6) Output ---------------- */
return [
  {
    json: {
      customer,
      shipping_address,
      items, // branding[] rows include { logoFile: "https://..." } from 'separate items1'
      margin_rate: marginRate,               // 0.25 target margin
      markup_rate: markupRateEquivalent,     // 0.333333... equivalent markup-on-cost
      delivery_fee: delivery_fee_rands,      // EX-VAT, nearest rand
      totals: {
        subtotal: subtotal_exVAT_rands,      // EX-VAT subtotal (items + delivery), nearest rand
        vat: vat_total_rands,                // VAT on subtotal, nearest rand
        grand_total: grand_total_rands,      // INCL VAT, nearest rand
        base_subtotal: basketPreMargin,      // pre-margin basket incl. branding (capped qty), nearest rand
      },
    },
  },
];
