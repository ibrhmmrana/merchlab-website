"use client";
import { useEffect, useMemo, useState, useRef } from "react";
import type { ProductGroup, Variant } from "@/lib/data/types";
import { getVariantsForGroup, getColourImagesForGroup } from "@/lib/data/products";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/store/cart";
import VariantModal from "@/components/VariantModal";
import ColorSwatch from "@/components/ColorSwatch";
import { useUiStore } from "@/store/ui";
import { Toast } from "@/components/ui/toast";
import { sortSizes } from "@/lib/sizeUtils";

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

function buildColourOptions(variants: Variant[]): ColourOption[] {
  const map = new Map<string, ColourOption>();
  for (const v of variants) {
    const key = (v.colour || "default").trim();
    const cur = map.get(key);
    if (cur) {
      if (v.size && !cur.sizes.includes(v.size)) cur.sizes.push(v.size);
      // prefer a non-null image_url
      if (!cur.image_url && v.image_url) cur.image_url = v.image_url;
    } else {
      map.set(key, { name: key, image_url: v.image_url ?? null, sizes: v.size ? [v.size] : [] });
    }
  }
  
  // Sort sizes for each color option
  const options = Array.from(map.values());
  options.forEach(option => {
    option.sizes = sortSizes(option.sizes);
  });
  
  return options.sort((a, b) => a.name.localeCompare(b.name));
}

export default function ProductCard({ group }: Props) {
  // Don't render if product has no stock
  if (group.in_stock <= 0) {
    return null;
  }

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
  const [scrollPosition, setScrollPosition] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

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
        const fallbackOpts = group.colours.map((color, index) => ({
          name: typeof color === 'string' ? color : (color?.value || color?.name || String(color)),
          image_url: generateColorSvg(typeof color === 'string' ? color : (color?.value || color?.name || String(color))),
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
    console.log("quickAddIfReady called", { selectedColour, selectedSize, variants: !!variants });
    
    // Only proceed if we have the required selections
    if (!selectedColour || !selectedSize) {
      console.log("Missing color or size, returning silently");
      return; // Don't open modal, just return silently
    }
    
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

    // Normalise helpers
    const norm = (x?: string | null) => String(x ?? '').trim().toLowerCase();

    // Match the real variant by colour + size
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

    // Add to cart with the exact variant object
    try {
      add({ ...realVariant, quantity: 1 });
      console.log("Successfully added to cart - no popup needed");
      setShowToast(true);
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
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIndex = currentIndex < colourMap.length - 1 ? currentIndex + 1 : 0;
      const nextColor = colourMap[nextIndex];
      setSelectedColour(nextColor.name);
      const nextPreviewImage = nextColor.image_url ?? generateColorSvg(nextColor.name);
      setPreview(nextPreviewImage);
      setSelectedSize(null);
    }
  };

  return (
    <div className="luxury-product-card group" onMouseEnter={() => { setIsHovered(true); loadColours(); ensureVariants(); }} onMouseLeave={() => { setIsHovered(false); setSelectedColour(null); setSelectedSize(null); }}>
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
          <button 
            disabled={loading || !selectedColour || !selectedSize} 
            onClick={() => {
              console.log("Button clicked!", { selectedColour, selectedSize, loading });
              quickAddIfReady();
            }} 
            className={`luxury-btn w-full ${
              isPressed 
                ? 'scale-95 shadow-inner' 
                : 'scale-100'
            } ${loading || !selectedColour || !selectedSize ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? "Loading…" : isPressed ? "Adding..." : "Quick Add To Cart"}
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
    </div>
  );
}