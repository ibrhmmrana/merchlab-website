'use client';

import { usePathname } from 'next/navigation';
import { Footer } from './Footer';

export function ConditionalFooter() {
  const pathname = usePathname();
  
  // Hide footer on dashboard pages
  if (pathname?.startsWith('/dashboard-admin')) {
    return null;
  }
  
  return <Footer />;
}

