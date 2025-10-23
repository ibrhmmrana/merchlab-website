"use client";

import { usePageLoading } from "@/components/LoadingNavigation";

export function HomePageClient({ children }: { children: React.ReactNode }) {
  usePageLoading();
  return <>{children}</>;
}
