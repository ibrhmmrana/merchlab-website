export type ProductGroup = {
  stock_header_id: number;
  stock_code: string | null;
  brand: string | null;
  category: string | null;
  type: string | null;
  group_name: string | null;
  representative_image_url: string | null;
  colours: string[] | null;
  sizes: string[] | null;
  in_stock: number;
  incoming: number;
  variant_count: number;
  total_count: number; // window count
};

export type Variant = {
  stock_id: number;
  stock_header_id: number;
  stock_code: string;
  description: string;
  colour: string | null;
  size: string | null;
  color_status: string | null;
  base_price: number | null;
  discounted_price: number | null;
  royalty_factor: number | null;
  image_url: string | null;
  qty_available: number;
  brand: string | null;
  category: string | null;
  type: string | null;
  gender: string | null;
  garment_type: string | null;
  weight_per_unit: number | null;
  // Aliases for compatibility
  stockId?: number;
  stockHeaderId?: number;
};

export type Facets = {
  categories: string[] | null;
  types: string[] | null;
  brands: string[] | null;
  colours: string[] | null;
  sizes: string[] | null;
  genders: string[] | null;
  garment_types: string[] | null;
  stock_min: number;
  stock_max: number;
};