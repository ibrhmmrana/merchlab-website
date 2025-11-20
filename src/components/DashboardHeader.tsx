'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-full mx-auto px-6 sm:px-8 lg:px-12">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image
              src="https://bmkdwnfrldoqvduhpgsu.supabase.co/storage/v1/object/public/Storage/ML%20Logo.png"
              alt="MerchLab"
              width={160}
              height={50}
              className="h-12 w-auto"
            />
          </Link>

          {/* Build a Quote Button */}
          <Link href="/build-a-quote">
            <Button variant="outline" className="flex items-center gap-2 transition-all duration-150 hover:scale-105 hover:shadow-md active:scale-95 cursor-pointer">
              Build a Quote
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

