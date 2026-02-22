'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Menu, Settings } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface DashboardHeaderProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
}

export function DashboardHeader({ isSidebarOpen, setIsSidebarOpen }: DashboardHeaderProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shopMargin, setShopMargin] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (settingsOpen) {
      setMessage(null);
      fetch('/api/settings/shop-price-margin')
        .then((r) => r.json())
        .then((data) => setShopMargin(String(data.margin ?? 0)))
        .catch(() => setShopMargin('0'));
    }
  }, [settingsOpen]);

  async function handleSaveMargin() {
    const num = parseFloat(shopMargin);
    if (!Number.isFinite(num) || num < 0 || num > 1000) {
      setMessage({ type: 'error', text: 'Enter a number between 0 and 1000' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/settings/shop-price-margin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ margin: num }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to save' });
        return;
      }
      setMessage({ type: 'success', text: 'Shop price margin saved.' });
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to save' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-full mx-auto px-6 sm:px-8 lg:px-12">
          <div className="flex items-center justify-between h-20">
            {/* Left side: Hamburger menu (mobile) + Logo */}
            <div className="flex items-center gap-4">
              {/* Mobile hamburger menu button */}
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-md transition-colors"
                aria-label="Open menu"
              >
                <Menu className="w-6 h-6" />
              </button>

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
            </div>

            {/* Right side: Settings + Build a Quote */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSettingsOpen(true)}
                className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                aria-label="Settings"
              >
                <Settings className="w-5 h-5 text-gray-600" />
              </button>
              <Link href="/build-a-quote">
                <Button variant="outline" className="flex items-center gap-2 transition-all duration-150 hover:scale-105 hover:shadow-md active:scale-95 cursor-pointer">
                  Build a Quote
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-600">
              Set your target profit margin (as % of selling price). Prices on <strong>/shop</strong> will be marked up so that margin is achieved (e.g. 25% margin ≈ 33.33% markup). Build a Quote prices are unchanged.
            </p>
            <div>
              <label htmlFor="shop-margin" className="block text-sm font-medium text-gray-700 mb-1">
                Shop profit margin (% of selling price)
              </label>
              <Input
                id="shop-margin"
                type="number"
                min={0}
                max={1000}
                step={0.5}
                value={shopMargin}
                onChange={(e) => setShopMargin(e.target.value)}
                placeholder="e.g. 15"
              />
            </div>
            {message && (
              <p className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                {message.text}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveMargin} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

