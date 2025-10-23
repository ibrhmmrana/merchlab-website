"use client";

import { useRouter } from "next/navigation";
import { useLoadingStore } from "@/store/loading";
import { useEffect } from "react";

interface LoadingLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function LoadingLink({ href, children, className, onClick }: LoadingLinkProps) {
  const router = useRouter();
  const setPageLoading = useLoadingStore((state) => state.setPageLoading);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setPageLoading(true, "Navigating...");
    
    if (onClick) {
      onClick();
    }
    
    // Navigate immediately but keep loading state
    router.push(href);
  };

  return (
    <a href={href} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}

// Hook to handle page loading states
export function usePageLoading() {
  const { setPageLoading } = useLoadingStore();
  
  useEffect(() => {
    // Clear loading state when page loads
    const timer = setTimeout(() => {
      setPageLoading(false);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [setPageLoading]);
}
