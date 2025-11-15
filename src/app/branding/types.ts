export type BrandingSelectionInput = {
  position: string;
  type: string | null;
  size: string | null;
  colorCount: number;
  comment?: string;
};

export type BrandingCompletePayload = {
  stockHeaderId: number;
  selections: BrandingSelectionInput[];
};

