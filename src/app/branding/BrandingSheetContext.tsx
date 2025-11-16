"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import type { BrandingCompletePayload } from "./types";

const BrandingSheet = dynamic(() => import("./BrandingSheet"), { ssr: false });

export type BrandingOpenPayload = {
  productId: string;
  productName: string;
  stockHeaderId: number;
  // include whatever you already have for variant/colour/size on your card
  variantId?: string;
  colour?: string;
  size?: string;
  quantity?: number;
  // the key you use to identify a cart line; we can set or compute later
  itemKey?: string;
};

type NormalizedBrandingResult = {
  stockHeaderId: number;
  selections: Array<{ position: string; type: string; size: string; colorCount: number; comment?: string; artwork_url?: string }>;
};

type BrandingResult = NormalizedBrandingResult | null;

type Ctx = {
  openBranding: (p: BrandingOpenPayload) => Promise<BrandingResult>;
};

const BrandingCtx = createContext<Ctx | null>(null);

export function useBrandingSheet() {
  const ctx = useContext(BrandingCtx);
  if (!ctx) throw new Error("useBrandingSheet must be used inside <BrandingSheetProvider>");
  return ctx;
}

export function BrandingSheetProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<BrandingOpenPayload | null>(null);
  const [resolver, setResolver] = useState<((v: BrandingResult) => void) | null>(null);

  const openBranding = useCallback((p: BrandingOpenPayload) => {
    // Guard: log if stock_header_id looks suspicious
    if (p.stockHeaderId < 1000) {
      console.warn('BrandingSheetProvider: stockHeaderId seems too small:', p.stockHeaderId);
    }
    setPending(p);
    return new Promise<BrandingResult>((resolve) => {
      setResolver(() => resolve);
    });
  }, []);

  function close() {
    if (resolver) {
      // If user closes without saving, reject the promise
      resolver(null);
    }
    setPending(null);
    setResolver(null);
  }

  function handleComplete(payload: BrandingCompletePayload) {
    console.log('BrandingSheetContext: handleComplete called with:', payload);
    
    // Guard: every selection must have type and size
    const allChosen = payload.selections.every(s => s.type && s.size);
    if (!allChosen) {
      console.warn('BrandingSheetContext: Some selections are missing type or size');
      // Return null to indicate incomplete selection
      if (resolver) {
        resolver(null);
      }
      close();
      return;
    }

    // Normalize to stricter internal shape (non-null assertions safe after guard)
    const normalized: NormalizedBrandingResult = {
      stockHeaderId: payload.stockHeaderId,
      selections: payload.selections.map(s => ({
        position: s.position,
        type: s.type!,   // non-null now
        size: s.size!,   // non-null now
        colorCount: s.colorCount,
        comment: s.comment,
        artwork_url: s.artwork_url, // Include artwork_url
      })),
    };

    if (resolver) {
      resolver(normalized);
    }
    close();
  }

  return (
    <BrandingCtx.Provider value={{ openBranding }}>
      {children}
      {pending ? (
        <BrandingSheet
          open={true}
          onClose={close}
          productName={pending.productName}
          stockHeaderId={pending.stockHeaderId}
          colour={pending.colour}
          size={pending.size}
          itemKey={pending.itemKey}
          onComplete={handleComplete}
        />
      ) : null}
    </BrandingCtx.Provider>
  );
}

