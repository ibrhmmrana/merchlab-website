export type BrandingSelectionInput = {
  position: string;
  type: string | null;
  size: string | null;
  colorCount: number;
  comment?: string;
  artwork_url?: string; // Original raster image URL
  logo_file?: string; // Vectorized SVG URL
};

export type BrandingCompletePayload = {
  stockHeaderId: number;
  selections: BrandingSelectionInput[];
};

/** When completing bulk branding (multiple items from Add by size) */
export type BulkBrandingCompletePayload = {
  bulk: true;
  items: Array<{
    variantId: string;
    colour?: string;
    size?: string;
    quantity: number;
    selections: BrandingSelectionInput[];
  }>;
};

export type BrandingMode = 'branded' | 'unbranded';

export type BrandingBulkItem = {
  variantId: string;
  colour?: string;
  size?: string;
  quantity: number;
  imageUrl: string;
};

