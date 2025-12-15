"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCartStore } from "@/store/cart";
import type { Variant } from "@/lib/data/types";
import type { BrandingSelection } from "@/types/branding";
import { getVariantsForGroup } from "@/lib/data/products";

interface AddQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Validate quote number format
 * Accepts: ML-[5 char string] or Q[3 digits]-[5 char string]
 */
function isValidQuoteNumber(quoteNo: string): boolean {
  const cleaned = quoteNo.trim().toUpperCase();
  const mlPattern = /^ML-[A-Z0-9]{5}$/;
  const qPattern = /^Q\d{3}-[A-Z0-9]{5}$/;
  return mlPattern.test(cleaned) || qPattern.test(cleaned);
}

/**
 * Convert quote branding to cart BrandingSelection format
 * Handles both "branding" and "brandingItems" field names
 */
function convertBrandingItems(brandingData: unknown[]): BrandingSelection[] {
  return brandingData
    .filter((bi): bi is Record<string, unknown> => 
      typeof bi === 'object' && bi !== null
    )
    .map((bi) => {
      // Handle logoFile - can be array, string, or null
      let logoFile: string | undefined;
      const logoFileValue = bi.logoFile || bi.logo_file;
      if (logoFileValue) {
        if (Array.isArray(logoFileValue) && logoFileValue.length > 0) {
          logoFile = String(logoFileValue[0]);
        } else if (typeof logoFileValue === 'string' && logoFileValue.trim()) {
          logoFile = logoFileValue;
        }
      }

      // Handle artwork_url as fallback if logoFile is not available
      if (!logoFile) {
        const artworkUrl = bi.artwork_url || bi.artworkUrl;
        if (artworkUrl && typeof artworkUrl === 'string' && artworkUrl.trim()) {
          logoFile = artworkUrl;
        }
      }

      return {
        branding_position: String(bi.brandingPosition || bi.branding_position || ''),
        branding_type: String(bi.brandingType || bi.branding_type || ''),
        branding_size: String(bi.brandingSize || bi.branding_size || ''),
        color_count: typeof bi.colourCount === 'number' 
          ? bi.colourCount 
          : typeof bi.colorCount === 'number'
          ? bi.colorCount
          : typeof bi.color_count === 'number'
          ? bi.color_count
          : typeof bi.colour_count === 'number'
          ? bi.colour_count
          : 1,
        logo_file: logoFile,
        artwork_url: bi.artwork_url || bi.artworkUrl ? String(bi.artwork_url || bi.artworkUrl) : undefined,
        comment: bi.comment ? String(bi.comment) : undefined,
      };
    });
}

/**
 * Convert quote item to cart item Variant
 */
async function convertQuoteItemToVariant(
  item: Record<string, unknown>
): Promise<Variant | null> {
  const stockId = item.stockId || item.stock_id;
  const stockHeaderId = item.stockHeaderId || item.stock_header_id;

  if (!stockId || !stockHeaderId) {
    console.warn('Quote item missing stockId or stockHeaderId:', item);
    return null;
  }

  // Try to fetch variant data if missing fields
  let variantData: Variant | null = null;
  
  try {
    const variants = await getVariantsForGroup(Number(stockHeaderId));
    const colour = item.colour ? String(item.colour) : null;
    const size = item.size ? String(item.size) : null;
    
    // Find matching variant by colour and size
    const matchingVariant = variants.find(v => {
      const vColour = v.colour?.toLowerCase().trim();
      const vSize = v.size?.toLowerCase().trim();
      const itemColour = colour?.toLowerCase().trim();
      const itemSize = size?.toLowerCase().trim();
      
      return vColour === itemColour && vSize === itemSize;
    });

    if (matchingVariant) {
      variantData = matchingVariant;
    } else if (variants.length > 0) {
      // Fallback to first variant if exact match not found
      variantData = variants[0];
    }
  } catch (error) {
    console.error('Error fetching variants:', error);
  }

  // Build variant from quote item data, merging with fetched variant data
  const variant: Variant = {
    stock_id: Number(stockId),
    stock_header_id: Number(stockHeaderId),
    stock_code: (item.stockCode || item.stock_code || item.itemNumber || item.item_number || '') as string,
    description: (item.description || '') as string,
    colour: (item.colour ? String(item.colour) : variantData?.colour || null) as string | null,
    size: (item.size ? String(item.size) : variantData?.size || null) as string | null,
    color_status: (item.colorStatus || item.color_status || variantData?.color_status || null) as string | null,
    base_price: typeof item.basePrice === 'number' 
      ? item.basePrice 
      : typeof item.base_price === 'number'
      ? item.base_price
      : variantData?.base_price || null,
    discounted_price: typeof item.discountedPrice === 'number'
      ? item.discountedPrice
      : typeof item.discounted_price === 'number'
      ? item.discounted_price
      : variantData?.discounted_price || null,
    royalty_factor: typeof item.royaltyFactor === 'number'
      ? item.royaltyFactor
      : typeof item.royalty_factor === 'number'
      ? item.royalty_factor
      : variantData?.royalty_factor || null,
    image_url: (item.productColourImage || item.product_colour_image || item.image_url || variantData?.image_url || null) as string | null,
    qty_available: typeof item.qtyAvailable === 'number'
      ? item.qtyAvailable
      : typeof item.qty_available === 'number'
      ? item.qty_available
      : variantData?.qty_available || 0,
    brand: (item.brand || item.supplier || variantData?.brand || null) as string | null,
    category: (item.category || variantData?.category || null) as string | null,
    type: (item.type || variantData?.type || null) as string | null,
    gender: (item.gender || variantData?.gender || null) as string | null,
    garment_type: (item.garmentType || item.garment_type || variantData?.garment_type || null) as string | null,
    weight_per_unit: typeof item.weightPerUnit === 'number'
      ? item.weightPerUnit
      : typeof item.weight_per_unit === 'number'
      ? item.weight_per_unit
      : variantData?.weight_per_unit || null,
  };

  return variant;
}

