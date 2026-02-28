"use client";
import { useState, useEffect, useRef } from "react";
import { useUiStore } from "@/store/ui";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCartStore, getCartItemKey, isBranded } from "@/store/cart";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import SmartImage from "@/components/SmartImage";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import {
  brandedLinePricing,
  getMarginFactor,
  DELIVERY_THRESHOLD_BRANDED,
  DELIVERY_FEE_BRANDED,
  type BrandingPricingRow,
} from "@/lib/brandedPricing";

function Thumb({ src, alt }: { src: string | null | undefined; alt: string }) {
  return (
    <div className="relative w-14 h-14 rounded bg-gray-50 overflow-hidden">
      <SmartImage src={src || null} alt={alt} fill className="object-contain" sizes="56px" />
    </div>
  );
}

export default function CartDrawer() {
  const open = useUiStore((s) => s.cartOpen);
  const setOpen = (v: boolean) => (v ? useUiStore.getState().openCart() : useUiStore.getState().closeCart());
  const router = useRouter();

  const items = useCartStore((s) => s.items);
  const brandedItems = useCartStore((s) => s.brandedItems);
  const unbrandedItems = useCartStore((s) => s.unbrandedItems);
  const activeCartGroup = useCartStore((s) => s.activeCartGroup);
  const setActiveCartGroup = useCartStore((s) => s.setActiveCartGroup);
  const remove = useCartStore((s) => s.remove);
  const updateQty = useCartStore((s) => s.updateQty);

  const activeItems = activeCartGroup === 'branded' ? brandedItems : unbrandedItems;

  const [shopMarginPercent, setShopMarginPercent] = useState<number>(25);
  const [brandingPricing, setBrandingPricing] = useState<Map<number, BrandingPricingRow[]>>(new Map());
  const fetchedPricingRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    fetch("/api/settings/shop-price-margin")
      .then((r) => r.json())
      .then((data) => {
        const m = data?.margin;
        if (Number.isFinite(m) && m >= 0 && m < 100) setShopMarginPercent(Number(m));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (activeCartGroup !== "branded" || brandedItems.length === 0) return;
    const norm = (v: string | null | undefined) => String(v ?? "").trim().toLowerCase();
    const safeNumber = (v: unknown, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
    brandedItems.forEach((item) => {
      const stockHeaderId = item.stock_header_id;
      if (!stockHeaderId || fetchedPricingRef.current.has(stockHeaderId)) return;
      fetchedPricingRef.current.add(stockHeaderId);
      fetch(`/api/branding-pricing?stockHeaderId=${stockHeaderId}`)
        .then((r) => r.json())
        .then((data) => {
          if (!Array.isArray(data) || data.length === 0) return;
          const itemBranding = item.branding ?? [];
          const matchedPricing: BrandingPricingRow[] = itemBranding
            .map((b) => {
              let candidates = data.filter(
                (p: { BrandingType?: string; BrandingSize?: string; BrandingPosition?: string }) =>
                  norm(p.BrandingType) === norm(b.branding_type) &&
                  norm(p.BrandingSize) === norm(b.branding_size)
              );
              if (b.branding_position && candidates.length) {
                const withPos = candidates.filter(
                  (p: { BrandingPosition?: string }) =>
                    p && norm(p.BrandingPosition) === norm(b.branding_position)
                );
                if (withPos.length) candidates = withPos;
              }
              const pick = candidates[0] ?? data[0];
              if (!pick) return null;
              return {
                brandingType: String(pick.BrandingType ?? b.branding_type ?? ""),
                brandingPosition: String(pick.BrandingPosition ?? b.branding_position ?? ""),
                brandingSize: String(pick.BrandingSize ?? b.branding_size ?? ""),
                unitPrice: safeNumber(pick.DiscountedUnitPrice ?? pick.UnitPrice, 0),
                setupFee: safeNumber(pick.DiscountedSetupFee ?? pick.SetupFee, 0),
              };
            })
            .filter((x): x is BrandingPricingRow => x != null);
          if (matchedPricing.length > 0) {
            setBrandingPricing((prev) => {
              const next = new Map(prev);
              next.set(stockHeaderId, matchedPricing);
              return next;
            });
          }
        })
        .catch(() => fetchedPricingRef.current.delete(stockHeaderId));
    });
  }, [activeCartGroup, brandedItems]);

  const VAT_RATE = 0.15;
  let itemsSubtotalExVat: number;
  if (activeCartGroup === "branded") {
    itemsSubtotalExVat = activeItems.reduce((sum, item) => {
      const { lineTotalExVat } = brandedLinePricing(item, brandingPricing, shopMarginPercent);
      return sum + lineTotalExVat;
    }, 0);
  } else {
    const factor = getMarginFactor(shopMarginPercent);
    itemsSubtotalExVat = activeItems.reduce(
      (sum, i) => sum + (i.quantity * (i.discounted_price ?? i.base_price ?? 0)) * factor,
      0
    );
  }
  const itemsSubtotalIncVat = itemsSubtotalExVat * (1 + VAT_RATE);
  const hasChargeable = itemsSubtotalExVat > 0;
  const delivery =
    hasChargeable && itemsSubtotalIncVat < DELIVERY_THRESHOLD_BRANDED ? DELIVERY_FEE_BRANDED : 0;
  const subtotalExVat = itemsSubtotalExVat + delivery;
  const vat = subtotalExVat * VAT_RATE;
  const total = subtotalExVat + vat;
  const subtotal = itemsSubtotalExVat;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="w-[380px] sm:w-[420px] flex flex-col p-0">
        <SheetHeader className="flex-shrink-0 px-6 py-4">
          <SheetTitle>My Cart</SheetTitle>
        </SheetHeader>

        {/* Tabs */}
        {items.length > 0 && (
          <div className="flex-shrink-0 px-6 pb-3">
            <ToggleGroup
              type="single"
              value={activeCartGroup}
              onValueChange={(v) => {
                if (v === 'branded' || v === 'unbranded') {
                  setActiveCartGroup(v);
                }
              }}
              className="w-full"
            >
              <ToggleGroupItem
                value="branded"
                className={cn(
                  "flex-1 px-3 py-2 text-xs font-semibold",
                  activeCartGroup === "branded" && "bg-primary text-white"
                )}
              >
                Branded ({brandedItems.length})
              </ToggleGroupItem>
              <ToggleGroupItem
                value="unbranded"
                className={cn(
                  "flex-1 px-3 py-2 text-xs font-semibold",
                  activeCartGroup === "unbranded" && "bg-primary text-white"
                )}
              >
                Unbranded ({unbrandedItems.length})
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        )}

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto px-6 space-y-3">
          {items.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4">Your cart is empty.</div>
          ) : activeItems.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4">
              No {activeCartGroup === 'branded' ? 'branded' : 'unbranded'} items in your cart.
            </div>
          ) : (
            activeItems.map((i) => {
              const itemKey = getCartItemKey(i);
              return (
                <div key={itemKey} className="flex items-center gap-3 border rounded p-3">
                  <Thumb src={i.image_url} alt={i.description || i.stock_code} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{i.description || i.stock_code}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {i.brand || "Barron"} • {i.colour} • {i.size}
                    </div>
                    {isBranded(i) && i.branding?.length ? (
                      <div className="mt-1.5 space-y-0.5">
                        <div className="text-[10px] font-medium text-primary">Branded</div>
                        {i.branding.map((b, idx) => (
                          <div key={idx} className="text-[10px] text-muted-foreground">
                            Position: {b.branding_position} • Size: {b.branding_size} • Type: {b.branding_type} • Colours: {b.color_count}
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        className="h-6 w-6 rounded border text-sm hover:bg-gray-50"
                        onClick={() => updateQty(itemKey, Math.max(1, i.quantity - 1))}
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={i.quantity}
                        onChange={(e) => {
                          const newQty = parseInt(e.target.value) || 1;
                          updateQty(itemKey, Math.max(1, newQty));
                        }}
                        className="text-sm w-12 text-center border rounded px-1 py-0.5"
                        aria-label="Quantity"
                      />
                      <button
                        className="h-6 w-6 rounded border text-sm hover:bg-gray-50"
                        onClick={() => updateQty(itemKey, i.quantity + 1)}
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                      <button className="ml-2 text-xs underline hover:text-gray-600" onClick={() => remove(itemKey)}>
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Fixed bottom section */}
        <div className="flex-shrink-0 px-6 py-4 border-t bg-gray-50 space-y-3">
          {activeItems.length > 0 && (
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>R {Math.round(subtotal)}</span>
              </div>
              {delivery > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery (under R1,000)</span>
                  <span>R {Math.round(delivery)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">VAT (15%)</span>
                <span>R {Math.round(vat)}</span>
              </div>
              <div className="flex justify-between items-center pt-1.5 border-t border-gray-200 font-semibold">
                <span>Total</span>
                <span>R {Math.round(total)}</span>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setOpen(false)} className="luxury-btn-secondary text-sm">
              Continue shopping
            </button>
            <button
              onClick={() => {
                setOpen(false);
                router.push("/cart");
              }}
              className="luxury-btn text-sm"
            >
              View Cart
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}