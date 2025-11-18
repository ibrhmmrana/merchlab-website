"use client";
import { useEffect, useMemo, useState, useRef } from "react";
import type { ProductGroup, Variant } from "@/lib/data/types";
import { getVariantsForGroup, getColourImagesForGroup } from "@/lib/data/products";
import Image from "next/image";
import { useCartStore } from "@/store/cart";
import VariantModal from "@/components/VariantModal";
import ColorSwatch from "@/components/ColorSwatch";
import { useUiStore } from "@/store/ui";
import { Toast } from "@/components/ui/toast";
import { sortSizes } from "@/lib/sizeUtils";
import BrandingModal from "@/components/branding/BrandingModal";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { BrandingSelection } from "@/types/branding";
import type { BrandingMode } from "@/app/branding/types";
import { useBrandingSheet } from "@/app/branding/BrandingSheetContext";
import { cn } from "@/lib/utils";

// Type guard helper for branding mode
const isBranded = (m: BrandingMode | undefined): m is 'branded' => m === 'branded';

type Props = { group: ProductGroup };

type ColourOption = { name: string; image_url: string | null; sizes: string[] };

// Helper function to generate color-specific SVG images
function generateColorSvg(colorName: string): string {
  const colorMap: { [key: string]: string } = {
    'black': '#000000',
    'white': '#FFFFFF',
    'red': '#FF0000',
    'blue': '#0000FF',
    'green': '#008000',
    'yellow': '#FFFF00',
    'orange': '#FFA500',
    'purple': '#800080',
    'pink': '#FFC0CB',
    'brown': '#A52A2A',
    'gray': '#808080',
    'grey': '#808080',
    'navy': '#000080',
    'maroon': '#800000',
    'olive': '#808000',
    'teal': '#008080',
    'lime': '#00FF00',
    'aqua': '#00FFFF',
    'silver': '#C0C0C0',
    'gold': '#FFD700',
    'beige': '#F5F5DC',
    'tan': '#D2B48C',
    'coral': '#FF7F50',
    'salmon': '#FA8072',
    'khaki': '#F0E68C',
    'indigo': '#4B0082',
    'violet': '#EE82EE',
    'turquoise': '#40E0D0',
    'magenta': '#FF00FF',
    'cyan': '#00FFFF',
    'clear': '#F0F8FF',
    'transparent': '#F0F8FF',
    'neutral': '#F5F5F5',
  };

  const normalizedColor = colorName.toLowerCase().trim();
  const backgroundColor = colorMap[normalizedColor] || '#E5E7EB';
  const firstLetter = colorName.charAt(0).toUpperCase();

  const svg = `
    <svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="${backgroundColor}"/>
      <text x="100" y="120" text-anchor="middle" font-family="Arial, sans-serif" font-size="60" font-weight="bold" fill="white" stroke="rgba(0,0,0,0.3)" stroke-width="2">${firstLetter}</text>
    </svg>
  `;

  return `data:image/svg+xml;base64,${btoa(svg)}`;
}


// Helper function to normalize strings for comparison
const norm = (x?: string | null) => String(x ?? '').trim().toLowerCase();

