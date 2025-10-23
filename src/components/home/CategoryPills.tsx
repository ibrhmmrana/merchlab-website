"use client";
import Link from "next/link";

export default function CategoryPills({ categories }: { categories: string[] }) {
  if (!categories?.length) return null;
  
  // Ensure we have valid string categories
  const validCategories = categories.filter(cat => 
    typeof cat === 'string' && cat.trim().length > 0
  );
  
  if (!validCategories.length) return null;
  
  return (
    <section className="max-w-7xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 mb-3">
          Shop by Category
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Discover our curated collection of premium merchandise across all categories
        </p>
      </div>
      
      <div className="flex flex-wrap justify-center gap-3">
        {validCategories.map((c, index) => (
          <Link
            key={`category-${index}-${c}`}
            href={`/shop?cat=${encodeURIComponent(c)}`}
            className="group relative px-6 py-3 rounded-2xl bg-white border border-gray-200 hover:border-[var(--ml-blue)] hover:shadow-lg hover:shadow-[var(--ml-blue)]/10 transition-all duration-300 text-gray-700 hover:text-[var(--ml-blue)] font-medium whitespace-nowrap"
          >
            <span className="relative z-10">{c}</span>
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[var(--ml-blue)]/5 to-[var(--ml-blue)]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </Link>
        ))}
      </div>
    </section>
  );
}
