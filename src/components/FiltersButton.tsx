'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FiltersDialog } from '@/components/FiltersDialog';

export function FiltersButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="whitespace-nowrap"
      >
        Filters
      </Button>
      
      <FiltersDialog 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
      />
    </>
  );
}
