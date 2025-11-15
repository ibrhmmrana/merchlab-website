export interface BrandingSelection {
  branding_position: string;
  branding_type: string;
  branding_size: string;
  color_count: number;      // 1–10 for Screen Printing, 1 for others (already enforced in modal)
  artwork_url?: string;
  comment?: string;
}

export type BrandingMode = 'branded' | 'unbranded';

