'use client';

import { usePathname } from 'next/navigation';
import { Header } from './Header';

export function ConditionalHeader() {
  const pathname = usePathname();
  
  // Hide header on dashboard pages
  if (pathname?.startsWith('/dashboard-admin')) {
    return null;
  }
  
  return <Header />;
}

