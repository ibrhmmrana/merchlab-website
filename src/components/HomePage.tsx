"use client";

import Image from "next/image";
import Link from "next/link";
import { getCatalogFacets, listProductGroups } from "@/lib/data/products";
import { usePageLoading } from "@/components/LoadingNavigation";
import { useState, useEffect } from "react";

// Cache for categories and images
let categoriesCache: string[] | null = null;
let categoryImagesCache: Record<string, string> = {};
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function HomePage() {
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryImages, setCategoryImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  
  usePageLoading();

  useEffect(() => {
    const loadData = async () => {
      // Check cache first
      const now = Date.now();
      if (categoriesCache && (now - cacheTimestamp) < CACHE_DURATION) {
        setCategories(categoriesCache);
        setCategoryImages(categoryImagesCache);
        setLoading(false);
        return;
      }

      try {
        // Load categories
        const facets = await getCatalogFacets();
        const newCategories = facets?.categories || [
          "Apparel", "Bags", "Chef Wear", "Display", 
          "Gifting", "Headwear", "Homeware", "Sports"
        ];
        
        setCategories(newCategories);
        categoriesCache = newCategories;
        
        // Load images in background (non-blocking)
        loadCategoryImages(newCategories.slice(0, 8));
        
      } catch (error) {
        console.error("Error fetching categories:", error);
        // Use fallback categories
        const fallbackCategories = [
          "Apparel", "Bags", "Chef Wear", "Display", 
          "Gifting", "Headwear", "Homeware", "Sports"
        ];
        setCategories(fallbackCategories);
        categoriesCache = fallbackCategories;
      }
      
      setLoading(false);
    };

    loadData();
  }, []);

  const loadCategoryImages = async (categoriesToLoad: string[]) => {
    const newImages: Record<string, string> = {};
    
    // Load images in parallel for better performance
    const imagePromises = categoriesToLoad.map(async (category) => {
      const categoryName = category;
      try {
        const products = await listProductGroups({ 
          categories: [categoryName], 
          stock_min: 1, 
          pageSize: 1 
        });
        if (products.length > 0 && products[0].representative_image_url) {
          return { categoryName, imageUrl: products[0].representative_image_url };
        }
      } catch (error) {
        console.error(`Error fetching image for category ${categoryName}:`, error);
      }
      return null;
    });

    const results = await Promise.all(imagePromises);
    results.forEach(result => {
      if (result) {
        newImages[result.categoryName] = result.imageUrl;
      }
    });

    setCategoryImages(prev => ({ ...prev, ...newImages }));
    categoryImagesCache = { ...categoryImagesCache, ...newImages };
    cacheTimestamp = Date.now();
  };

  return (
    <div className="min-h-screen bg-white luxury-bg-pattern">
      {/* Promotional Banner */}
      <div className="text-white py-4 luxury-shimmer" style={{background: 'linear-gradient(to right, var(--luxury-brand), var(--luxury-brand-dark))'}}>
        <div className="container mx-auto px-4">
          <div className="text-center">
            <span className="text-lg font-semibold tracking-wide luxury-text-shadow">Free Delivery on orders over R1000</span>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative text-white py-24 overflow-hidden" style={{background: 'linear-gradient(to bottom right, var(--luxury-black), var(--luxury-gray), var(--luxury-black))'}}>
        <div className="absolute inset-0 luxury-bg-pattern opacity-10"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-6xl font-bold mb-6 luxury-text-gradient">
                CUSTOM MERCHANDISE
                <span className="block text-4xl mt-2 text-luxury-brand-light">MADE SIMPLE</span>
              </h1>
              <p className="text-xl text-gray-300 mb-8 luxury-text-shadow">
                Transform your brand with premium custom merchandise. From corporate apparel to promotional items,
                we deliver quality products that make your business stand out. Fast turnaround, competitive pricing,
                and exceptional service guaranteed.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/shop"
                  className="luxury-btn text-center"
                >
                  BROWSE PRODUCTS
                </Link>
                <Link
                  href="/contact"
                  className="luxury-btn-secondary text-center"
                >
                  GET QUOTE
                </Link>
              </div>
            </div>
            <div className="relative">
              <Image
                src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&h=400&fit=crop"
                alt="Merchandise showcase"
                width={600}
                height={400}
                className="rounded-lg shadow-2xl luxury-glow-subtle"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Category Navigation Circles */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex justify-center gap-8 overflow-x-auto luxury-scrollbar py-4">
            {loading ? (
              // Show skeleton loading for categories
              Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="flex flex-col items-center animate-pulse">
                  <div className="w-20 h-20 bg-gray-200 rounded-full mb-2"></div>
                  <div className="h-4 w-16 bg-gray-200 rounded"></div>
                </div>
              ))
            ) : (
              categories.slice(0, 8).map((category, index) => {
                const categoryName = category;
                const categoryKey = `category-${index}-${categoryName}`;
                const categoryImage = categoryImages[categoryName];
                
                return (
                  <Link key={categoryKey} href={`/shop?category=${encodeURIComponent(categoryName)}`} className="flex flex-col items-center group luxury-hover-lift p-2">
                    <div className="w-20 h-20 bg-white border-2 border-luxury-brand-light rounded-full flex items-center justify-center mb-2 group-hover:scale-110 group-hover:border-luxury-brand transition-all duration-500 overflow-hidden luxury-glow">
                      {categoryImage ? (
                        <Image
                          src={categoryImage}
                          alt={categoryName}
                          width={80}
                          height={80}
                          className="rounded-full object-cover w-full h-full group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <span className="text-luxury-brand font-bold text-sm group-hover:text-luxury-brand-dark transition-colors">{categoryName.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-luxury-brand transition-colors">{categoryName}</span>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* Lifestyle Content Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Lifestyle & Inspiration</h2>
            <p className="text-xl text-gray-600">See how our merchandise brings brands to life</p>
          </div>
          
          <div className="relative overflow-hidden rounded-lg">
            <div className="flex animate-scroll w-[500%]">
              <div className="w-[20%] flex-shrink-0">
                <Image
                  src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop"
                  alt="Lifestyle 1"
                  width={400}
                  height={300}
                  className="w-full h-64 object-cover"
                />
              </div>
              <div className="w-[20%] flex-shrink-0">
                <Image
                  src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop"
                  alt="Lifestyle 2"
                  width={400}
                  height={300}
                  className="w-full h-64 object-cover"
                />
              </div>
              <div className="w-[20%] flex-shrink-0">
                <Image
                  src="https://images.unsplash.com/photo-1551434678-e076c223a692?w=400&h=300&fit=crop"
                  alt="Lifestyle 3"
                  width={400}
                  height={300}
                  className="w-full h-64 object-cover"
                />
              </div>
              <div className="w-[20%] flex-shrink-0">
                <Image
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop"
                  alt="Lifestyle 4"
                  width={400}
                  height={300}
                  className="w-full h-64 object-cover"
                />
              </div>
              <div className="w-[20%] flex-shrink-0">
                <Image
                  src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=300&fit=crop"
                  alt="Lifestyle 5"
                  width={400}
                  height={300}
                  className="w-full h-64 object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Choose MerchLab?</h2>
            <p className="text-xl text-gray-600">We deliver excellence in every product</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 bg-gray-50 rounded-lg text-center luxury-hover-lift">
              <div className="w-16 h-16 bg-luxury-brand text-white rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">
                🚀
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Fast Turnaround</h3>
              <p className="text-gray-600 text-lg">Quick production and delivery to meet your deadlines</p>
            </div>
            
            <div className="p-8 bg-gray-50 rounded-lg text-center luxury-hover-lift">
              <div className="w-16 h-16 bg-luxury-brand text-white rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">
                ⭐
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Premium Quality</h3>
              <p className="text-gray-600 text-lg">High-quality materials and craftsmanship in every product</p>
            </div>
            
            <div className="p-8 bg-gray-50 rounded-lg text-center luxury-hover-lift">
              <div className="w-16 h-16 bg-luxury-brand text-white rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">
                💼
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Business Focused</h3>
              <p className="text-gray-600 text-lg">Solutions designed specifically for business needs</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-luxury-brand text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl mb-8">Contact us today for a free quote on your custom merchandise needs</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="luxury-btn-secondary"
            >
              GET FREE QUOTE
            </Link>
            <Link
              href="/shop"
              className="luxury-btn"
            >
              BROWSE PRODUCTS
            </Link>
          </div>
        </div>
      </section>

      {/* Notification Button */}
      <div className="fixed bottom-4 left-4 z-50">
        <button className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center text-white hover:bg-red-700 transition">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
