"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import dynamic from "next/dynamic";

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

type Ctx = {
  openBranding: (p: BrandingOpenPayload) => Promise<{
    stockHeaderId: number;
    selections: Array<{ position: string; type: string; size: string; colorCount: number; comment?: string }>;
  }>;
};

const BrandingCtx = createContext<Ctx | null>(null);

export function useBrandingSheet() {
  const ctx = useContext(BrandingCtx);
  if (!ctx) throw new Error("useBrandingSheet must be used inside <BrandingSheetProvider>");
  return ctx;
}

type BrandingResult = {
  stockHeaderId: number;
  selections: Array<{ position: string; type: string; size: string; colorCount: number; comment?: string }>;
} | null;

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

  function handleComplete(v: BrandingResult) {
    console.log('BrandingSheetContext: handleComplete called with:', v);
    if (resolver) {
      resolver(v);
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
          onComplete={handleComplete}
        />
      ) : null}
    </BrandingCtx.Provider>
  );
}

