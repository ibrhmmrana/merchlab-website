"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Variant } from "@/lib/data/types";

export type CartItem = Variant & { quantity: number };

// Helper function to create a unique key for cart items
export function getCartItemKey(item: Variant): string {
  return `${item.stock_id}-${item.colour || 'default'}-${item.size || 'default'}`;
}

type State = {
  items: CartItem[];
  add: (v: Variant & { quantity?: number }) => void;
  updateQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  _hasHydrated?: boolean; // for UI guards
};

export const useCartStore = create<State>()(
  persist(
    (set, get) => ({
      items: [],
      add: (v) =>
        set((s) => {
          const q = v.quantity ?? 1;
          const itemKey = getCartItemKey(v);
          const idx = s.items.findIndex((i) => getCartItemKey(i) === itemKey);
          
          // Dev guard: Check for bad variant IDs
          if (process.env.NODE_ENV === 'development') {
            if (!v.stock_id || v.stock_id === v.stock_header_id) {
              console.warn('Bad variant ids detected:', {
                stock_id: v.stock_id,
                stock_header_id: v.stock_header_id,
                colour: v.colour,
                size: v.size,
                description: v.description
              });
            }
          }
          
          if (idx >= 0) {
            const copy = [...s.items];
            copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + q };
            return { items: copy };
          }
          return { items: [...s.items, { ...v, quantity: q }] };
        }),
      updateQty: (key, qty) =>
        set((s) => ({ items: s.items.map((i) => (getCartItemKey(i) === key ? { ...i, quantity: qty } : i)) })),
      remove: (key) => set((s) => ({ items: s.items.filter((i) => getCartItemKey(i) !== key) })),
      clear: () => set({ items: [] }),
      _hasHydrated: false,
    }),
    {
      name: "merchlab-cart",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) state._hasHydrated = true;
      },
      partialize: (s) => ({ items: s.items }), // only persist items
    }
  )
);