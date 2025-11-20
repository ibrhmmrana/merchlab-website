"use client";

import { useCartStore, getCartItemKey, isBranded, type CartItem } from "@/store/cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useHasHydrated } from "@/lib/hooks/useHasHydrated";
import SmartImage from "@/components/SmartImage";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import type { ParsedAddress } from "@/lib/utils/places";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { getOrCreateSessionToken } from "@/lib/session";
import { fetchQuoteBrandingSelections, type QuoteBrandingSelection } from "@/lib/branding";

type EditableItem = CartItem & {
  customPrice?: number;
  customMargin?: number;
};

const VAT_RATE = 0.15; // 15% VAT

function getHexCodeForColour(colour: string | null | undefined): string | null {
  if (!colour) return null;
  const colourMap: Record<string, string> = {
    "Black": "#000000", "White": "#FFFFFF", "Navy": "#000080", "Royal Blue": "#4169E1",
    "Red": "#FF0000", "Maroon": "#800000", "Green": "#008000", "Forest Green": "#228B22",
    "Grey": "#808080", "Charcoal": "#36454F", "Brown": "#A52A2A", "Khaki": "#C3B091",
    "Orange": "#FFA500", "Yellow": "#FFFF00", "Pink": "#FFC0CB", "Purple": "#800080",
    "Burgundy": "#800020", "Teal": "#008080", "Lime": "#00FF00", "Sky Blue": "#87CEEB",
    "Tan": "#D2B48C", "Beige": "#F5F5DC", "Cream": "#FFFDD0", "Olive": "#808000",
    "Silver": "#C0C0C0", "Gold": "#FFD700",
  };
  return colourMap[colour] || "#000000";
}

