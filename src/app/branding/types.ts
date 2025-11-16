export type BrandingSelectionInput = {
  position: string;
  type: string | null;
  size: string | null;
  colorCount: number;
  comment?: string;
  artwork_url?: string;
};

export type BrandingCompletePayload = {
  stockHeaderId: number;
  selections: BrandingSelectionInput[];
};

export type BrandingMode = 'branded' | 'unbranded';

