import { supabase } from "@/lib/supabase/browser";
import type { ProductGroup, Facets, Variant } from "./types";

// Simple in-memory cache for facets
let facetsCache: Facets | null = null;
let facetsCacheTime = 0;
const FACETS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export type GroupQuery = {
  query?: string;
  categories?: string[];
  types?: string[];
  brands?: string[];
  colours?: string[];
  sizes?: string[];
  genders?: string[];
  garment_types?: string[];
  stock_min?: number;
  page?: number;
  pageSize?: number;
};

export async function listProductGroups(q: GroupQuery = {}): Promise<ProductGroup[]> {
  const {
    query = null,
    categories = null,
    types = null,
    brands = null,
    colours = null,
    sizes = null,
    genders = null,
    garment_types = null,
    stock_min = Math.max(1, q.stock_min ?? 1), // Always require stock > 0, never allow 0
    page = 1,
    pageSize = 24,
  } = q;

  console.log("listProductGroups called with:", q);

  const { data, error } = await supabase.rpc("search_products_grouped", {
    p_query: query,
    p_categories: categories,
    p_types: types,
    p_brands: brands,
    p_colours: colours,
    p_sizes: sizes,
    p_genders: genders,
    p_garment_types: garment_types,
    p_stock_min: stock_min,
    p_page: page,
    p_page_size: pageSize,
  });

  console.log("Supabase RPC response:", { data, error });

  if (error) {
    console.error("Supabase RPC error:", error);
    throw error;
  }
  
  // Final safety net: filter out any products with 0 stock
  const filteredData = (data ?? []).filter((group: ProductGroup) => group.in_stock > 0);
  console.log(`Filtered ${(data ?? []).length - filteredData.length} products with 0 stock`);
  
  return filteredData as ProductGroup[];
}

export async function getVariantsForGroup(stock_header_id: number): Promise<Variant[]> {
  console.log("getVariantsForGroup called with stock_header_id:", stock_header_id);
  
  // Check if Supabase is properly configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error("getVariantsForGroup: Missing Supabase environment variables");
    console.error("NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "Set" : "Missing");
    console.error("NEXT_PUBLIC_SUPABASE_ANON_KEY:", supabaseKey ? "Set" : "Missing");
    return [];
  }
  
  try {
    // Start with minimal essential columns only
    const { data, error } = await supabase
      .from('products_flat')
      .select(`
        stock_id, 
        stock_header_id, 
        stock_code, 
        description, 
        colour, 
        size, 
        base_price, 
        discounted_price, 
        image_url, 
        qty_available,
        wh3_bond
      `)
      .eq('stock_header_id', stock_header_id);
    
    if (error) {
      console.error("getVariantsForGroup Supabase error:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      return [];
    }
    
    console.log("getVariantsForGroup success:", data?.length || 0, "variants");
    
    // Map aliases for compatibility and add default values for missing fields
    // Calculate available quantity as sum of qty_available + wh3_bond
    return (data ?? [])
      .map(v => {
        const qtyAvailable = Number(v.qty_available) || 0;
        const wh3Bond = Number(v.wh3_bond) || 0;
        const totalAvailable = qtyAvailable + wh3Bond;
        
        return {
          stock_id: v.stock_id,
          stock_header_id: v.stock_header_id,
          stock_code: v.stock_code,
          description: v.description,
          colour: v.colour,
          size: v.size,
          color_status: null, // Default value
          base_price: v.base_price,
          discounted_price: v.discounted_price,
          royalty_factor: null, // Default value
          image_url: v.image_url,
          qty_available: totalAvailable, // Sum of qty_available + wh3_bond
          brand: null, // Default value
          category: null, // Default value
          type: null, // Default value
          gender: null, // Default value
          garment_type: null, // Default value
          weight_per_unit: null, // Default value
          // Aliases for compatibility
          stockId: v.stock_id,
          stockHeaderId: v.stock_header_id,
        };
      })
      .filter(v => v.qty_available > 0) as Variant[]; // Only return variants with stock > 0
  } catch (error) {
    console.error("getVariantsForGroup exception:", error);
    console.error("Exception details:", JSON.stringify(error, null, 2));
    return [];
  }
}

export async function getColourImagesForGroup(stock_header_id: number): Promise<{ colour: string; image_url: string | null; sizes: string[] }[]> {
  const { data, error } = await supabase.rpc("get_colour_images_for_group", { p_stock_header_id: stock_header_id });
  if (error) throw error;
  return (data ?? []) as { colour: string; image_url: string | null; sizes: string[] }[];
}

export async function getCatalogFacets(): Promise<Facets> {
  // Check cache first
  const now = Date.now();
  if (facetsCache && (now - facetsCacheTime) < FACETS_CACHE_DURATION) {
    console.log("getCatalogFacets: using cached data");
    return facetsCache;
  }

  console.log("getCatalogFacets called");
  try {
    const { data, error } = await supabase.rpc("get_catalog_facets");
    console.log("getCatalogFacets response:", { data, error });
    if (error) {
      console.error("getCatalogFacets error:", error);
      // Return empty facets instead of throwing
      const emptyFacets: Facets = {
        categories: [],
        types: [],
        brands: [],
        colours: [],
        sizes: [],
        genders: [],
        garment_types: [],
        stock_min: 0,
        stock_max: 0
      };
      facetsCache = emptyFacets;
      facetsCacheTime = now;
      return emptyFacets;
    }
    // RPC returns a single row as one object
    const result = (Array.isArray(data) ? data[0] : data) as Facets;
    facetsCache = result;
    facetsCacheTime = now;
    return result;
  } catch (error) {
    console.error("getCatalogFacets exception:", error);
    // Return empty facets on any error
    const emptyFacets: Facets = {
      categories: [],
      types: [],
      brands: [],
      colours: [],
      sizes: [],
      genders: [],
      garment_types: [],
      stock_min: 0,
      stock_max: 0
    };
    facetsCache = emptyFacets;
    facetsCacheTime = now;
    return emptyFacets;
  }
}