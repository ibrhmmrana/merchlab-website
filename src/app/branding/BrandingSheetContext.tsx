"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import type { BrandingCompletePayload, BulkBrandingCompletePayload, BrandingBulkItem } from "./types";

const BrandingSheet = dynamic(() => import("./BrandingSheet"), { ssr: false });

export type BrandingOpenPayload = {
  productId: string;
  productName: string;
  stockHeaderId: number;
  variantId?: string;
  colour?: string;
  size?: string;
  quantity?: number;
  itemKey?: string;
  /** When set, sheet shows item grid under "Choose your position type(s)" and Next advances through items */
  bulkItems?: BrandingBulkItem[];
};

type NormalizedBrandingResult = {
  stockHeaderId: number;
  selections: Array<{ position: string; type: string; size: string; colorCount: number; comment?: string; artwork_url?: string; logo_file?: string }>;
};

type BrandingResult = NormalizedBrandingResult | null;

type Ctx = {
  openBranding: (p: BrandingOpenPayload) => Promise<BrandingResult | NormalizedBrandingResult[]>;
};

const BrandingCtx = createContext<Ctx | null>(null);

export function useBrandingSheet() {
  const ctx = useContext(BrandingCtx);
  if (!ctx) throw new Error("useBrandingSheet must be used inside <BrandingSheetProvider>");
  return ctx;
}

export function BrandingSheetProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<BrandingOpenPayload | null>(null);
  const [resolver, setResolver] = useState<((v: BrandingResult | NormalizedBrandingResult[]) => void) | null>(null);

  const openBranding = useCallback((p: BrandingOpenPayload) => {
    if (p.stockHeaderId < 1000) {
      console.warn('BrandingSheetProvider: stockHeaderId seems too small:', p.stockHeaderId);
    }
    setPending(p);
    return new Promise<BrandingResult | NormalizedBrandingResult[]>((resolve) => {
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

  function handleComplete(payload: BrandingCompletePayload | BulkBrandingCompletePayload) {
    console.log('BrandingSheetContext: handleComplete called with:', payload);

    if ('bulk' in payload && payload.bulk) {
      const bulk = payload as BulkBrandingCompletePayload;
      const normalized = bulk.items.map((item) => ({
        stockHeaderId: pending!.stockHeaderId,
        variantId: item.variantId,
        colour: item.colour,
        size: item.size,
        quantity: item.quantity,
        selections: item.selections.map(s => ({
          position: s.position,
          type: s.type!,
          size: s.size!,
          colorCount: s.colorCount,
          comment: s.comment,
          artwork_url: s.artwork_url,
          logo_file: s.logo_file,
        })),
      }));
      if (resolver) resolver(normalized);
      close();
      return;
    }

    const single = payload as BrandingCompletePayload;
    const allChosen = single.selections.every(s => s.type && s.size);
    if (!allChosen) {
      console.warn('BrandingSheetContext: Some selections are missing type or size');
      if (resolver) resolver(null);
      close();
      return;
    }

    const normalized: NormalizedBrandingResult = {
      stockHeaderId: single.stockHeaderId,
      selections: single.selections.map(s => ({
        position: s.position,
        type: s.type!,
        size: s.size!,
        colorCount: s.colorCount,
        comment: s.comment,
        artwork_url: s.artwork_url,
        logo_file: s.logo_file,
      })),
    };

    if (resolver) resolver(normalized);
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
          bulkItems={pending.bulkItems}
          onComplete={handleComplete}
        />
      ) : null}
    </BrandingCtx.Provider>
  );
}

