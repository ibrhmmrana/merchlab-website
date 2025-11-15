"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Variant } from "@/lib/data/types";
import type { BrandingMode } from "@/app/branding/types";
import type { BrandingSelection } from "@/types/branding";

export type CartItem = Variant & { 
  quantity: number;
  brandingMode?: BrandingMode;
  branding?: BrandingSelection[];
};

// Helper function to create a unique key for cart items
// Includes branding info so different branding choices create different cart items
export function getCartItemKey(item: Variant & { brandingMode?: BrandingMode; branding?: BrandingSelection[] }): string {
  const baseKey = `${item.stock_id}-${item.colour || 'default'}-${item.size || 'default'}`;
  if (item.brandingMode) {
    const brandingKey = item.brandingMode === 'branded' && item.branding?.length
      ? `|b:${JSON.stringify(item.branding)}`
      : `|${item.brandingMode}`;
    return baseKey + brandingKey;
  }
  return baseKey;
}

// Helper to check if an item is branded
export function isBranded(item: CartItem): boolean {
  return Boolean(item.brandingMode === 'branded' && item.branding && item.branding.length > 0);
}

type State = {
  items: CartItem[];
  activeCartGroup: 'branded' | 'unbranded';
  add: (v: Variant & { 
    quantity?: number;
    brandingMode?: BrandingMode;
    branding?: BrandingSelection[];
  }) => void;
  updateQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  setActiveCartGroup: (group: 'branded' | 'unbranded') => void;
  // Derived selectors
  brandedItems: CartItem[];
  unbrandedItems: CartItem[];
  _hasHydrated?: boolean; // for UI guards
};

export const useCartStore = create<State>()(
  persist(
    (set, get) => {
      // Helper to compute derived state
      const computeDerived = (items: CartItem[], activeGroup?: 'branded' | 'unbranded') => {
        const branded = items.filter(isBranded);
        const unbranded = items.filter((i) => !isBranded(i));
        
        // Auto-select active group if not set or if current group is empty
        let active = activeGroup || get().activeCartGroup || 'branded';
        if (active === 'branded' && branded.length === 0 && unbranded.length > 0) {
          active = 'unbranded';
        } else if (active === 'unbranded' && unbranded.length === 0 && branded.length > 0) {
          active = 'branded';
        }
        
        return { branded, unbranded, active };
      };

      return {
        items: [],
        activeCartGroup: 'branded',
        brandedItems: [],
        unbrandedItems: [],
        add: (v) =>
          set((s) => {
            const q = v.quantity ?? 1;
            const { brandingMode, branding, ...variantData } = v;
            const itemKey = getCartItemKey({ ...variantData, brandingMode, branding });
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
            
            let newItems: CartItem[];
            if (idx >= 0) {
              const copy = [...s.items];
              copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + q };
              newItems = copy;
            } else {
              newItems = [...s.items, { 
                ...variantData, 
                quantity: q,
                brandingMode,
                branding 
              }];
            }
            
            const derived = computeDerived(newItems, s.activeCartGroup);
            return { 
              items: newItems,
              brandedItems: derived.branded,
              unbrandedItems: derived.unbranded,
              activeCartGroup: derived.active
            };
          }),
        updateQty: (key, qty) =>
          set((s) => {
            const newItems = s.items.map((i) => (getCartItemKey(i) === key ? { ...i, quantity: qty } : i));
            const derived = computeDerived(newItems, s.activeCartGroup);
            return { 
              items: newItems,
              brandedItems: derived.branded,
              unbrandedItems: derived.unbranded,
              activeCartGroup: derived.active
            };
          }),
        remove: (key) => 
          set((s) => {
            const newItems = s.items.filter((i) => (getCartItemKey(i) !== key));
            const derived = computeDerived(newItems, s.activeCartGroup);
            return { 
              items: newItems,
              brandedItems: derived.branded,
              unbrandedItems: derived.unbranded,
              activeCartGroup: derived.active
            };
          }),
        clear: () => set({ 
          items: [], 
          brandedItems: [], 
          unbrandedItems: [], 
          activeCartGroup: 'branded' 
        }),
        setActiveCartGroup: (group) => 
          set((s) => {
            const derived = computeDerived(s.items, group);
            return { 
              activeCartGroup: derived.active,
              brandedItems: derived.branded,
              unbrandedItems: derived.unbranded
            };
          }),
        _hasHydrated: false,
      };
    },
    {
      name: "merchlab-cart",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state._hasHydrated = true;
          // Recompute derived state on hydration
          const branded = state.items.filter(isBranded);
          const unbranded = state.items.filter((i) => !isBranded(i));
          let active = state.activeCartGroup || 'branded';
          if (active === 'branded' && branded.length === 0 && unbranded.length > 0) {
            active = 'unbranded';
          } else if (active === 'unbranded' && unbranded.length === 0 && branded.length > 0) {
            active = 'branded';
          }
          state.brandedItems = branded;
          state.unbrandedItems = unbranded;
          state.activeCartGroup = active;
        }
      },
      partialize: (s) => ({ items: s.items, activeCartGroup: s.activeCartGroup }), // persist items and active group
    }
  )
);
