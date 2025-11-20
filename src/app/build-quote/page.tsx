"use client";

import { Suspense } from "react";
import BuildQuoteClient from "./BuildQuoteClient";

export default function BuildQuotePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <BuildQuoteClient />
    </Suspense>
  );
}

