'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Search, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCartStore } from '@/store/cart';
import { useUiStore } from '@/store/ui';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingLink } from '@/components/LoadingNavigation';

export function Header() {
  const items = useCartStore((state) => state.items);
  const totalItems = items.reduce((total, item) => total + item.quantity, 0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearch(false);
      }
    };

    if (showSearch) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSearch]);

  const handleSearch = (query: string) => {
    if (query.trim()) {
      router.push(`/shop?q=${encodeURIComponent(query.trim())}`);
      setShowSearch(false);
      setSearchQuery('');
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(searchQuery);
  };

  return (
    <header className="luxury-nav sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="flex items-center justify-between h-20 py-4">
              {/* Logo */}
              <LoadingLink href="/" className="flex items-center">
                <Image
                  src="https://bmkdwnfrldoqvduhpgsu.supabase.co/storage/v1/object/public/Storage/ML%20Logo.png"
                  alt="MerchLab"
                  width={160}
                  height={50}
                  className="h-12 w-auto"
                />
              </LoadingLink>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <LoadingLink
              href="/"
              className="luxury-nav-item"
            >
              Home
            </LoadingLink>
            <LoadingLink
              href="/shop"
              className="luxury-nav-item"
            >
              Shop Now
            </LoadingLink>
            <LoadingLink
              href="/contact"
              className="luxury-nav-item"
            >
              Contact
            </LoadingLink>
          </nav>

          {/* Right side actions */}
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative" ref={searchRef}>
              <button 
                onClick={() => setShowSearch(!showSearch)}
                className="luxury-hover-glow p-2 rounded-lg transition-all duration-300 hover:bg-luxury-gold-light/10"
              >
                <Search className="h-5 w-5 text-gray-700 hover:text-luxury-gold transition-colors" />
              </button>
              
              {/* Search Input */}
              {showSearch && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <form onSubmit={handleSearchSubmit} className="p-4">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        autoFocus
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Search
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>

            {/* Cart */}
            <button
              onClick={() => useUiStore.getState().openCart()}
              className="luxury-hover-glow p-2 rounded-lg transition-all duration-300 hover:bg-luxury-gold-light/10 relative"
            >
              <ShoppingCart className="h-5 w-5 text-gray-700 hover:text-luxury-gold transition-colors" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 h-6 w-6 flex items-center justify-center text-xs bg-red-600 text-white rounded-full font-bold shadow-lg border-2 border-white">
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

          {/* Mobile Navigation */}
          <div className="md:hidden border-t border-gray-100">
            <nav className="flex items-center justify-center space-x-8 py-3">
              <LoadingLink
                href="/"
                className="luxury-nav-item text-sm"
              >
                Home
              </LoadingLink>
              <LoadingLink
                href="/shop"
                className="luxury-nav-item text-sm"
              >
                Shop Now
              </LoadingLink>
              <LoadingLink
                href="/contact"
                className="luxury-nav-item text-sm"
              >
                Contact
              </LoadingLink>
            </nav>
          </div>

    </header>
  );
}