export default function ProductCard({ group }: Props) {
  const [variants, setVariants] = useState<Variant[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  
  // Debug wrapper for setOpen
  const debugSetOpen = (value: boolean) => {
    console.log("setOpen called with:", value, new Error().stack);
    setOpen(value);
  };
  const [colourMap, setColourMap] = useState<ColourOption[] | null>(null);
  const [coloursLoading, setColoursLoading] = useState(false);

  const add = useCartStore((s) => s.add);
  const openCart = () => useUiStore.getState().openCart();
  
  console.log("ProductCard render:", { add: typeof add, openCart: typeof openCart });

  const [selectedColour, setSelectedColour] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(group.representative_image_url ?? null);
  const colorContainerRef = useRef<HTMLDivElement>(null);
  const sizeContainerRef = useRef<HTMLDivElement>(null);
  const [showToast, setShowToast] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [brandingMode, setBrandingMode] = useState<BrandingMode | undefined>(undefined);
  const [brandingSelections, setBrandingSelections] = useState<BrandingSelection[]>([]);
  const [showBrandingModal, setShowBrandingModal] = useState(false);
  const { openBranding } = useBrandingSheet();

  // When user clicks "Branded"
  function onChooseBranded() {
    setBrandingMode('branded');
    // Don't open modal immediately - wait for Quick Add click
  }

  // When user clicks "Unbranded"
  function onChooseUnbranded() {
    setBrandingMode('unbranded');
    setBrandingSelections([]); // clear any old branded selections
  }

  // Handle branding completion (from modal - keeping for backward compatibility)
  function handleBrandingComplete(selections: BrandingSelection[]) {
    setBrandingSelections(selections);
    setShowBrandingModal(false);
  }

  const sizesForSelected = useMemo(() => {
    const fromMap = colourMap?.find(c => c.name === selectedColour)?.sizes ?? [];
    if (fromMap.length) {
      return sortSizes(fromMap);
    }
    if (!variants || !selectedColour) return [];
    const sizes = Array.from(new Set(variants.filter(v => (v.colour || "").trim() === selectedColour).map(v => v.size!).filter(Boolean)));
    return sortSizes(sizes);
  }, [colourMap, variants, selectedColour]);

  // All available sizes for the product (for hover display)
  const allSizes = useMemo(() => {
    if (group.sizes && group.sizes.length > 0) {
      return sortSizes(group.sizes);
    }
    if (!variants) return [];
    const sizes = Array.from(new Set(variants.map(v => v.size!).filter(Boolean)));
    return sortSizes(sizes);
  }, [group.sizes, variants]);

  // Preselect size if only one is available
  useEffect(() => {
    if (sizesForSelected.length === 1 && !selectedSize) {
      setSelectedSize(sizesForSelected[0]);
    }
  }, [sizesForSelected, selectedSize]);

  // Don't render if product has no stock - moved after all hooks
  if (group.in_stock <= 0) {
    return null;
  }

  async function loadColours() {
    if (colourMap || coloursLoading) return;
    setColoursLoading(true);
    try {
      const rows = await getColourImagesForGroup(group.stock_header_id);
      const opts = rows.map(r => ({ name: (r.colour || "default").trim(), image_url: r.image_url ?? null, sizes: r.sizes ?? [] }));
      setColourMap(opts);
      if (!selectedColour && opts.length) {
        setSelectedColour(opts[0].name);
        setPreview(opts[0].image_url ?? group.representative_image_url ?? null);
      }
    } catch (e) { 
      console.error("Failed to load color images, generating fallback colors:", e);
      // Fallback: generate color-specific images from group.colours
      if (group.colours && group.colours.length > 0) {
        const fallbackOpts = group.colours.map((color) => ({
          name: color,
          image_url: generateColorSvg(color),
          sizes: sortSizes(group.sizes || [])
        }));
        setColourMap(fallbackOpts);
        if (!selectedColour && fallbackOpts.length) {
          setSelectedColour(fallbackOpts[0].name);
          setPreview(fallbackOpts[0].image_url);
        }
      }
    }
    finally { setColoursLoading(false); }
  }

  async function ensureVariants() {
    if (variants || loading) return;
    setLoading(true);
    try {
      const v = await getVariantsForGroup(group.stock_header_id);
      setVariants(v);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }


  async function quickAddIfReady() {
    console.log("quickAddIfReady called", { selectedColour, selectedSize, variants: !!variants, brandingMode, brandingSelections });
    
    // Only proceed if we have the required selections
    if (!selectedColour || !selectedSize) {
      console.log("Missing color or size, returning silently");
      return; // Don't open modal, just return silently
    }
    
    // Find the selected variant to get its ID (norm is defined at component level)
    // Store it before async operations to ensure we have it
    let selectedVariant = variants?.find(
      v => norm(v.colour) === norm(selectedColour) && norm(v.size) === norm(selectedSize)
    );
    
    // If branded, open the branding sheet and wait for selections
    if (brandingMode === 'branded') {
      // Validate we have a variant before proceeding
      if (!selectedVariant) {
        console.error('ProductCard: Cannot open branding - no variant found', {
          selectedColour,
          selectedSize,
          variantsCount: variants?.length,
          availableVariants: variants?.map(v => ({ colour: v.colour, size: v.size, stock_id: v.stock_id }))
        });
        return;
      }
      
      try {
        // Guard: log if stock_header_id looks suspicious
        if (group.stock_header_id < 1000) {
          console.warn('ProductCard: stock_header_id seems too small:', group.stock_header_id);
        }
        
        // Store variant info before async call (these won't change even if state resets)
        const variantBeforeBranding = selectedVariant;
        const colourBeforeBranding = selectedColour;
        const sizeBeforeBranding = selectedSize;
        
        // Generate a temporary itemKey for branding (will be used when item is added to cart)
        // This allows us to save branding selections to the database before the item is in the cart
        const tempItemKey = variantBeforeBranding 
          ? `${variantBeforeBranding.stock_id}-${colourBeforeBranding || 'default'}-${sizeBeforeBranding || 'default'}|b:temp`
          : `temp-${group.stock_header_id}-${Date.now()}`;
        
        const result = await openBranding({
          productId: String(group.stock_header_id),
          productName: group.group_name ?? "Product",
          stockHeaderId: group.stock_header_id,
          variantId: variantBeforeBranding ? String(variantBeforeBranding.stock_id) : undefined,
          colour: colourBeforeBranding ?? undefined,
          size: sizeBeforeBranding ?? undefined,
          quantity: 1,
          itemKey: tempItemKey,
        });
        
        console.log('ProductCard: branding result:', result);
        
        // After user saves branding, recompute selectedVariant in case variants changed
        // Use the stored values to ensure we get the same variant
        // Note: onMouseLeave might have reset selectedColour/selectedSize, so we use stored values
        if (variants && colourBeforeBranding && sizeBeforeBranding) {
          const recomputedVariant = variants.find(
            v => norm(v.colour) === norm(colourBeforeBranding) && norm(v.size) === norm(sizeBeforeBranding)
          );
          if (recomputedVariant) {
            selectedVariant = recomputedVariant;
          }
        }
        
        // If still no variant, use the one we stored before (fallback)
        if (!selectedVariant && variantBeforeBranding) {
          selectedVariant = variantBeforeBranding;
        }
        
        console.log('ProductCard: selectedVariant after branding:', selectedVariant, {
          colourBeforeBranding,
          sizeBeforeBranding,
          currentSelectedColour: selectedColour,
          currentSelectedSize: selectedSize,
          variantsCount: variants?.length,
          variantBeforeBranding: variantBeforeBranding ? { stock_id: variantBeforeBranding.stock_id, colour: variantBeforeBranding.colour, size: variantBeforeBranding.size } : null,
          availableVariants: variants?.map(v => ({ colour: v.colour, size: v.size, stock_id: v.stock_id }))
        });
        
        // After user saves branding, add to cart including branding data
        if (result && result.selections && result.selections.length > 0) {
          if (!selectedVariant) {
            console.error('ProductCard: No selected variant available to add to cart', {
              colourBeforeBranding,
              sizeBeforeBranding,
              variantsCount: variants?.length,
              availableVariants: variants?.map(v => ({ colour: v.colour, size: v.size, stock_id: v.stock_id }))
            });
            return;
          }
          
          // Convert branding selections to the format expected by cart
          const brandingSelections = result.selections.map(sel => ({
            branding_position: sel.position,
            branding_type: sel.type || '',
            branding_size: sel.size || '',
            color_count: sel.colorCount,
            comment: sel.comment,
            artwork_url: sel.artwork_url, // Include artwork_url from upload
            logo_file: sel.logo_file, // Include vectorized SVG URL
          }));
          
          console.debug('[branding] ProductCard cart conversion', {
            selectionsCount: brandingSelections.length,
            selections: brandingSelections.map(s => ({
              position: s.branding_position,
              artwork_url: s.artwork_url,
              logo_file: s.logo_file,
            }))
          });
          
          console.log('ProductCard: Adding to cart with branding:', {
            variant: selectedVariant,
            brandingSelections,
            brandingMode: 'branded'
          });
          
          add({
            ...selectedVariant,
            quantity: 1,
            brandingMode: 'branded',
            branding: brandingSelections,
          });
          
          setShowToast(true);
        } else {
          console.log('ProductCard: No branding selections or user cancelled');
        }
      } catch (error) {
        console.error("Error in branding flow:", error);
      }
      return;
    }
    
    // Unbranded flow continues below
    
    // Start pressing animation
    setIsPressed(true);
    
    // Get the color-specific image
    let colorImageUrl = group.representative_image_url;
    
    // Try to find the color-specific image from colourMap
    if (colourMap) {
      const colorOption = colourMap.find(c => c.name === selectedColour);
      if (colorOption?.image_url) {
        colorImageUrl = colorOption.image_url;
      }
    }
    
    // If no color-specific image found, generate one
    if (!colorImageUrl || colorImageUrl === group.representative_image_url) {
      colorImageUrl = generateColorSvg(selectedColour);
    }
    
    // Ensure variants are loaded (fetch if needed)
    if (!variants || variants.length === 0) {
      await ensureVariants();
    }

    // Check if variants are still empty after loading
    if (!variants || variants.length === 0) {
      console.error('No variants available for group', { 
        groupId: group.stock_header_id, 
        selectedColour, 
        selectedSize,
        variantsCount: variants?.length || 0
      });
      
      // Show user-friendly error
      alert('Unable to load product variants. Please try again or contact support.');
      return;
    }

    // Match the real variant by colour + size (norm already defined above)
    const realVariant =
      variants?.find(v => norm(v.colour) === norm(selectedColour) && norm(v.size) === norm(selectedSize))
      // fallback: if size not chosen yet, match by colour only and pick first size
      ?? variants?.find(v => norm(v.colour) === norm(selectedColour))
      // last resort: first available variant
      ?? variants?.[0];

    if (!realVariant) {
      console.error('No variant found for selection', { 
        groupId: group.stock_header_id, 
        selectedColour, 
        selectedSize,
        availableVariants: variants?.map(v => ({ colour: v.colour, size: v.size }))
      });
      return;
    }

    // DEV guard: ensure stock_id is real and not the header
    if (!realVariant.stock_id || realVariant.stock_id === realVariant.stock_header_id) {
      console.warn('BAD VARIANT IDS (ProductCard) — stock_id equals header', {
        stock_id: realVariant.stock_id,
        stock_header_id: realVariant.stock_header_id,
        colour: realVariant.colour,
        size: realVariant.size,
      });
    }

    // Temporary log for debugging
    console.log('ADD_TO_CART variant ids', {
      stock_id: realVariant.stock_id,
      stock_header_id: realVariant.stock_header_id,
      colour: realVariant.colour,
      size: realVariant.size,
    });

    // Add to cart with the exact variant object and branding info
    try {
      add({ 
        ...realVariant, 
        quantity: 1,
        brandingMode: brandingMode ?? undefined,
        branding: isBranded(brandingMode) ? brandingSelections : undefined,
      });
      console.log("Successfully added to cart - no popup needed");
      setShowToast(true);
      
      // Optional: reset branding choices after adding
      // setBrandingMode(null);
      // setBrandingSelections([]);
    } catch (error) {
      console.error("Error adding to cart:", error);
    }
    
    // End pressing animation after a short delay
    setTimeout(() => {
      setIsPressed(false);
    }, 150);
  }

  // Handle carousel navigation for colors
  const scrollColorLeft = () => {
    console.log("scrollColorLeft called");
    if (colorContainerRef.current) {
      console.log("Color container ref found, scrolling left");
      const scrollAmount = 150; // Smaller scroll amount
      colorContainerRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      console.log("Scrolling colors left");
    } else {
      console.log("Color container ref not found");
    }
  };

  const scrollColorRight = () => {
    console.log("scrollColorRight called");
    if (colorContainerRef.current) {
      console.log("Color container ref found, scrolling right");
      const scrollAmount = 150; // Smaller scroll amount
      colorContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      console.log("Scrolling colors right");
    } else {
      console.log("Color container ref not found");
    }
  };

  // Handle carousel navigation for sizes
  const scrollSizeLeft = () => {
    console.log("scrollSizeLeft called");
    if (sizeContainerRef.current) {
      console.log("Size container ref found, scrolling left");
      const scrollAmount = 150; // Smaller scroll amount
      sizeContainerRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      console.log("Scrolling sizes left");
    } else {
      console.log("Size container ref not found");
    }
  };

  const scrollSizeRight = () => {
    console.log("scrollSizeRight called");
    if (sizeContainerRef.current) {
      console.log("Size container ref found, scrolling right");
      const scrollAmount = 150; // Smaller scroll amount
      sizeContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      console.log("Scrolling sizes right");
    } else {
      console.log("Size container ref not found");
    }
  };

  // Handle keyboard navigation for color swatches
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!colourMap || colourMap.length === 0) return;
    
    const currentIndex = colourMap.findIndex(c => c.name === selectedColour);
    if (currentIndex === -1) return;

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : colourMap.length - 1;
      const prevColor = colourMap[prevIndex];
      setSelectedColour(prevColor.name);
      const prevPreviewImage = prevColor.image_url ?? generateColorSvg(prevColor.name);
      setPreview(prevPreviewImage);
      setSelectedSize(null);
      setBrandingMode(undefined);
      setBrandingSelections([]);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIndex = currentIndex < colourMap.length - 1 ? currentIndex + 1 : 0;
      const nextColor = colourMap[nextIndex];
      setSelectedColour(nextColor.name);
      const nextPreviewImage = nextColor.image_url ?? generateColorSvg(nextColor.name);
      setPreview(nextPreviewImage);
      setSelectedSize(null);
      setBrandingMode(undefined);
      setBrandingSelections([]);
    }
  };

  return (
    <div className="luxury-product-card group" onMouseEnter={() => { setIsHovered(true); loadColours(); ensureVariants(); }} onMouseLeave={() => { setIsHovered(false); setSelectedColour(null); setSelectedSize(null); setBrandingMode('unbranded'); setBrandingSelections([]); }}>
      <div className="aspect-square relative bg-gray-50 overflow-hidden">
        {preview ? (
          <Image
            src={preview}
            alt={group.group_name ?? "Product"}
            fill
            sizes="(max-width:768px) 50vw, (max-width:1200px) 25vw, 20vw"
            className="product-image object-contain"
            priority={false}
          />
        ) : null}
        <div className="product-overlay"></div>
      </div>

      <div className="p-3">
        <div className="text-sm text-muted-foreground">{group.brand}</div>
        {group.stock_code && (
          <div className="text-sm font-medium text-gray-700">{group.stock_code}</div>
        )}
        <div className="font-medium leading-tight">{group.group_name}</div>

        {/* Stock information - always visible */}
        <div className="mt-2 flex gap-2">
          {group.in_stock > 0 && (
            <span className="text-xs border border-gray-300 px-2 py-1 rounded">
              In stock: {group.in_stock}
            </span>
          )}
        </div>

         {/* Color swatches carousel - only show when colors are loaded and hovering */}
         {(isHovered && colourMap && colourMap.length > 0) && (
           <div className="mt-3">
             <div className="flex items-center gap-2">
               {/* Left navigation arrow - only show if there are multiple colors */}
               {colourMap.length > 3 && (
                 <button
                   onClick={(e) => {
                     e.preventDefault();
                     e.stopPropagation();
                     console.log("Color left arrow clicked");
                     scrollColorLeft();
                   }}
                   className="flex-shrink-0 w-8 h-8 rounded-full border border-gray-300 bg-white hover:bg-gray-50 flex items-center justify-center z-10 relative"
                   aria-label="Scroll left"
                   type="button"
                 >
                   <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                   </svg>
                 </button>
               )}

               {/* Color swatches container */}
               <div 
                 ref={colorContainerRef}
                 className="flex gap-2 overflow-x-auto scrollbar-hide flex-1"
                 onKeyDown={handleKeyDown}
                 tabIndex={0}
                 style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
               >
                 {colourMap.map((c) => (
                   <ColorSwatch
                     key={c.name}
                     src={c.image_url}
                     label={c.name}
                     selected={selectedColour === c.name}
                    onClick={() => { 
                      console.log("Color clicked:", c.name);
                      setSelectedColour(c.name); 
                      const previewImage = c.image_url ?? generateColorSvg(c.name);
                      setPreview(previewImage); 
                      setSelectedSize(null);
                      setBrandingMode('unbranded');
                      setBrandingSelections([]);
                    }}
                     size={35}
                   />
              ))}
            </div>

               {/* Right navigation arrow - only show if there are multiple colors */}
               {colourMap.length > 3 && (
                 <button
                   onClick={(e) => {
                     e.preventDefault();
                     e.stopPropagation();
                     console.log("Color right arrow clicked");
                     scrollColorRight();
                   }}
                   className="flex-shrink-0 w-8 h-8 rounded-full border border-gray-300 bg-white hover:bg-gray-50 flex items-center justify-center z-10 relative"
                   aria-label="Scroll right"
                   type="button"
                 >
                   <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                   </svg>
                 </button>
               )}
             </div>
           </div>
         )}

        {/* Size selection carousel - only show when hovering and sizes are available */}
        {isHovered && allSizes.length > 0 && (
          <div className="mt-3">
            <div className="flex items-center gap-2">
              {/* Left navigation arrow - only show if there are multiple sizes */}
              {allSizes.length > 4 && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("Size left arrow clicked");
                    scrollSizeLeft();
                  }}
                  className="flex-shrink-0 w-8 h-8 rounded-full border border-gray-300 bg-white hover:bg-gray-50 flex items-center justify-center z-10 relative"
                  aria-label="Scroll left"
                  type="button"
                >
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}

              {/* Size buttons container */}
              <div 
                ref={sizeContainerRef}
                className="flex gap-2 overflow-x-auto scrollbar-hide flex-1"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {allSizes.map((s) => (
                  <button
                    key={s}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log("Size clicked:", s);
                      setSelectedSize(s);
                      setBrandingMode(undefined);
                      setBrandingSelections([]);
                    }}
                    className={`px-3 py-1 text-xs rounded-full border flex-shrink-0 z-10 relative ${
                      selectedSize === s ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 hover:border-gray-400"
                    }`}
                    type="button"
                  >
                    {s}
                  </button>
              ))}
            </div>

              {/* Right navigation arrow - only show if there are multiple sizes */}
              {allSizes.length > 4 && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("Size right arrow clicked");
                    scrollSizeRight();
                  }}
                  className="flex-shrink-0 w-8 h-8 rounded-full border border-gray-300 bg-white hover:bg-gray-50 flex items-center justify-center z-10 relative"
                  aria-label="Scroll right"
                  type="button"
                >
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
          </div>
        </div>
        )}

        {/* Quick Add button - only show when hovering */}
        {isHovered && (
        <div className="mt-3">
          {/* Branding selector - ToggleGroup */}
          <div className="flex items-center justify-between mb-2 relative z-10">
            <div className="flex gap-1.5 w-full rounded-md border border-gray-300 p-0.5 bg-white sm:rounded-lg sm:border-2 sm:p-1 sm:gap-2 sm:bg-gray-50">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChooseUnbranded();
                }}
                className={cn(
                  "flex-1 px-2 py-1.5 text-[10px] font-semibold rounded transition-all relative flex items-center justify-center gap-1 min-h-[30px]",
                  "sm:px-4 sm:py-2.5 sm:text-xs sm:min-h-0",
                  brandingMode === "unbranded" 
                    ? "bg-primary text-white shadow-md ring-1 ring-primary/20" 
                    : "text-gray-600 hover:text-gray-800 hover:bg-gray-50 bg-transparent active:bg-gray-100"
                )}
              >
                {brandingMode === "unbranded" && (
                  <svg className="w-3 h-3 text-white sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                <span>Unbranded</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChooseBranded();
                }}
                className={cn(
                  "flex-1 px-2 py-1.5 text-[10px] font-semibold rounded transition-all relative flex items-center justify-center gap-1 min-h-[30px]",
                  "sm:px-4 sm:py-2.5 sm:text-xs sm:min-h-0",
                  brandingMode === "branded" 
                    ? "bg-primary text-white shadow-md ring-1 ring-primary/20" 
                    : "text-gray-600 hover:text-gray-800 hover:bg-gray-50 bg-transparent active:bg-gray-100"
                )}
              >
                {brandingMode === "branded" && (
                  <svg className="w-3 h-3 text-white sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                <span>Branded</span>
              </button>
            </div>
          </div>
          
          <button 
            disabled={loading || !selectedColour || !selectedSize} 
            onClick={(e) => {
              e.stopPropagation();
              console.log("Button clicked!", { selectedColour, selectedSize, loading, brandingMode });
              quickAddIfReady();
            }} 
            className={`luxury-btn w-full ${
              isPressed 
                ? 'scale-95 shadow-inner' 
                : 'scale-100'
            } ${loading || !selectedColour || !selectedSize ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? "Loading…" : isPressed ? "Adding..." : brandingMode === "branded" ? "Customize & Add" : "Quick Add To Cart"}
          </button>
        </div>
        )}
      </div>

      <VariantModal
        open={open}
        onOpenChange={debugSetOpen}
        loading={loading}
        variants={variants ?? []}
        onAdd={(v) => { add({ ...v, quantity: 1 }); setShowToast(true); }}
        title={group.group_name ?? "Select variant"}
        initialPreview={preview ?? undefined}
      />
      
      <Toast open={showToast} onOpenChange={setShowToast}>
        Added to cart!
      </Toast>
      
      {/* Branding Modal */}
      {(() => {
        // Get stock_header_id from selected variant or fall back to product group
        let stockHeaderId: number | undefined;
        
        if (selectedColour && selectedSize && variants) {
          const selectedVariant = variants.find(
            v => norm(v.colour) === norm(selectedColour) && norm(v.size) === norm(selectedSize)
          );
          stockHeaderId = selectedVariant?.stock_header_id;
        }
        
        // Fallback to product group's stock_header_id
        if (!stockHeaderId) {
          stockHeaderId = group.stock_header_id;
        }
        
        return (
          <BrandingModal
            open={showBrandingModal}
            onClose={() => setShowBrandingModal(false)}
            stockHeaderId={stockHeaderId}
            onComplete={handleBrandingComplete}
          />
        );
      })()}
    </div>
  );
}
