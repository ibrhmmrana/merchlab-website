"use client";
import { useUiStore } from "@/store/ui";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCartStore, getCartItemKey, isBranded } from "@/store/cart";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import SmartImage from "@/components/SmartImage";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

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

  const subtotal = activeItems.reduce(
    (sum, i) => sum + (i.quantity * (i.discounted_price ?? i.base_price ?? 0)),
    0
  );
  const DELIVERY_THRESHOLD = 1000;
  const DELIVERY_FEE = 99;
  const VAT_RATE = 0.15;
  const delivery = subtotal > 0 && subtotal < DELIVERY_THRESHOLD ? DELIVERY_FEE : 0;
  const amountBeforeVat = subtotal + delivery;
  const vat = amountBeforeVat * VAT_RATE;
  const total = amountBeforeVat + vat;

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
                <span>R {subtotal.toFixed(2)}</span>
              </div>
              {delivery > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery (under R1,000)</span>
                  <span>R {delivery.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">VAT (15%)</span>
                <span>R {vat.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-1.5 border-t border-gray-200 font-semibold">
                <span>Total</span>
                <span>R {total.toFixed(2)}</span>
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