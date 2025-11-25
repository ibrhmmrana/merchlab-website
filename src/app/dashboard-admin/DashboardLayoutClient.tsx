'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import { DashboardHeader } from '@/components/DashboardHeader';
import { cn } from '@/lib/utils';

export default function DashboardLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <DashboardHeader 
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          isOpen={isSidebarOpen}
          setIsOpen={setIsSidebarOpen}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
        />
        <main className={cn(
          "flex-1 overflow-y-auto min-w-0 transition-all duration-300",
          isSidebarCollapsed ? "lg:ml-20" : "lg:ml-64"
        )}>
          {children}
        </main>
      </div>
    </div>
  );
}