export default function BuildQuoteClient() {
  const hydrated = useHasHydrated();
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const brandedItems = useCartStore((s) => s.brandedItems);
  const unbrandedItems = useCartStore((s) => s.unbrandedItems);
  const activeCartGroup = useCartStore((s) => s.activeCartGroup);
  const setActiveCartGroup = useCartStore((s) => s.setActiveCartGroup);
  const updateQty = useCartStore((s) => s.updateQty);
  const remove = useCartStore((s) => s.remove);

  const activeItems = activeCartGroup === 'branded' ? brandedItems : unbrandedItems;
  
  // Editable items with custom prices and margins
  const [editableItems, setEditableItems] = useState<Map<string, EditableItem>>(new Map());
  
  // Branding pricing cache: stockHeaderId -> pricing data
  const [brandingPricing, setBrandingPricing] = useState<Map<number, Array<{
    stockHeaderId: number;
    brandingType: string;
    brandingPosition: string;
    brandingSize: string;
    colourCount: number;
    unitPrice: number;
    setupFee: number;
  }>>>(new Map());

  // Create a dependency string that changes when quantities change
  const itemsHash = activeItems.map(item => `${getCartItemKey(item)}:${item.quantity}`).join('|');

  // Initialize and sync editable items from cart
  useEffect(() => {
    setEditableItems(prev => {
      const newMap = new Map<string, EditableItem>();
      activeItems.forEach(item => {
        const key = getCartItemKey(item);
        const existing = prev.get(key);
        newMap.set(key, {
          ...item,
          // Preserve custom price/margin if item still exists, otherwise use defaults
          customPrice: existing?.customPrice ?? (item.discounted_price || item.base_price || 0),
          customMargin: existing?.customMargin ?? 0,
          // Always sync quantity from cart
          quantity: item.quantity,
        });
      });
      return newMap;
    });
  }, [itemsHash, activeCartGroup]); // Sync whenever quantities or items change

  // Track which stockHeaderIds we've already fetched pricing for
  const fetchedPricingRef = useRef<Set<number>>(new Set());

  // Fetch branding pricing for branded items
  useEffect(() => {
    if (activeCartGroup !== 'branded') {
      // Reset fetched pricing ref when switching away from branded
      fetchedPricingRef.current.clear();
      return;
    }

    const fetchPricing = async () => {
      const pricingPromises = activeItems
        .filter(isBranded)
        .map(async (item) => {
          const stockHeaderId = item.stock_header_id;
          if (!stockHeaderId || fetchedPricingRef.current.has(stockHeaderId)) return;
          
          // Mark as fetching
          fetchedPricingRef.current.add(stockHeaderId);

          try {
            const response = await fetch(`/api/branding-pricing?stockHeaderId=${stockHeaderId}`);
            if (!response.ok) {
              console.warn(`Failed to fetch branding pricing for ${stockHeaderId}`);
              return;
            }
            const data = await response.json();
            
            // Parse the pricing data similar to the n8n extract logic
            if (!Array.isArray(data) || data.length === 0) return;

            // Match pricing to item's branding selections
            const itemBranding = item.branding || [];
            const matchedPricing = itemBranding.map((b) => {
              const norm = (v: string | null | undefined) => String(v ?? '').trim().toLowerCase();
              const safeNumber = (v: unknown, d = 0) => {
                const n = Number(v);
                return Number.isFinite(n) ? n : d;
              };

              // Find matching pricing entry
              let candidates = data.filter((p: {
                BrandingType?: string;
                BrandingSize?: string;
                BrandingPosition?: string;
              }) =>
                norm(p.BrandingType) === norm(b.branding_type) &&
                norm(p.BrandingSize) === norm(b.branding_size)
              );

              // If position exists, match it too
              if (b.branding_position && candidates.length) {
                const withPos = candidates.filter((p: { BrandingPosition?: string }) =>
                  Object.prototype.hasOwnProperty.call(p, 'BrandingPosition')
                );
                if (withPos.length) {
                  const posMatched = withPos.filter((p: { BrandingPosition?: string }) =>
                    norm(p.BrandingPosition) === norm(b.branding_position)
                  );
                  if (posMatched.length) candidates = posMatched;
                }
              }

              const pick = candidates[0] ?? data[0];
              if (!pick) return null;

              const unitPrice = pick.DiscountedUnitPrice != null 
                ? pick.DiscountedUnitPrice 
                : pick.UnitPrice;
              const setupFee = pick.DiscountedSetupFee != null 
                ? pick.DiscountedSetupFee 
                : pick.SetupFee;

              return {
                stockHeaderId,
                brandingType: pick.BrandingType ?? b.branding_type ?? '',
                brandingPosition: pick.BrandingPosition ?? b.branding_position ?? '',
                brandingSize: pick.BrandingSize ?? b.branding_size ?? '',
                colourCount: safeNumber(pick.BrandingColours, 0),
                unitPrice: safeNumber(unitPrice, 0),
                setupFee: safeNumber(setupFee, 0),
              };
            }).filter(Boolean) as Array<{
              stockHeaderId: number;
              brandingType: string;
              brandingPosition: string;
              brandingSize: string;
              colourCount: number;
              unitPrice: number;
              setupFee: number;
            }>;

            if (matchedPricing.length > 0) {
              setBrandingPricing(prev => {
                const newMap = new Map(prev);
                newMap.set(stockHeaderId, matchedPricing);
                return newMap;
              });
            }
          } catch (error) {
            console.error(`Error fetching branding pricing for ${stockHeaderId}:`, error);
            // Remove from fetched set on error so we can retry
            fetchedPricingRef.current.delete(stockHeaderId);
          }
        });

      await Promise.all(pricingPromises);
    };

    fetchPricing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeItems.length, activeCartGroup]); // Only refetch when items change or group changes

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    street: "",
    suburb: "",
    city: "",
    province: "",
    postalCode: "",
    country: "South Africa",
    lat: undefined as number | undefined,
    lng: undefined as number | undefined,
  });

  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [addressSelected, setAddressSelected] = useState(false);
  const [actionType, setActionType] = useState<'save' | 'send' | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState('');

  // Calculate totals
  const calculateTotals = () => {
    let subtotal = 0;
    editableItems.forEach((item) => {
      const basePrice = item.customPrice ?? (item.discounted_price || item.base_price || 0);
      const margin = item.customMargin ?? 0;
      // Margin applies ONLY to item cost, NOT to branding costs
      const finalPrice = basePrice * (1 + margin / 100);
      let itemSubtotal = finalPrice * item.quantity;
      
      // Add branding costs for branded items
      // NOTE: Branding costs are added separately WITHOUT margin applied
      if (isBranded(item) && item.branding?.length) {
        const itemPricing = brandingPricing.get(item.stock_header_id) || [];
        const norm = (v: string | null | undefined) => String(v ?? '').trim().toLowerCase();
        
        // Calculate unitPrice costs (per branding per item)
        // These are added at face value, no margin applied
        item.branding.forEach((b) => {
          const matchedPricing = itemPricing.find(p =>
            norm(p.brandingType) === norm(b.branding_type) &&
            norm(p.brandingSize) === norm(b.branding_size) &&
            (!b.branding_position || norm(p.brandingPosition) === norm(b.branding_position))
          );
          if (matchedPricing) {
            itemSubtotal += matchedPricing.unitPrice * item.quantity;
          }
        });
        
        // Add setupFee once per item (not per branding)
        // Setup fee is also added at face value, no margin applied
        if (itemPricing.length > 0) {
          itemSubtotal += itemPricing[0].setupFee;
        }
      }
      
      subtotal += itemSubtotal;
    });
    const vat = subtotal * VAT_RATE;
    const subtotalWithVat = subtotal + vat;
    
    // Delivery fee: R150 if total (subtotal + vat) is below R1000, otherwise free
    const deliveryFee = subtotalWithVat < 1000 ? 150 : 0;
    const total = subtotalWithVat + deliveryFee;
    
    return { subtotal, vat, deliveryFee, total };
  };

  const { subtotal, vat, deliveryFee, total } = calculateTotals();

  function generateMerchantOrderNo(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `ML-${timestamp}-${random}`;
  }

  function updateItemPrice(key: string, price: number) {
    setEditableItems(prev => {
      const newMap = new Map(prev);
      const item = newMap.get(key);
      if (item) {
        newMap.set(key, { ...item, customPrice: Math.max(0, price) });
      }
      return newMap;
    });
  }

  function updateItemMargin(key: string, margin: number) {
    setEditableItems(prev => {
      const newMap = new Map(prev);
      const item = newMap.get(key);
      if (item) {
        newMap.set(key, { ...item, customMargin: Math.max(0, margin) });
      }
      return newMap;
    });
  }

  // Build branded payload
  function buildBrandedPayload(groupItems: EditableItem[], selections: QuoteBrandingSelection[]): Array<Record<string, unknown>> {
    const now = new Date();
    const nowIso = now.toISOString();
    const enquiryId = Math.floor(Date.now() / 1000);
    const enquiryCustomerId = Math.floor(Math.random() * 100) + 20;
    const leadCustomerAccount = null;

    const selectionsByItemKey: Record<string, QuoteBrandingSelection[]> = {};
    selections.forEach(sel => {
      if (!selectionsByItemKey[sel.item_key]) {
        selectionsByItemKey[sel.item_key] = [];
      }
      selectionsByItemKey[sel.item_key].push(sel);
    });

    const items = groupItems.map((item, idx) => {
      const itemKey = getCartItemKey(item);
      const itemSelections = selectionsByItemKey[itemKey] || [];
      const basePrice = item.customPrice ?? (item.discounted_price || item.base_price || 0);
      const margin = item.customMargin ?? 0;
      const finalPrice = basePrice * (1 + margin / 100);
      
      // Get pricing for this item's stockHeaderId
      const itemPricing = brandingPricing.get(item.stock_header_id) || [];
      
      const brandingItems = itemSelections.map((sel, selIdx) => {
        const logoFileValue = sel.logo_file || sel.artwork_url || null;
        
        // Match pricing to this branding selection
        const norm = (v: string | null | undefined) => String(v ?? '').trim().toLowerCase();
        const matchedPricing = itemPricing.find(p =>
          norm(p.brandingType) === norm(sel.branding_type) &&
          norm(p.brandingSize) === norm(sel.branding_size) &&
          (!sel.branding_position || norm(p.brandingPosition) === norm(sel.branding_position))
        );
        
        const unitPrice = matchedPricing?.unitPrice ?? 0;
        const setupFee = matchedPricing?.setupFee ?? 0;
        
        return {
          stockHeaderId: item.stock_header_id,
          brandingType: sel.branding_type,
          brandingPosition: sel.branding_position,
          brandingSize: sel.branding_size,
          colourCount: sel.color_count,
          unitPrice,
          setupFee,
          logoFile: logoFileValue || null,
          // Additional fields for compatibility
          enquiryBrandingItemId: enquiryId + idx * 1000 + selIdx + 1,
          enquiryItemId: enquiryId + idx + 200,
          colour: item.colour || null,
          brandingConfigId: "",
          brandingChargeId: "",
          unitCount: item.quantity,
          namesList: "[]",
          comment: sel.comment || "",
          brandingCost: 0,
          createdAt: nowIso,
          updatedAt: nowIso,
        };
      });

      return {
        enquiryItemId: enquiryId + idx + 200,
        enquiryId,
        stockId: item.stock_id ?? item.stockId ?? 0,
        stockHeaderId: item.stock_header_id ?? item.stockHeaderId ?? 0,
        quantity: item.quantity,
        price: finalPrice,
        colour: item.colour || null,
        size: item.size || null,
        description: item.description || item.stock_code || "",
        descriptionSlug: (item.description || item.stock_code || "").toLowerCase().replace(/\s+/g, "-"),
        productColourImage: item.image_url || null,
        itemTotalCost: finalPrice * item.quantity,
        brandingApplied: 1,
        lineItemMarkup: String(margin),
        transferred: 0,
        sample: 0,
        discontinued: 0,
        isExternal: 0,
        itemNumber: item.stock_code || "",
        hexCode: getHexCodeForColour(item.colour),
        supplier: "Barron",
        suppliedBy: "Barron",
        basePrice: item.discounted_price || item.base_price || 0, // Use DiscountBasePrice from API
        createdAt: nowIso,
        updatedAt: nowIso,
        brandingItems,
      };
    });

    const itemCost = items.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
    const brandingCost = 0; // Can be calculated if needed
    const totalCost = itemCost + brandingCost;
    const vat = totalCost * VAT_RATE;
    const subtotalWithVat = totalCost + vat;
    // Delivery fee: R150 if total (subtotal + vat) is below R1000, otherwise free
    const deliveryFee = subtotalWithVat < 1000 ? 150 : 0;
    const finalTotal = subtotalWithVat + deliveryFee;

    return [{
      enquiryId,
      enquiryCustomerId,
      leadCustomerAccount,
      enquiryDate: nowIso,
      submissionDate: nowIso,
      source: "quote_form",
      status: "pending",
      packingDecision: "",
      packingType: "",
      warehousingDecision: "",
      warehousingRequired: "",
      shippingDecision: "",
      shippingType: "",
      itemCount: groupItems.length,
      itemCost,
      brandingCost,
      totalCost: finalTotal,
      vat,
      overallMarkup: 0,
      brandingStatus: "branded",
      supplierName: "Barron",
      isSample: false,
      enquiryCustomer: {
        enquiryCustomerId,
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        subscribeToNewsletter: false,
        telephoneNumber: form.phone,
        company: form.company || null,
        address: {
          enquiryAddressId: enquiryCustomerId + 1,
          street: form.street || "",
          suburb: form.suburb || "",
          city: form.city || "",
          province: form.province || "",
          postalCode: form.postalCode || "",
          country: form.country || "South Africa",
          enquiryCustomerId,
          enquiryCustomer: null,
          ...(form.lat !== undefined && form.lng !== undefined ? { 
            lat: form.lat, 
            lng: form.lng 
          } : {})
        },
        enquiryAddressId: enquiryCustomerId + 1,
        enquiries: [null]
      },
      items,
    }];
  }

  // Build unbranded payload
  function buildUnbrandedPayload(merchantOrderNo: string, groupItems: EditableItem[]) {
    const now = new Date();
    const nowIso = now.toISOString();
    const enquiryId = Math.floor(Math.random() * 1000) + 100;
    const enquiryCustomerId = Math.floor(Math.random() * 100) + 20;
    const leadCustomerAccount = `C${String(Math.floor(Math.random() * 10000000)).padStart(7, '0')}`;

    const items = groupItems.map((item, idx) => {
      const basePrice = item.customPrice ?? (item.discounted_price || item.base_price || 0);
      const margin = item.customMargin ?? 0;
      const finalPrice = basePrice * (1 + margin / 100);
      
      return {
        enquiryItemId: enquiryId + idx + 200,
        enquiryId,
        stockId: item.stock_id ?? item.stockId ?? 0,
        stockHeaderId: item.stock_header_id ?? item.stockHeaderId ?? 0,
        quantity: item.quantity,
        price: finalPrice,
        colour: item.colour || null,
        size: item.size || null,
        description: item.description || item.stock_code || "",
        descriptionSlug: (item.description || item.stock_code || "").toLowerCase().replace(/\s+/g, "-"),
        productColourImage: item.image_url || null,
        itemTotalCost: finalPrice * item.quantity,
        brandingApplied: 0,
        lineItemMarkup: String(margin),
        transferred: 0,
        sample: 0,
        discontinued: 0,
        isExternal: 0,
        hexCode: getHexCodeForColour(item.colour),
        supplier: item.brand || "Barron",
        suppliedBy: item.brand || "Barron",
        stockCode: item.stock_code,
        colorStatus: item.color_status,
        basePrice: item.discounted_price || item.base_price || 0, // Use DiscountBasePrice from API
        discountedPrice: finalPrice,
        royaltyFactor: item.royalty_factor,
        qtyAvailable: item.qty_available,
        category: item.category,
        type: item.type,
        gender: item.gender,
        garmentType: item.garment_type,
        weightPerUnit: item.weight_per_unit,
        createdAt: nowIso,
        updatedAt: nowIso,
        enquiry: null,
        brandingItems: []
      };
    });

    const itemCost = items.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
    const totalCost = itemCost;
    const vatAmount = totalCost * VAT_RATE;
    const subtotalWithVat = totalCost + vatAmount;
    // Delivery fee: R150 if total (subtotal + vat) is below R1000, otherwise free
    const deliveryFee = subtotalWithVat < 1000 ? 150 : 0;
    const finalTotal = subtotalWithVat + deliveryFee;

    // Return the actual JSON object, not a stringified version
    return {
      enquiryId,
      enquiryCustomerId,
      leadCustomerAccount,
      enquiryDate: nowIso,
      submissionDate: nowIso,
      source: "quote_form",
      status: "pending",
      packingDecision: "",
      packingType: "",
      warehousingDecision: "",
      warehousingRequired: "",
      shippingDecision: "",
      shippingType: "",
      itemCount: groupItems.length,
      itemCost,
      brandingCost: 0,
      totalCost: finalTotal,
      quote_meta: { category: "unbranded" },
      vat: vatAmount,
      overallMarkup: 0,
      brandingStatus: "unbranded",
      supplierName: "MerchLab",
      isSample: false,
      merchant_order_no: merchantOrderNo,
      enquiryCustomer: {
        enquiryCustomerId,
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        subscribeToNewsletter: false,
        telephoneNumber: form.phone,
        company: form.company || null,
        address: {
          enquiryAddressId: enquiryCustomerId + 1,
          street: form.street || "",
          suburb: form.suburb || "",
          city: form.city || "",
          province: form.province || "",
          postalCode: form.postalCode || "",
          country: form.country || "South Africa",
          enquiryCustomerId,
          enquiryCustomer: null,
          ...(form.lat !== undefined && form.lng !== undefined ? { 
            lat: form.lat, 
            lng: form.lng 
          } : {})
        },
        enquiryAddressId: enquiryCustomerId + 1,
        enquiries: [null]
      },
      items,
    };
  }

  async function handleSubmit(action: 'save' | 'send') {
    if (activeItems.length === 0) {
      setMsg("No items to submit.");
      return;
    }

    // Validate form
    if (!form.firstName || !form.lastName || !form.email || !form.phone) {
      setMsg("Please fill in all required customer details.");
      return;
    }

    setSubmitting(true);
    setActionType(action);
    setMsg(null);

    try {
      const merchantOrderNo = generateMerchantOrderNo();
      let payload: unknown;

      if (activeCartGroup === 'branded') {
        const sessionToken = getOrCreateSessionToken();
        const itemKeys = activeItems.map(item => getCartItemKey(item));
        
        let dbSelections: QuoteBrandingSelection[] = [];
        try {
          dbSelections = await fetchQuoteBrandingSelections(sessionToken, itemKeys);
        } catch (e) {
          console.warn('Failed to fetch selections from DB:', e);
        }

        const selectionsFromCart = activeItems.flatMap(item => {
          if (!item.branding || item.branding.length === 0) return [];
          const itemKey = getCartItemKey(item);
          return item.branding.map(b => ({
            item_key: itemKey,
            stock_header_id: item.stock_header_id,
            branding_position: b.branding_position,
            branding_type: b.branding_type,
            branding_size: b.branding_size,
            color_count: b.color_count,
            comment: b.comment || null,
            artwork_url: b.artwork_url || null,
            logo_file: b.logo_file || null,
          }));
        });

        const selections = selectionsFromCart.length > 0 ? selectionsFromCart : dbSelections;
        payload = buildBrandedPayload(Array.from(editableItems.values()), selections);
      } else {
        payload = buildUnbrandedPayload(merchantOrderNo, Array.from(editableItems.values()));
      }

      const response = await fetch('/api/build-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload, action }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to submit quote');
      }

      // Remove submitted items from cart for both 'save' and 'send'
      const submittedItemKeys = activeItems.map(item => getCartItemKey(item));
      const otherGroup = activeCartGroup === 'branded' ? 'unbranded' : 'branded';
      // Check other group items before removal (customer details remain in form state)
      const otherItemsBeforeRemoval = otherGroup === 'branded' ? brandedItems : unbrandedItems;
      
      // Remove submitted items
      submittedItemKeys.forEach(key => {
        remove(key);
      });

      // Wait a bit for cart state to update, then check if other group has items
      setTimeout(() => {
        const currentItems = useCartStore.getState().items;
        const otherItemsAfter = otherGroup === 'branded' 
          ? currentItems.filter(isBranded)
          : currentItems.filter((i) => !isBranded(i));
        
        const actionText = action === 'send' ? 'sent' : 'saved';
        
        if (otherItemsAfter.length > 0) {
          // Switch to other group if it has items
          setActiveCartGroup(otherGroup);
          setMsg(`Quote ${actionText} successfully! ${otherItemsAfter.length} ${otherGroup} item(s) still in cart.`);
        } else {
          // No items left, navigate to build-a-quote and show confirmation
          setConfirmationMessage(`Quote ${actionText} successfully!`);
          setShowConfirmation(true);
          router.push('/build-a-quote');
        }
      }, 100);
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "Something went wrong.";
      setMsg(`Error: ${errorMessage}`);
    } finally {
      setSubmitting(false);
      setActionType(null);
    }
  }

  if (!hydrated) {
    return <div className="max-w-6xl mx-auto px-4 py-6">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <Button asChild variant="outline" className="mb-4">
            <Link href="/build-a-quote">Back to Products</Link>
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Build Custom Quote</h1>
          <p className="text-muted-foreground">Customize quantities, prices, and margins for your quote.</p>
        </div>

        {msg && (
          <div className={`mb-4 p-4 rounded ${msg.includes('Error') || msg.includes('error') ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
            {msg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Items Section */}
            <div className="bg-white rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Items</h2>
              
              {items.length > 0 && (
                <div className="mb-4">
                  <ToggleGroup
                    type="single"
                    value={activeCartGroup}
                    onValueChange={(v) => {
                      if (v === 'branded' || v === 'unbranded') {
                        setActiveCartGroup(v);
                      }
                    }}
                    className="w-full"
                  >
                    <ToggleGroupItem value="branded" className={cn("flex-1", activeCartGroup === "branded" && "bg-primary text-white")}>
                      Branded ({brandedItems.length})
                    </ToggleGroupItem>
                    <ToggleGroupItem value="unbranded" className={cn("flex-1", activeCartGroup === "unbranded" && "bg-primary text-white")}>
                      Unbranded ({unbrandedItems.length})
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
              )}

              {activeItems.length === 0 ? (
                <div className="text-muted-foreground">No items in cart.</div>
              ) : (
                <div className="space-y-4">
                  {Array.from(editableItems.values()).map((item) => {
                    const itemKey = getCartItemKey(item);
                    const basePrice = item.customPrice ?? (item.discounted_price || item.base_price || 0);
                    const margin = item.customMargin ?? 0;
                    // Margin applies ONLY to item cost, NOT to branding costs
                    const finalPrice = basePrice * (1 + margin / 100);
                    const itemCostWithMargin = finalPrice * item.quantity;
                    
                    // Calculate branding costs for branded items
                    // NOTE: Branding costs are added separately WITHOUT margin applied
                    let brandingCost = 0;
                    if (isBranded(item) && item.branding?.length) {
                      const itemPricing = brandingPricing.get(item.stock_header_id) || [];
                      const norm = (v: string | null | undefined) => String(v ?? '').trim().toLowerCase();
                      
                      // Calculate unitPrice costs (per branding per item)
                      // These are added at face value, no margin applied
                      item.branding.forEach((b) => {
                        const matchedPricing = itemPricing.find(p =>
                          norm(p.brandingType) === norm(b.branding_type) &&
                          norm(p.brandingSize) === norm(b.branding_size) &&
                          (!b.branding_position || norm(p.brandingPosition) === norm(b.branding_position))
                        );
                        if (matchedPricing) {
                          brandingCost += matchedPricing.unitPrice * item.quantity;
                        }
                      });
                      
                      // Add setupFee once per item (not per branding)
                      // Setup fee is also added at face value, no margin applied
                      if (itemPricing.length > 0) {
                        brandingCost += itemPricing[0].setupFee;
                      }
                    }
                    
                    // Line total = (item cost with margin) + (branding costs without margin)
                    const lineTotal = itemCostWithMargin + brandingCost;

                    return (
                      <div key={itemKey} className="border rounded-lg p-4 space-y-4">
                        <div className="flex items-start gap-4">
                          <div className="relative w-20 h-20 rounded bg-gray-50 overflow-hidden flex-shrink-0">
                            <SmartImage 
                              src={item.image_url || null} 
                              alt={item.description || item.stock_code || ""} 
                              fill 
                              className="object-contain" 
                              sizes="80px" 
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium">{item.description || item.stock_code}</div>
                            <div className="text-sm text-muted-foreground">
                              {item.brand || "Barron"} • {item.colour} • {item.size}
                            </div>
                            {isBranded(item) && item.branding?.length ? (
                              <div className="mt-2 space-y-2">
                                <div className="text-xs font-medium text-primary">Branded</div>
                                {item.branding.map((b, idx) => {
                                  const pricing = brandingPricing.get(item.stock_header_id);
                                  const brandPricing = pricing?.find(p => 
                                    p.brandingType.toLowerCase() === b.branding_type?.toLowerCase() &&
                                    p.brandingSize.toLowerCase() === b.branding_size?.toLowerCase() &&
                                    (!b.branding_position || p.brandingPosition.toLowerCase() === b.branding_position.toLowerCase())
                                  );
                                  
                                  return (
                                    <div key={idx} className="text-xs space-y-0.5 pl-2 border-l-2 border-gray-200">
                                      <div className="text-muted-foreground">
                                        {b.branding_position} • {b.branding_size} • {b.branding_type}
                                      </div>
                                      {brandPricing && (
                                        <div className="text-xs text-gray-600">
                                          Unit Price: R {brandPricing.unitPrice.toFixed(2)}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                                {(() => {
                                  const pricing = brandingPricing.get(item.stock_header_id);
                                  const setupFee = pricing?.[0]?.setupFee ?? 0;
                                  if (setupFee > 0) {
                                    return (
                                      <div className="text-xs text-gray-600 mt-1 pt-1 border-t">
                                        Setup Fee: R {setupFee.toFixed(2)} (per item)
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <label className="text-xs font-medium text-gray-700">Quantity</label>
                            <div className="flex items-center gap-2 mt-1">
                              <button
                                className="h-8 w-8 rounded border text-sm"
                                onClick={() => updateQty(itemKey, Math.max(1, item.quantity - 1))}
                              >
                                −
                              </button>
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => {
                                  const newQty = parseInt(e.target.value) || 1;
                                  updateQty(itemKey, Math.max(1, newQty));
                                }}
                                className="w-16 text-center h-8"
                              />
                              <button
                                className="h-8 w-8 rounded border text-sm"
                                onClick={() => updateQty(itemKey, item.quantity + 1)}
                              >
                                +
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-medium text-gray-700">Base Price (R)</label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={basePrice.toFixed(2)}
                              onChange={(e) => updateItemPrice(itemKey, parseFloat(e.target.value) || 0)}
                              className="mt-1 h-8"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-medium text-gray-700">Margin (%)</label>
                            <Input
                              type="number"
                              step="0.1"
                              min="0"
                              value={margin}
                              onChange={(e) => updateItemMargin(itemKey, parseFloat(e.target.value) || 0)}
                              className="mt-1 h-8"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-medium text-gray-700">Line Total (R)</label>
                            <div className="mt-1 h-8 flex items-center font-semibold">
                              {lineTotal.toFixed(2)}
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <button 
                            className="text-xs text-red-600 underline"
                            onClick={() => remove(itemKey)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Customer Details */}
            {items.length > 0 && (
              <div className="bg-white rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">Customer Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">First Name *</label>
                    <Input
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Last Name *</label>
                    <Input
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Email *</label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Phone Number *</label>
                    <div className="flex mt-1">
                      <span className="inline-flex items-center px-3 text-sm text-gray-500 bg-gray-50 border border-r-0 border-gray-300 rounded-l-md">
                        +27
                      </span>
                      <Input
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="rounded-l-none"
                      />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-700">Company Name</label>
                    <Input
                      value={form.company}
                      onChange={(e) => setForm({ ...form, company: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>

                <h3 className="text-md font-medium mt-6 mb-4">Shipping Address</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Address Search</label>
                    <AddressAutocomplete
                      value={form.street}
                      onChange={(v) => setForm({ ...form, street: v })}
                      onAddressParsed={(addr: ParsedAddress) => {
                        setForm({
                          ...form,
                          street: addr.street || "",
                          suburb: addr.suburb || "",
                          city: addr.city || "",
                          province: addr.province || "",
                          postalCode: addr.postalCode || "",
                          country: addr.country || "South Africa",
                          lat: addr.lat,
                          lng: addr.lng,
                        });
                        setAddressSelected(true);
                      }}
                      placeholder="Start typing to search on Google Maps"
                    />
                  </div>
                  {addressSelected && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Street</label>
                        <Input value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} className="mt-1" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Suburb</label>
                        <Input value={form.suburb} onChange={(e) => setForm({ ...form, suburb: e.target.value })} className="mt-1" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">City</label>
                        <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="mt-1" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Province</label>
                        <Input value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} className="mt-1" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Postal Code</label>
                        <Input value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} className="mt-1" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Country</label>
                        <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="mt-1" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg p-6 sticky top-6 border">
              <h2 className="text-lg font-semibold mb-4">Quote Summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">R {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">VAT (15%)</span>
                  <span className="font-medium">R {vat.toFixed(2)}</span>
                </div>
                {deliveryFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Delivery Fee</span>
                    <span className="font-medium">R {deliveryFee.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t pt-3 flex justify-between font-semibold">
                  <span>Total</span>
                  <span>R {total.toFixed(2)}</span>
                </div>

                <div className="pt-4 space-y-2">
                  <Button
                    disabled={submitting || activeItems.length === 0 || !form.firstName || !form.lastName || !form.email || !form.phone}
                    onClick={() => handleSubmit('save')}
                    className="w-full"
                    variant="outline"
                  >
                    {submitting && actionType === 'save' ? "Saving…" : "Save"}
                  </Button>
                  <Button
                    disabled={submitting || activeItems.length === 0 || !form.firstName || !form.lastName || !form.email || !form.phone}
                    onClick={() => handleSubmit('send')}
                    className="w-full"
                  >
                    {submitting && actionType === 'send' ? "Sending…" : "Save & Send"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Quote Submitted</DialogTitle>
            <DialogDescription>
              {confirmationMessage}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowConfirmation(false)}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

