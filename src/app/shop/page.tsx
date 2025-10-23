"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listProductGroups, getCatalogFacets } from "@/lib/data/products";
import type { ProductGroup, Facets } from "@/lib/data/types";
import ProductCard from "@/components/ProductCard";
import FiltersDialog, { FiltersState } from "@/components/FiltersDialog";
import { ProductLoadingAnimation } from "@/components/ProductLoadingAnimation";
import { usePageLoading } from "@/components/LoadingNavigation";

function parseMulti(sp: URLSearchParams, key: string): string[] | null {
  const raw = sp.getAll(key);
  if (raw.length === 0) return null;
  return raw.flatMap((v) => v.split(",")).filter(Boolean);
}

function sortGroups(list: ProductGroup[], sort: string) {
  const copy = [...list];
  if (sort === "name_asc") copy.sort((a,b)=> (a.group_name||"").localeCompare(b.group_name||""));
  if (sort === "name_desc") copy.sort((a,b)=> (b.group_name||"").localeCompare(a.group_name||""));
  if (sort === "stock_desc") copy.sort((a,b)=> (b.in_stock||0)-(a.in_stock||0));
  return copy;
}

export default function ShopPage() {
  const router = useRouter();
  const sp = useSearchParams();
  
  // Handle page loading states
  usePageLoading();

  const [facets, setFacets] = useState<Facets | null>(null);
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState<string>(sp.get("q") || "");
  const [sort, setSort] = useState<string>(sp.get("sort") || "relevance");

  const [filters, setFilters] = useState<FiltersState>({
    categories: parseMulti(sp, "cat"),
    types: parseMulti(sp, "type"),
    brands: parseMulti(sp, "brand"),
    colours: parseMulti(sp, "colour"),
    sizes: parseMulti(sp, "size"),
    genders: parseMulti(sp, "gender"),
    garment_types: parseMulti(sp, "garment"),
    stock_min: Math.max(1, sp.get("stock_min") ? Number(sp.get("stock_min")) : 1), // Always require stock > 0
  });

  // load facets
  useEffect(() => { getCatalogFacets().then(setFacets).catch(console.error); }, []);

  // push URL (debounced-ish) whenever search/filters/sort change
  useEffect(() => {
    const p = new URLSearchParams();
    if (search) p.set("q", search);
    if (sort && sort !== "relevance") p.set("sort", sort);
    const addArr = (k: string, arr?: string[] | null) => {
      if (arr && arr.length) p.set(k, arr.join(","));
    };
    addArr("cat", filters.categories);
    addArr("type", filters.types);
    addArr("brand", filters.brands);
    addArr("colour", filters.colours);
    addArr("size", filters.sizes);
    addArr("gender", filters.genders);
    addArr("garment", filters.garment_types);
    if (filters.stock_min && filters.stock_min > 0) p.set("stock_min", String(filters.stock_min));
    router.replace(`/shop${p.toString() ? "?" + p.toString() : ""}`);
    // reset pagination
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, sort, JSON.stringify(filters)]);

  async function load(reset = false) {
    if (loading) return;
    setLoading(true);
    try {
      const data = await listProductGroups({
        query: search || undefined,
        categories: filters.categories || undefined,
        types: filters.types || undefined,
        brands: filters.brands || undefined,
        colours: filters.colours || undefined,
        sizes: filters.sizes || undefined,
        genders: filters.genders || undefined,
        garment_types: filters.garment_types || undefined,
        stock_min: Math.max(1, filters.stock_min ?? 1), // Always require stock > 0
        page: reset ? 1 : page,
        pageSize: 24,
      });
      // Additional client-side filtering to ensure no products with 0 stock
      const filteredData = data.filter(group => group.in_stock > 0);
      const merged = reset ? filteredData : [...groups, ...filteredData];
      const total = data[0]?.total_count ?? 0;
      setGroups(sortGroups(merged, sort));
      setHasMore(merged.length < total);
      setPage(reset ? 2 : page + 1);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(true); /* initial + on filter/url changes */ }, [search, sort, JSON.stringify(filters)]); // eslint-disable-line

  function onApplyFilters(next: FiltersState) { 
    setFilters(prev => ({
      ...prev,
      colours: next.colours,
      sizes: next.sizes,
      garment_types: next.garment_types
    }));
  }
  function onResetFilters() {
    setFilters(prev => ({
      ...prev,
      colours: null,
      sizes: null,
      garment_types: null
    }));
  }

  // Category navigation data
  const mainCategories = [
    { name: "Apparel", subCategories: [
      { name: "Bodywarmers", subSubCategories: [] },
      { name: "Bottoms", subSubCategories: [] },
      { name: "Fleece Tops", subSubCategories: [] },
      { name: "Golf Shirts", subSubCategories: [] },
      { name: "Jackets", subSubCategories: [] },
      { name: "Kids-Fleece Tops", subSubCategories: [] },
      { name: "Kids-Golf Shirts", subSubCategories: [] },
      { name: "Kids-Jackets", subSubCategories: [] },
      { name: "Kids-Sweaters", subSubCategories: [] },
      { name: "Kids-T-Shirts", subSubCategories: [] },
      { name: "Knitwear", subSubCategories: [] },
      { name: "Ladies Corporate Wear", subSubCategories: [
        { name: "Schoolwear", subSubCategories: [] },
        { name: "Shirts-Corporate", subSubCategories: [] },
        { name: "Shirts-Outdoor", subSubCategories: [] },
        { name: "Shirts-Racing", subSubCategories: [] },
        { name: "Sweaters", subSubCategories: [] },
        { name: "T-Shirts", subSubCategories: [] }
      ] }
    ] },
    { name: "Bags", subCategories: [
      { name: "Backpacks", subSubCategories: [] },
      { name: "Bags on Wheels", subSubCategories: [] },
      { name: "Beauty and Toiletries", subSubCategories: [] },
      { name: "Conference and Messenger Bags", subSubCategories: [] },
      { name: "Drawstrings", subSubCategories: [] },
      { name: "Outdoor", subSubCategories: [] },
      { name: "Shoppers and Slings", subSubCategories: [] },
      { name: "Sports Bags", subSubCategories: [] },
      { name: "Travel Bags", subSubCategories: [] },
      { name: "Waistbag", subSubCategories: [] }
    ] },
    { name: "Chef Wear", subCategories: [
      { name: "Apron", subSubCategories: [] },
      { name: "Bottoms", subSubCategories: [] },
      { name: "Head Wear Range", subSubCategories: [] },
      { name: "Jackets", subSubCategories: [] }
    ] },
    { name: "Display", subCategories: [
      { name: "Flags", subSubCategories: [] },
      { name: "Hardware", subSubCategories: [] },
      { name: "Indoor", subSubCategories: [] },
      { name: "Outdoor", subSubCategories: [] },
      { name: "Skins", subSubCategories: [] }
    ] },
    { name: "Gifting", subCategories: [
      { name: "Automotive and First Aid", subSubCategories: [
        { name: "Ladies Gifts", subSubCategories: [] },
        { name: "Loadshedding", subSubCategories: [] },
        { name: "Notebooks", subSubCategories: [] },
        { name: "Novelties", subSubCategories: [] },
        { name: "Office Accessories", subSubCategories: [] },
        { name: "Outdoor", subSubCategories: [] },
        { name: "Packaging", subSubCategories: [] },
        { name: "Pet Care", subSubCategories: [] },
        { name: "Safety Accessories", subSubCategories: [] },
        { name: "Sports Bags", subSubCategories: [] },
        { name: "Technology", subSubCategories: [] },
        { name: "Travel", subSubCategories: [] },
        { name: "Travel Bags", subSubCategories: [] },
        { name: "Umbrellas", subSubCategories: [] },
        { name: "Wine", subSubCategories: [] },
        { name: "Writing Instruments", subSubCategories: [] }
      ] },
      { name: "Backpacks", subSubCategories: [] },
      { name: "Bags on Wheels", subSubCategories: [] },
      { name: "Braai", subSubCategories: [] },
      { name: "Coolers", subSubCategories: [] },
      { name: "Diaries", subSubCategories: [] },
      { name: "Drawstrings", subSubCategories: [] },
      { name: "Drinkware", subSubCategories: [] },
      { name: "Flashlights and Tools", subSubCategories: [] },
      { name: "Folders", subSubCategories: [] },
      { name: "Keychains", subSubCategories: [] },
      { name: "Kitchen Wine and Food", subSubCategories: [] }
    ] },
    { name: "Headwear", subCategories: [
      { name: "Caps", subSubCategories: [] },
      { name: "Outdoor", subSubCategories: [] },
      { name: "Safety Range", subSubCategories: [] },
      { name: "Winter Range", subSubCategories: [] }
    ] },
    { name: "Homeware", subCategories: [
      { name: "Appliances", subSubCategories: [] },
      { name: "Crockery", subSubCategories: [] },
      { name: "Cutlery", subSubCategories: [] },
      { name: "Drinkware", subSubCategories: [] },
      { name: "Glassware", subSubCategories: [] },
      { name: "Kitchenware", subSubCategories: [] },
      { name: "Table Linen", subSubCategories: [] }
    ] },
    { name: "Sport", subCategories: [
      { name: "Canterbury", subSubCategories: [] },
      { name: "Events", subSubCategories: [] },
      { name: "Off Field Apparel", subSubCategories: [] },
      { name: "On Field Apparel", subSubCategories: [] },
      { name: "RWC 2023 Range", subSubCategories: [] },
      { name: "Socks", subSubCategories: [] },
      { name: "Sport Bags", subSubCategories: [] }
    ] },
    { name: "Sublimation", subCategories: [
      { name: "Accessories", subSubCategories: [
        { name: "Bottoms", subSubCategories: [] },
        { name: "Golf Shirts", subSubCategories: [] },
        { name: "On Field Apparel", subSubCategories: [] },
        { name: "T-Shirts", subSubCategories: [] }
      ] }
    ] },
    { name: "Workwear", subCategories: [
      { name: "Bottoms", subSubCategories: [] },
      { name: "Footwear", subSubCategories: [] },
      { name: "High Visibility", subSubCategories: [] },
      { name: "JCB Workwear", subSubCategories: [] },
      { name: "Jackets", subSubCategories: [] },
      { name: "Pioneer Safety", subSubCategories: [] },
      { name: "Protective Outerwear", subSubCategories: [] },
      { name: "Safety Accessories", subSubCategories: [] },
      { name: "Security", subSubCategories: [] },
      { name: "Service and Beauty", subSubCategories: [] }
    ] }
  ];

  const [selectedMainCategory, setSelectedMainCategory] = useState<string | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [selectedSubSubCategory, setSelectedSubSubCategory] = useState<string | null>(null);

  // Handle category selection
  const handleMainCategoryClick = (categoryName: string) => {
    if (selectedMainCategory === categoryName) {
      setSelectedMainCategory(null);
      setSelectedSubCategory(null);
      setSelectedSubSubCategory(null);
      // Clear all filters
      setFilters(prev => ({ 
        ...prev, 
        categories: null, 
        types: null, 
        garment_types: null 
      }));
    } else {
      setSelectedMainCategory(categoryName);
      setSelectedSubCategory(null);
      setSelectedSubSubCategory(null);
      // Set category filter and clear sub-category filters
      setFilters(prev => ({ 
        ...prev, 
        categories: [categoryName], 
        types: null, 
        garment_types: null 
      }));
    }
  };

  const handleSubCategoryClick = (subCategoryName: string) => {
    if (selectedSubCategory === subCategoryName) {
      setSelectedSubCategory(null);
      setSelectedSubSubCategory(null);
      // Clear sub-category and sub-sub-category filters, keep main category
      setFilters(prev => ({ 
        ...prev, 
        types: null, 
        garment_types: null 
      }));
    } else {
      setSelectedSubCategory(subCategoryName);
      setSelectedSubSubCategory(null);
      // Set sub-category filter and clear sub-sub-category filter
      setFilters(prev => ({ 
        ...prev, 
        types: [subCategoryName], 
        garment_types: null 
      }));
    }
  };

  const handleSubSubCategoryClick = (subSubCategoryName: string) => {
    if (selectedSubSubCategory === subSubCategoryName) {
      setSelectedSubSubCategory(null);
      // Clear sub-sub-category filter, keep main and sub categories
      setFilters(prev => ({ ...prev, garment_types: null }));
    } else {
      setSelectedSubSubCategory(subSubCategoryName);
      // Set sub-sub-category filter
      setFilters(prev => ({ ...prev, garment_types: [subSubCategoryName] }));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Shop Title */}
      <h1 className="text-4xl font-bold mb-6">Shop</h1>
      
      {/* Category Navigation */}
      <div className="mb-8">
        {/* Main Categories */}
        <div className="flex flex-wrap gap-4 mb-4">
          {mainCategories.map((category) => (
            <button
              key={category.name}
              onClick={() => handleMainCategoryClick(category.name)}
              className={`text-lg font-medium pb-2 border-b-2 transition-colors ${
                selectedMainCategory === category.name 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent hover:border-gray-300'
              }`}
            >
              {category.name}
            </button>
        ))}
      </div>

        {/* Sub Categories */}
        {selectedMainCategory && (
          <div className="ml-4 mb-4">
            <div className="flex flex-wrap gap-3">
              {mainCategories
                .find(cat => cat.name === selectedMainCategory)
                ?.subCategories.map((subCategory, index) => (
                  <button
                    key={`${subCategory.name}-${index}`}
                    onClick={() => handleSubCategoryClick(subCategory.name)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      selectedSubCategory === subCategory.name
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {subCategory.name}
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Sub-Sub Categories */}
        {selectedSubCategory && (
          <div className="ml-8 mb-4">
            <div className="flex flex-wrap gap-3">
              {mainCategories
                .find(cat => cat.name === selectedMainCategory)
                ?.subCategories.find(sub => sub.name === selectedSubCategory)
                ?.subSubCategories.map((subSubCategory, index) => (
                  <button
                    key={`${subSubCategory.name}-${index}`}
                    onClick={() => handleSubSubCategoryClick(subSubCategory.name)}
                    className={`px-3 py-1 text-sm rounded transition-colors ${
                      selectedSubSubCategory === subSubCategory.name
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                    }`}
                  >
                    {subSubCategory.name}
                  </button>
        ))}
      </div>
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-2 md:items-center md:justify-between mb-4">
        <form onSubmit={(e)=>{e.preventDefault(); load(true);}} className="flex gap-2">
          <Input placeholder="Search products or codes…" value={search} onChange={(e)=> setSearch(e.target.value)} />
        <Button type="submit">Search</Button>
      </form>
        <div className="flex gap-2">
          <FiltersDialog facets={facets} value={filters} onApply={onApplyFilters} onReset={onResetFilters} />
          <select
            className="border rounded px-2 py-1 text-sm"
            value={sort}
            onChange={(e)=> setSort(e.target.value)}
          >
            <option value="relevance">Sort: Relevance</option>
            <option value="name_asc">Name A–Z</option>
            <option value="name_desc">Name Z–A</option>
            <option value="stock_desc">Stock high→low</option>
          </select>
        </div>
      </div>

      {/* Active Filters Display */}
      {(filters.colours?.length || filters.sizes?.length || filters.garment_types?.length) && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {filters.colours?.map((color) => (
              <div key={color} className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                <span>Color: {color}</span>
                <button
                  onClick={() => {
                    const newColors = filters.colours?.filter(c => c !== color) || [];
                    setFilters(prev => ({ ...prev, colours: newColors.length ? newColors : null }));
                  }}
                  className="hover:bg-blue-200 rounded-full p-0.5"
                >
                  ×
                </button>
              </div>
            ))}
            {filters.sizes?.map((size) => (
              <div key={size} className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                <span>Size: {size}</span>
                <button
                  onClick={() => {
                    const newSizes = filters.sizes?.filter(s => s !== size) || [];
                    setFilters(prev => ({ ...prev, sizes: newSizes.length ? newSizes : null }));
                  }}
                  className="hover:bg-green-200 rounded-full p-0.5"
                >
                  ×
                </button>
              </div>
            ))}
            {filters.garment_types?.map((type) => (
              <div key={type} className="flex items-center gap-2 bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">
                <span>Type: {type}</span>
                <button
                  onClick={() => {
                    const newTypes = filters.garment_types?.filter(t => t !== type) || [];
                    setFilters(prev => ({ ...prev, garment_types: newTypes.length ? newTypes : null }));
                  }}
                  className="hover:bg-purple-200 rounded-full p-0.5"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              onClick={onResetFilters}
              className="text-sm text-gray-600 hover:text-gray-800 underline"
            >
              Clear all filters
            </button>
          </div>
        </div>
      )}

      {loading && groups.length === 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-64 rounded bg-gray-100 animate-pulse" />)}
        </div>
      )}

      {!loading && groups.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No products found</p>
          <p className="text-sm text-muted-foreground mt-2">
            Try adjusting your search or filters
          </p>
        </div>
      )}

      {loading && groups.length === 0 ? (
        <ProductLoadingAnimation />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {groups.map((g) => <ProductCard key={g.stock_header_id} group={g} />)}
        </div>
      )}

      <div className="flex justify-center py-8">
        {hasMore ? (
          <button disabled={loading} onClick={() => load(false)} className="luxury-btn">{loading ? "Loading…" : "Load more"}</button>
        ) : (
          <div className="text-sm text-muted-foreground">No more items</div>
        )}
      </div>
    </div>
  );
}