export default function AddQuoteDialog({ open, onOpenChange }: AddQuoteDialogProps) {
  const router = useRouter();
  const [quoteNumber, setQuoteNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [quoteLoaded, setQuoteLoaded] = useState(false);
  const addToCart = useCartStore((state) => state.add);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedQuote = quoteNumber.trim();
    
    if (!trimmedQuote) {
      setError("Please enter a quote number");
      return;
    }

    // Validate format
    if (!isValidQuoteNumber(trimmedQuote)) {
      setError("Invalid quote number format. Expected ML-XXXXX or QXXX-XXXXX");
      return;
    }

    setLoading(true);

    try {
      // Fetch quote data
      const response = await fetch(`/api/quote/${encodeURIComponent(trimmedQuote)}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to fetch quote" }));
        throw new Error(errorData.error || `Failed to fetch quote: ${response.statusText}`);
      }

      const quoteData = await response.json();
      const payload = quoteData.payload;

      if (!payload || !payload.items || !Array.isArray(payload.items)) {
        throw new Error("Quote does not contain items");
      }

      // Extract item-level data for markup calculation
      const itemMetadata: Array<{
        stock_id: number;
        stock_header_id: number;
        colour: string | null;
        size: string | null;
        line_total: number;
        base_price: number;
        quantity: number;
        branding_costs: number; // unitPrice * quantity + setupFee
      }> = [];

      // Extract customer and shipping address from quote
      const customer = payload.customer || quoteData.customer || null;
      const shippingAddress = payload.shipping_address || payload.shippingAddress || null;
      
      // Store quote metadata for use in build-quote page
      const quoteMetadata = {
        markup_rate: payload.markup_rate || payload.markupRate || null,
        totals: payload.totals || null,
        delivery_fee: payload.delivery_fee || payload.deliveryFee || 0,
        quoteNo: quoteData.quoteNo,
        items: itemMetadata, // Will be populated below
        customer: customer ? {
          firstName: String(customer.first_name || customer.firstName || ''),
          lastName: String(customer.last_name || customer.lastName || ''),
          email: String(customer.email || ''),
          phone: String(customer.phone || '').replace(/^\+27/, '').replace(/^27/, ''), // Remove country code if present
          company: String(customer.company || ''),
        } : null,
        shippingAddress: shippingAddress ? {
          street: shippingAddress.street || '',
          suburb: shippingAddress.suburb || '',
          city: shippingAddress.city || '',
          province: shippingAddress.province || '',
          postalCode: shippingAddress.postal_code || shippingAddress.postalCode || '',
          country: shippingAddress.country || 'South Africa',
        } : null,
      };
      
      // Process items to extract metadata
      const items = payload.items as Array<Record<string, unknown>>;
      for (const item of items) {
        const stockId = item.stockId || item.stock_id;
        const stockHeaderId = item.stockHeaderId || item.stock_header_id;
        const lineTotal = typeof item.line_total === 'number' ? item.line_total : 0;
        const basePrice = typeof item.base_price === 'number' ? item.base_price : 0;
        const qty = typeof item.requested_qty === 'number' ? item.requested_qty : typeof item.quantity === 'number' ? item.quantity : 1;
        
        // Calculate branding costs
        const brandingData = item.branding || item.brandingItems || item.branding_items;
        let brandingCosts = 0;
        if (Array.isArray(brandingData) && brandingData.length > 0) {
          brandingData.forEach((bi: Record<string, unknown>) => {
            const unitPrice = typeof bi.unitPrice === 'number' ? bi.unitPrice : 0;
            brandingCosts += unitPrice * qty;
          });
          // Setup fee is added once per item (not per branding)
          const firstBranding = brandingData[0] as Record<string, unknown>;
          const setupFee = typeof firstBranding.setupFee === 'number' ? firstBranding.setupFee : 0;
          brandingCosts += setupFee;
        }
        
        if (stockId && stockHeaderId) {
          itemMetadata.push({
            stock_id: Number(stockId),
            stock_header_id: Number(stockHeaderId),
            colour: item.colour ? String(item.colour) : null,
            size: item.size ? String(item.size) : null,
            line_total: lineTotal,
            base_price: basePrice,
            quantity: qty,
            branding_costs: brandingCosts,
          });
        }
      }
      
      // Update quoteMetadata with items
      quoteMetadata.items = itemMetadata;
      
      // Store in localStorage so build-quote page can access it
      if (typeof window !== 'undefined') {
        localStorage.setItem('merchlab-quote-metadata', JSON.stringify(quoteMetadata));
      }

      let addedCount = 0;
      let skippedCount = 0;

      // Convert and add each item to cart
      for (const item of items) {
        try {
          // Get quantity - check multiple possible field names and formats
          let quantity = 1;
          if (typeof item.quantity === 'number') {
            quantity = item.quantity;
          } else if (typeof item.quantity === 'string') {
            const parsed = parseInt(item.quantity, 10);
            if (!isNaN(parsed) && parsed > 0) {
              quantity = parsed;
            }
          } else if (typeof item.requested_qty === 'number') {
            quantity = item.requested_qty;
          } else if (typeof item.requestedQty === 'number') {
            quantity = item.requestedQty;
          } else if (typeof item.requested_qty === 'string') {
            const parsed = parseInt(item.requested_qty, 10);
            if (!isNaN(parsed) && parsed > 0) {
              quantity = parsed;
            }
          } else if (typeof item.requestedQty === 'string') {
            const parsed = parseInt(item.requestedQty, 10);
            if (!isNaN(parsed) && parsed > 0) {
              quantity = parsed;
            }
          }
          
          // Ensure quantity is at least 1
          if (quantity < 1) {
            quantity = 1;
          }

          // Debug log to help identify quantity field
          if (process.env.NODE_ENV === 'development') {
            console.log('Quote item quantity extraction:', {
              quantity,
              'item.quantity': item.quantity,
              'item.requested_qty': item.requested_qty,
              'item.requestedQty': item.requestedQty,
              allKeys: Object.keys(item),
            });
          }

          const variant = await convertQuoteItemToVariant(item);
          
          if (!variant) {
            console.warn('Skipping item - could not convert to variant:', item);
            skippedCount++;
            continue;
          }

          // Extract branding items if present - check both "branding" and "brandingItems" field names
          const brandingData = item.branding || item.brandingItems || item.branding_items;
          const hasBranding = Array.isArray(brandingData) && brandingData.length > 0;
          
          const branding: BrandingSelection[] = hasBranding
            ? convertBrandingItems(brandingData)
            : [];

          // Add to cart
          const cartItem = {
            ...variant,
            quantity,
            brandingMode: (hasBranding ? 'branded' : 'unbranded') as 'branded' | 'unbranded',
            branding: branding.length > 0 ? branding : undefined,
          };

          if (process.env.NODE_ENV === 'development') {
            console.log('Adding to cart:', {
              description: variant.description,
              quantity,
              stock_id: variant.stock_id,
              colour: variant.colour,
              size: variant.size,
            });
          }

          addToCart(cartItem);

          addedCount++;
        } catch (itemError) {
          console.error('Error adding item to cart:', itemError);
          skippedCount++;
        }
      }

      if (addedCount === 0) {
        throw new Error("No items could be added to cart");
      }

      setSuccess(
        `Successfully added ${addedCount} item${addedCount !== 1 ? 's' : ''} to cart` +
        (skippedCount > 0 ? ` (${skippedCount} skipped)` : '')
      );
      setQuoteLoaded(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load quote";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset state when closing
      setQuoteNumber("");
      setError(null);
      setSuccess(null);
      setQuoteLoaded(false);
    }
    onOpenChange(newOpen);
  };

  const handleViewCart = () => {
    onOpenChange(false);
    router.push('/build-quote');
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Existing Quote</DialogTitle>
          <DialogDescription>
            Enter a quote number to add all items from that quote to your cart.
            Format: ML-XXXXX or QXXX-XXXXX
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="text"
              placeholder="Quote Number"
              value={quoteNumber}
              onChange={(e) => setQuoteNumber(e.target.value)}
              disabled={loading}
              className="case"
              autoFocus
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          {success && (
            <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md">
              {success}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            {quoteLoaded ? (
              <Button type="button" onClick={handleViewCart}>
                View Cart
              </Button>
            ) : (
              <Button type="submit" disabled={loading}>
                {loading ? "Loading..." : "Add to Cart"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

