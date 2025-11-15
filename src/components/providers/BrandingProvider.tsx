"use client";

import { BrandingSheetProvider } from "@/app/branding/BrandingSheetContext";

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  return <BrandingSheetProvider>{children}</BrandingSheetProvider>;
}

