"use client";
import Link from "next/link";
import SmartImage from "@/components/SmartImage";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/browser";

type CategoryTile = { name: string; image: string | null };

// Define the specific categories (matching database names exactly)
const categoryNames = [
  "Apparel",
  "Bags", 
  "Chef Wear",
  "Display",
  "Gifting",
  "Headwear",  // Database name
  "Homeware",
  "Sport",
  "Sublimation",
  "Workwear"   // Database name
];

// Display names for UI (with proper spacing)
const displayNames: Record<string, string> = {
  "Headwear": "Head Wear",
  "Workwear": "Work Wear"
};

// Reverse mapping for URLs (display name -> database name)
const urlNames: Record<string, string> = {
  "Head Wear": "Headwear",
  "Work Wear": "Workwear"
};

export default function ShopByCategory() {
  const [categories, setCategories] = useState<CategoryTile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCategoryImages() {
      try {
        console.log('Fetching category images for:', categoryNames);
        
            // Fetch one product from each category to get representative images
            const categoryPromises = categoryNames.map(async (categoryName) => {
              console.log(`Fetching products for category: ${categoryName}`);
              
              // For Homeware, fetch 2 products and use the second one
              const pageSize = categoryName === "Homeware" ? 2 : 1;
              const page = categoryName === "Homeware" ? 1 : 1;
              const productIndex = categoryName === "Homeware" ? 1 : 0;
              
              const { data, error } = await supabase.rpc("search_products_grouped", {
                p_query: null,
                p_categories: [categoryName],
                p_types: null,
                p_brands: null,
                p_colours: null,
                p_sizes: null,
                p_genders: null,
                p_garment_types: null,
                p_stock_min: 0,
                p_page: page,
                p_page_size: pageSize,
              });
              
              if (error) {
                console.error(`Error fetching products for ${categoryName}:`, error);
                return {
                  name: categoryName,
                  image: null
                };
              }
              
              console.log(`Data for ${categoryName}:`, data);
              const products = Array.isArray(data) ? data : [data];
              const product = products[productIndex];
              console.log(`Product for ${categoryName}:`, product);
              
              return {
                name: categoryName, // Use database name directly
                image: categoryName === "Homeware" 
                  ? "https://bmkdwnfrldoqvduhpgsu.supabase.co/storage/v1/object/public/Storage/311859-white.webp"
                  : (product?.representative_image_url || null)
              };
            });

        const categoryData = await Promise.all(categoryPromises);
        console.log('Final category data:', categoryData);
        setCategories(categoryData);
      } catch (error) {
        console.error('Error fetching category images:', error);
        // Fallback to categories without images
        setCategories(categoryNames.map(name => ({ name, image: null })));
      } finally {
        setLoading(false);
      }
    }

    fetchCategoryImages();
  }, []);

  if (loading) {
    return (
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 mb-4">
            Shop by Category
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Explore our premium merchandise across carefully curated categories
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
          {categoryNames.map((name, index) => (
            <div
              key={`skeleton-${index}`}
              className="rounded-3xl overflow-hidden bg-gray-200 animate-pulse"
            >
              <div className="aspect-square" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  // Fallback if no categories are loaded
  if (!categories.length) {
    return (
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 mb-4">
            Shop by Category
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Explore our premium merchandise across carefully curated categories
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
          {categoryNames.map((name, index) => {
            const displayName = displayNames[name] || name;
            return (
              <Link
                key={`fallback-${index}`}
                href={`/shop?cat=${encodeURIComponent(name)}`}
                className="group block rounded-3xl overflow-hidden bg-white border border-gray-200 hover:border-[var(--ml-blue)] hover:shadow-xl hover:shadow-[var(--ml-blue)]/10 transition-all duration-300 transform hover:-translate-y-1"
                aria-label={`Shop ${displayName}`}
              >
                <div className="relative aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl mb-2">📦</div>
                    <div className="text-gray-600 font-medium text-sm">{displayName}</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-7xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 mb-4">
          Shop by Category
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Explore our premium merchandise across carefully curated categories
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
        {categories.map((category, index) => {
          // Use database name for URL, display name for UI
          const displayName = displayNames[category.name] || category.name;
          return (
            <Link
              key={`category-${index}-${category.name}`}
              href={`/shop?cat=${encodeURIComponent(category.name)}`}
              className="group block rounded-3xl overflow-hidden bg-white border border-gray-200 hover:border-[var(--ml-blue)] hover:shadow-xl hover:shadow-[var(--ml-blue)]/10 transition-all duration-300 transform hover:-translate-y-1"
              aria-label={`Shop ${displayName}`}
            >
              <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100">
                {/* cover image */}
                <SmartImage
                  src={category.image}
                  alt={category.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width:640px) 50vw, (max-width:1024px) 20vw, 16vw"
                />
                {/* gradient overlay for better text contrast */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                
                {/* category name overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="text-white font-semibold text-sm md:text-base text-center group-hover:text-white/90 transition-colors">
                    {displayName}
                  </div>
                </div>
                
                {/* hover effect overlay */}
                <div className="absolute inset-0 bg-[var(--ml-blue)]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
