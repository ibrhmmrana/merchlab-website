export interface BrandingSelection {
  branding_position: string;
  branding_type: string;
  branding_size: string;
  color_count: number;      // 1–10 for Screen Printing, 1 for others (already enforced in modal)
  artwork_url?: string; // Original raster image URL
  logo_file?: string; // Vectorized SVG URL
  comment?: string;
}

export type BrandingMode = 'branded' | 'unbranded';

