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

export type BrandingMode = 'branded' | 'unbranded';

