'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, TrendingUp, FileText, Receipt, Users, X, MessageSquare, Mail, ChevronLeft, ChevronRight, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isCollapsed?: boolean;
  setIsCollapsed?: (collapsed: boolean) => void;
}

// Tooltip component that renders outside the nav container via portal
function Tooltip({ label, isVisible, triggerElement }: { label: string; isVisible: boolean; triggerElement: HTMLElement | null }) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isVisible && triggerElement && mounted) {
      const updatePosition = () => {
        const rect = triggerElement.getBoundingClientRect();
        setPosition({
          top: rect.top + rect.height / 2,
          left: rect.right + 8, // 8px = ml-2
        });
      };
      updatePosition();
      // Update on scroll/resize
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isVisible, triggerElement, mounted]);

  if (!mounted || !isVisible || !triggerElement || typeof document === 'undefined') return null;

  return createPortal(
    <span
      className="fixed px-2 py-1 text-sm font-medium text-white bg-gray-900 rounded whitespace-nowrap pointer-events-none transition-opacity duration-200 z-[99999] shadow-xl"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translateY(-50%)',
        opacity: 1,
      }}
    >
      {label}
    </span>,
    document.body
  );
}

export default function Sidebar({ isOpen, setIsOpen, isCollapsed = false, setIsCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());

  const navItems = [
    {
      href: '/dashboard-admin',
      label: 'Overview',
      icon: LayoutDashboard,
    },
    {
      href: '/dashboard-admin/quotes',
      label: 'Quotes',
      icon: FileText,
    },
    {
      href: '/dashboard-admin/invoices',
      label: 'Invoices',
      icon: Receipt,
    },
    {
      href: '/dashboard-admin/orders',
      label: 'Orders',
      icon: ShoppingCart,
    },
    {
      href: '/dashboard-admin/best-selling',
      label: 'Best Selling Items',
      icon: TrendingUp,
    },
    {
      href: '/dashboard-admin/customers',
      label: 'Top Customers',
      icon: Users,
    },
  ];

  const communicationsItems = [
    {
      href: '/dashboard-admin/communications/whatsapp',
      label: 'WhatsApp',
      icon: MessageSquare,
    },
    {
      href: '/dashboard-admin/communications/email',
      label: 'Email',
      icon: Mail,
    },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-20 bottom-0 left-0 z-50 bg-white border-r border-gray-200 flex flex-col transform transition-all duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          isCollapsed ? 'lg:w-20' : 'lg:w-64',
          'w-64'
        )}
      >
        <div className={cn(
          "border-b border-gray-200 flex items-center justify-between transition-all duration-300",
          isCollapsed ? "p-3 lg:justify-center" : "p-6"
        )}>
          {!isCollapsed && (
            <h1 className="text-xl font-bold">Admin Dashboard</h1>
          )}
          <div className="flex items-center gap-2">
            {/* Desktop collapse toggle */}
            {setIsCollapsed && (
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden lg:flex p-1.5 hover:bg-gray-100 rounded transition-colors"
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronLeft className="w-4 h-4" />
                )}
              </button>
            )}
            {/* Mobile close button */}
            <button
              onClick={() => setIsOpen(false)}
              className="lg:hidden p-1 hover:bg-gray-100 rounded"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        {/* Scrollable content wrapper - allows tooltips to escape */}
        <div className="flex-1 overflow-y-auto overflow-x-visible">
          <nav className="p-4">
            <ul className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                const itemKey = `nav-${item.href}`;
                const isHovered = hoveredItem === itemKey;
                return (
                  <li key={item.href}>
                    <Link
                      ref={(el) => {
                        if (el) {
                          itemRefs.current.set(itemKey, el);
                        } else {
                          itemRefs.current.delete(itemKey);
                        }
                      }}
                      href={item.href}
                      onMouseEnter={() => isCollapsed && setHoveredItem(itemKey)}
                      onMouseLeave={() => setHoveredItem(null)}
                      onClick={() => {
                        setIsOpen(false); // Close on mobile
                        if (setIsCollapsed && !isCollapsed) {
                          setIsCollapsed(true); // Collapse on desktop if expanded
                        }
                      }}
                      className={cn(
                        'flex items-center rounded-lg transition-colors',
                        isCollapsed ? 'justify-center px-2 py-2' : 'gap-3 px-4 py-2',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-gray-700 hover:bg-gray-100'
                      )}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      {!isCollapsed && (
                        <span className="font-medium">{item.label}</span>
                      )}
                    </Link>
                    {/* Tooltip rendered via portal */}
                    {isCollapsed && (
                      <Tooltip
                        label={item.label}
                        isVisible={isHovered}
                        triggerElement={itemRefs.current.get(itemKey) || null}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
            
            {/* Communications Section */}
            <div className={cn(
              "border-t border-gray-200",
              isCollapsed ? "mt-6 pt-6" : "mt-6 pt-6"
            )}>
              {!isCollapsed && (
                <h2 className="px-4 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Communications
                </h2>
              )}
              <ul className="space-y-2">
                {communicationsItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || pathname?.startsWith(item.href);
                  const itemKey = `comm-${item.href}`;
                  const isHovered = hoveredItem === itemKey;
                  return (
                    <li key={item.href}>
                      <Link
                        ref={(el) => {
                          if (el) {
                            itemRefs.current.set(itemKey, el);
                          } else {
                            itemRefs.current.delete(itemKey);
                          }
                        }}
                        href={item.href}
                        onMouseEnter={() => isCollapsed && setHoveredItem(itemKey)}
                        onMouseLeave={() => setHoveredItem(null)}
                        onClick={() => {
                          setIsOpen(false); // Close on mobile
                          if (setIsCollapsed && !isCollapsed) {
                            setIsCollapsed(true); // Collapse on desktop if expanded
                          }
                        }}
                        className={cn(
                          'flex items-center rounded-lg transition-colors',
                          isCollapsed ? 'justify-center px-2 py-2' : 'gap-3 px-4 py-2',
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-gray-700 hover:bg-gray-100'
                        )}
                      >
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        {!isCollapsed && (
                          <span className="font-medium">{item.label}</span>
                        )}
                      </Link>
                      {/* Tooltip rendered via portal */}
                      {isCollapsed && (
                        <Tooltip
                          label={item.label}
                          isVisible={isHovered}
                          triggerElement={itemRefs.current.get(itemKey) || null}
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </nav>
        </div>
      </aside>
    </>
  );
}
