"use client";
import { useUiStore } from "@/store/ui";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCartStore, getCartItemKey } from "@/store/cart";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import SmartImage from "@/components/SmartImage";

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
  const remove = useCartStore((s) => s.remove);
  const updateQty = useCartStore((s) => s.updateQty);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="w-[380px] sm:w-[420px] flex flex-col p-0">
        <SheetHeader className="flex-shrink-0 px-6 py-4">
          <SheetTitle>My Cart</SheetTitle>
        </SheetHeader>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto px-6 space-y-3">
          {items.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4">Your cart is empty.</div>
          ) : (
            items.map((i) => {
              const itemKey = getCartItemKey(i);
              return (
                <div key={itemKey} className="flex items-center gap-3 border rounded p-3">
                  <Thumb src={i.image_url} alt={i.description || i.stock_code} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{i.description || i.stock_code}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {i.brand || "Barron"} • {i.colour} • {i.size}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        className="h-6 w-6 rounded border text-sm hover:bg-gray-50"
                        onClick={() => updateQty(itemKey, Math.max(1, i.quantity - 1))}
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span className="text-sm w-5 text-center">{i.quantity}</span>
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
        <div className="flex-shrink-0 px-6 py-4 border-t bg-gray-50">
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