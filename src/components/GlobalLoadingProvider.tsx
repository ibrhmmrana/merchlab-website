"use client";

import { useLoadingStore } from "@/store/loading";
import { useEffect } from "react";
import { FaviconLoader } from "@/components/FaviconLoader";
import { FaviconInitializer } from "@/components/FaviconInitializer";

export function GlobalLoadingProvider({ children }: { children: React.ReactNode }) {
  const { setPageLoading } = useLoadingStore();

  // Don't show global loading overlay - let pages handle their own loading
  useEffect(() => {
    // Just ensure page loading is false on mount
    setPageLoading(false);
  }, [setPageLoading]);

  return (
    <>
      {children}
      <FaviconInitializer />
      <FaviconLoader />
    </>
  );
}
