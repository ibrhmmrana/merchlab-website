/**
 * Branded/unbranded quote pricing: target margin on cost (from settings), ex-VAT.
 * - Bundle cost ex-VAT = (product × qty) + (Σ branding unitPrice × qty) + (Σ branding setupFee) [branded]
 * - Sell ex-VAT = cost × 1/(1 - margin) — margin from settings (e.g. 25% → factor 1.333...)
 * - VAT and delivery applied at totals level.
 */

export const VAT_RATE_BRANDED = 0.15;
export const TARGET_MARGIN_BRANDED = 0.25; // fallback when settings margin not loaded
export const MARGIN_FACTOR_BRANDED = 1 / (1 - TARGET_MARGIN_BRANDED);
export const DELIVERY_THRESHOLD_BRANDED = 1000;
export const DELIVERY_FEE_BRANDED = 99;

/** Margin % (0–100) → factor for sell_exVAT = cost_exVAT * factor */
export function getMarginFactor(marginPercent: number): number {
  const m = marginPercent / 100;
  if (m >= 1 || !Number.isFinite(m)) return 1;
  return 1 / (1 - m);
}

export type BrandingPricingRow = {
  unitPrice: number;
  setupFee: number;
  brandingType: string;
  brandingSize: string;
  brandingPosition: string;
};

export type ItemForBrandedPricing = {
  stock_header_id: number;
  quantity: number;
  discounted_price?: number | null;
  base_price?: number | null;
  branding?: Array<{
    branding_type: string;
    branding_size: string;
    branding_position?: string | null;
  }>;
};

/**
 * @param marginPercent Margin from settings (0–100). If not provided or invalid, uses TARGET_MARGIN_BRANDED (25).
 */
export function brandedLinePricing(
  item: ItemForBrandedPricing,
  brandingPricing: Map<number, BrandingPricingRow[]>,
  marginPercent?: number
): { bundleCostExVat: number; beforeVat: number; lineTotalExVat: number; unitPriceExVat: number } {
  const factor =
    marginPercent != null && Number.isFinite(marginPercent) && marginPercent >= 0 && marginPercent < 100
      ? getMarginFactor(marginPercent)
      : MARGIN_FACTOR_BRANDED;

  const baseProduct = item.discounted_price ?? item.base_price ?? 0;
  const qty = Math.max(0, item.quantity);
  const itemPricing = brandingPricing.get(item.stock_header_id) ?? [];
  const norm = (v: string | null | undefined) => String(v ?? "").trim().toLowerCase();

  let bUnits = 0;
  let bSetup = 0;
  if (item.branding?.length) {
    item.branding.forEach((b) => {
      const match = itemPricing.find(
        (p) =>
          norm(p.brandingType) === norm(b.branding_type) &&
          norm(p.brandingSize) === norm(b.branding_size) &&
          (!b.branding_position || norm(p.brandingPosition) === norm(b.branding_position))
      );
      if (match) {
        bUnits += match.unitPrice;
        bSetup += match.setupFee;
      }
    });
  }

  const bundleCostExVat = baseProduct * qty + bUnits * qty + bSetup;
  const beforeVatExact = bundleCostExVat * factor;
  const lineTotalExVat = Math.round(beforeVatExact * 100) / 100;
  const unitPriceExVat = qty > 0 ? Math.round((lineTotalExVat / qty) * 100) / 100 : 0;
  return { bundleCostExVat, beforeVat: lineTotalExVat, lineTotalExVat, unitPriceExVat };
}
