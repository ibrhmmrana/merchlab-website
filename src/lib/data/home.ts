// lib/data/home.ts
import { createServerClient } from "@/lib/supabase/server";

export async function getCategories(): Promise<string[]> {
  const supabase = createServerClient();
  const { data } = await supabase.rpc("get_catalog_facets");
  const facets = Array.isArray(data) ? data[0] : data;
  const cats = (facets?.categories ?? []) as (string | { value?: string; count?: number })[];
  
  // Handle both string arrays and object arrays with {count, value} structure
  const processedCats = cats.map(cat => {
    if (typeof cat === 'string') return cat;
    if (cat && typeof cat === 'object' && cat.value) return cat.value;
    return String(cat);
  }).filter(Boolean);
  
  return processedCats as string[];
}

export type CategoryTile = {
  name: string;
  image: string | null;
};

export async function getCategoryTiles(limit = 12): Promise<CategoryTile[]> {
  const supabase = createServerClient();
  const cats = (await getCategories()).slice(0, limit);

  // For each category, fetch 1 group so we can use its representative image
  const tiles = await Promise.all(
    cats.map(async (name) => {
      const { data } = await supabase.rpc("search_products_grouped", {
        p_query: null,
        p_categories: [name],
        p_types: null,
        p_brands: null,
        p_colours: null,
        p_sizes: null,
        p_genders: null,
        p_garment_types: null,
        p_stock_min: 0,
        p_page: 1,
        p_page_size: 1,
      });
      const row = Array.isArray(data) ? data[0] : null;
      return { name, image: row?.representative_image_url ?? null } as CategoryTile;
    })
  );

  return tiles.filter(Boolean);
}