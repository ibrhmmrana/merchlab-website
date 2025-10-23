import { create } from "zustand";

type UiState = {
  cartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
};

export const useUiStore = create<UiState>((set, get) => ({
  cartOpen: false,
  openCart: () => set({ cartOpen: true }),
  closeCart: () => set({ cartOpen: false }),
  toggleCart: () => set({ cartOpen: !get().cartOpen }),
}));
