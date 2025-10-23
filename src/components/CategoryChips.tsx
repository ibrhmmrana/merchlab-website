'use client';

import { Button } from '@/components/ui/button';

interface CategoryChipsProps {
  categories: (string | { value?: string; name?: string })[];
  selected: string | null;
  onSelect: (category: string | null) => void;
}

export function CategoryChips({ 
  categories, 
  selected, 
  onSelect 
}: CategoryChipsProps) {
  return (
    <div className="flex space-x-2 overflow-x-auto pb-2">
      <Button
        variant={selected === null ? 'default' : 'outline'}
        size="sm"
        onClick={() => onSelect(null)}
        className="whitespace-nowrap"
      >
        All Categories
      </Button>
      {categories.map((category, index) => {
        const categoryValue = typeof category === 'string' ? category : (category?.value || category?.name || String(category));
        const categoryKey = typeof category === 'string' ? category : (category?.value || category?.name || JSON.stringify(category));
        return (
          <Button
            key={`category-${index}-${categoryKey}`}
            variant={selected === categoryValue ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSelect(categoryValue)}
            className="whitespace-nowrap"
          >
            {categoryValue}
          </Button>
        );
      })}
    </div>
  );
}
