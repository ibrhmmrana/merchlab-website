"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useCartStore, getCartItemKey, isBranded, type CartItem } from "@/store/cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useHasHydrated } from "@/lib/hooks/useHasHydrated";
import SmartImage from "@/components/SmartImage";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import type { ParsedAddress } from "@/lib/utils/places";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { getOrCreateSessionToken } from "@/lib/session";
import { fetchQuoteBrandingSelections, type QuoteBrandingSelection } from "@/lib/branding";

// Validation helper for branded items
function validateBrandedItem(item: CartItem): boolean {
  if (!isBranded(item) || !item.branding || item.branding.length === 0) {
    return false;
  }
  
  return item.branding.every((b) => {
    if (!b.branding_position || !b.branding_type || !b.branding_size) {
      return false;
    }
    if (typeof b.color_count !== 'number' || b.color_count < 1) {
      return false;
    }
    // For Screen Printing, color_count must be 1-10; for others, must be 1
    const isScreenPrint = b.branding_type.toLowerCase().includes('screen') && b.branding_type.toLowerCase().includes('print');
    if (isScreenPrint) {
      return b.color_count >= 1 && b.color_count <= 10;
    } else {
      return b.color_count === 1;
    }
  });
}

export default function CartClient() {
  const hydrated = useHasHydrated();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const items = useCartStore((s) => s.items);
  const brandedItems = useCartStore((s) => s.brandedItems);
  const unbrandedItems = useCartStore((s) => s.unbrandedItems);
  const activeCartGroup = useCartStore((s) => s.activeCartGroup);
  const setActiveCartGroup = useCartStore((s) => s.setActiveCartGroup);
  const updateQty = useCartStore((s) => s.updateQty);
  const remove = useCartStore((s) => s.remove);

  const activeItems = activeCartGroup === 'branded' ? brandedItems : unbrandedItems;
  const isUpdatingUrlRef = useRef(false);
  const hasInitializedRef = useRef(false);

  // Sync URL query param with activeCartGroup on initial mount only
  useEffect(() => {
    if (hasInitializedRef.current) return;
    
    const groupParam = searchParams.get('group');
    if (groupParam === 'branded' || groupParam === 'unbranded') {
      if (groupParam !== activeCartGroup) {
        setActiveCartGroup(groupParam);
      }
    }
    hasInitializedRef.current = true;
  }, [searchParams, activeCartGroup, setActiveCartGroup]);

  // Update URL when activeCartGroup changes (but skip if we're updating from URL)
  useEffect(() => {
    if (!hasInitializedRef.current || isUpdatingUrlRef.current) {
      isUpdatingUrlRef.current = false;
      return;
    }
    
    const currentGroup = searchParams.get('group');
    if (currentGroup !== activeCartGroup) {
      isUpdatingUrlRef.current = true;
      const params = new URLSearchParams(searchParams.toString());
      params.set('group', activeCartGroup);
      router.replace(`/cart?${params.toString()}`, { scroll: false });
    }
  }, [activeCartGroup, searchParams, router]);

  // Validate branded items
  const isBrandedValid = activeCartGroup === 'branded'
    ? activeItems.every(validateBrandedItem)
    : true;

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
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [addressSelected, setAddressSelected] = useState(false);

  function generateMerchantOrderNo(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `ML-${timestamp}-${random}`;
  }

  function getHexCodeForColour(colour: string | null | undefined): string | null {
    if (!colour) return null;

    const colourMap: Record<string, string> = {
      "Black": "#000000",
      "White": "#FFFFFF",
      "Navy": "#000080",
      "Royal Blue": "#4169E1",
      "Red": "#FF0000",
      "Maroon": "#800000",
      "Green": "#008000",
      "Forest Green": "#228B22",
      "Grey": "#808080",
      "Charcoal": "#36454F",
      "Brown": "#A52A2A",
      "Khaki": "#C3B091",
      "Orange": "#FFA500",
      "Yellow": "#FFFF00",
      "Pink": "#FFC0CB",
      "Purple": "#800080",
      "Burgundy": "#800020",
      "Teal": "#008080",
      "Lime": "#00FF00",
      "Sky Blue": "#87CEEB",
      "Tan": "#D2B48C",
      "Beige": "#F5F5DC",
      "Cream": "#FFFDD0",
      "Olive": "#808000",
      "Silver": "#C0C0C0",
      "Gold": "#FFD700",
    };

    return colourMap[colour] || "#000000";
  }

  // Build branded payload matching the sample format
  function buildBrandedPayload(groupItems: CartItem[], selections: QuoteBrandingSelection[]): Array<Record<string, unknown>> {
    const now = new Date();
    const nowIso = now.toISOString();
    const enquiryId = Math.floor(Date.now() / 1000); // Use timestamp-based ID
    const enquiryCustomerId = Math.floor(Math.random() * 100) + 20;
    const leadCustomerAccount = null; // Can be set if you have a CRM account code

    // Group selections by item_key
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
      
      // Build brandingItems array
      const brandingItems = itemSelections.map((sel, selIdx) => ({
        enquiryBrandingItemId: enquiryId + idx * 1000 + selIdx + 1,
        enquiryItemId: enquiryId + idx + 200,
        stockHeaderId: item.stock_header_id,
        colour: item.colour || null,
        brandingConfigId: "",
        brandingChargeId: "",
        brandingType: sel.branding_type,
        brandingPosition: sel.branding_position,
        brandingSize: sel.branding_size,
        colourCount: sel.color_count,
        unitCount: item.quantity,
        unitPrice: 0,
        setupFee: 0,
        namesList: "[]",
        comment: sel.comment || "",
        brandingCost: 0,
        createdAt: nowIso,
        updatedAt: nowIso,
        logoFile: sel.artwork_url ? [sel.artwork_url] : [],
      }));

      return {
        enquiryItemId: enquiryId + idx + 200,
        enquiryId,
        stockId: item.stock_id ?? item.stockId ?? 0,
        stockHeaderId: item.stock_header_id ?? item.stockHeaderId ?? 0,
        quantity: item.quantity,
        price: 0,
        colour: item.colour || null,
        size: item.size || null,
        description: item.description || item.stock_code || "",
        descriptionSlug: (item.description || item.stock_code || "").toLowerCase().replace(/\s+/g, "-"),
        productColourImage: item.image_url || null,
        itemTotalCost: 0,
        brandingApplied: 1,
        lineItemMarkup: "0",
        transferred: 0,
        sample: 0,
        discontinued: 0,
        isExternal: 0,
        itemNumber: item.stock_code || "",
        hexCode: getHexCodeForColour(item.colour),
        supplier: "Barron",
        suppliedBy: "Barron",
        createdAt: nowIso,
        updatedAt: nowIso,
        brandingItems,
      };
    });

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
      itemCost: 0,
      brandingCost: 0,
      totalCost: 0,
      vat: 0,
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

  async function submitQuote() {
    if (activeItems.length === 0) {
      setMsg("No items to submit in the selected group.");
      return;
    }

    if (activeCartGroup === 'branded' && !isBrandedValid) {
      setMsg("Please complete all branding details before submitting.");
      return;
    }

    setSubmitting(true);
    setMsg(null);
    try {
      // Handle branded submission separately
      if (activeCartGroup === 'branded') {
        // Get session token
        const sessionToken = getOrCreateSessionToken();
        
        // Get item keys for current branded items
        const itemKeys = activeItems.map(item => getCartItemKey(item));
        
        // Fetch branding selections from database
        let selections: QuoteBrandingSelection[] = [];
        try {
          selections = await fetchQuoteBrandingSelections(sessionToken, itemKeys);
        } catch (e) {
          console.warn('Failed to fetch selections from DB, will use cart item branding:', e);
        }
        
        // If no DB selections found, build from cart item's branding array
        if (selections.length === 0) {
          // Convert cart item branding to QuoteBrandingSelection format
          selections = activeItems.flatMap(item => {
            if (!item.branding || item.branding.length === 0) {
              return [];
            }
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
            }));
          });
        }
        
        // Validate that each item has at least one selection (either from DB or cart)
        const itemsWithoutSelections = activeItems.filter(item => {
          const itemKey = getCartItemKey(item);
          const hasDbSelection = selections.some(sel => sel.item_key === itemKey);
          const hasCartBranding = item.branding && item.branding.length > 0;
          return !hasDbSelection && !hasCartBranding;
        });
        
        if (itemsWithoutSelections.length > 0) {
          setMsg("Some items are missing branding selections. Please ensure all branded items have saved selections.");
          setSubmitting(false);
          return;
        }
        
        // Build branded payload
        const brandedPayload = buildBrandedPayload(activeItems, selections);
        
        console.log('Submitting branded payload:', JSON.stringify(brandedPayload, null, 2));
        
        // POST to branded webhook
        const webhookUrl = process.env.NEXT_PUBLIC_WEBHOOK_BRANDED_URL || "https://ai.intakt.co.za/webhook/ml-branded-enquiries";
        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: { 
            "content-type": "application/json",
            "user-agent": "MerchLab-Quote-System/1.0"
          },
          body: JSON.stringify(brandedPayload),
        });
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error("Branded webhook failed:", res.status, errorText);
          throw new Error(`Failed to submit branded quote: ${res.status} - ${errorText}`);
        }
        
        // Success - remove branded items
        const otherGroup = 'unbranded';
        const otherItems = unbrandedItems;
        const willHaveRemainingItems = otherItems.length > 0;
        
        activeItems.forEach((item) => {
          remove(getCartItemKey(item));
        });
        
        const message = willHaveRemainingItems
          ? "Branded items submitted. Your unbranded items are still in the cart."
          : "Branded items submitted successfully.";
        
        sessionStorage.setItem('quoteSuccess', message);
        
        if (!willHaveRemainingItems) {
          window.location.href = '/';
        } else {
          setActiveCartGroup(otherGroup);
          setMsg(message);
        }
        
        return;
      }
      
      // Unbranded submission - use existing flow
      const mon = generateMerchantOrderNo();
      const fullEnquiryJson = buildQuotePayload(mon, activeItems);
      
      // Debug: Log stock_id verification
      console.log("=== STOCK ID VERIFICATION ===");
      activeItems.forEach((item, idx) => {
        console.log(`Cart Item ${idx}:`, {
          stock_id: item.stock_id,
          stock_header_id: item.stock_header_id,
          colour: item.colour,
          size: item.size,
          description: item.description,
          different_ids: item.stock_id !== item.stock_header_id ? "✅ CORRECT" : "❌ WRONG - Same as header"
        });
      });
      console.log("=== END VERIFICATION ===");
      
      const timestamp = new Date().toISOString();
      
      // Temporary log for debugging
      console.log('CLIENT PAYLOAD PREVIEW', JSON.stringify({ 
        items: activeItems.map(item => ({
          stock_id: item.stock_id,
          stock_header_id: item.stock_header_id,
          stockId: item.stockId,
          stockHeaderId: item.stockHeaderId,
          colour: item.colour,
          size: item.size,
          description: item.description
        }))
      }, null, 2));
      
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ 
          fullEnquiryJson: JSON.stringify(fullEnquiryJson), 
          timestamp, 
          merchant_order_no: mon 
        }),
      });
      if (!res.ok) throw new Error("Failed to submit quote");
      
      // Check what will remain before removing
      const otherGroup = 'branded';
      const otherItems = brandedItems;
      const willHaveRemainingItems = otherItems.length > 0;
      
      // Remove only the submitted group's items from cart
      activeItems.forEach((item) => {
        remove(getCartItemKey(item));
      });
      
      // Show success message
      const message = willHaveRemainingItems
        ? "Unbranded items sent. Branded items still in your cart."
        : "Unbranded items sent successfully.";
      
      // Store success message in sessionStorage for the home page to display
      sessionStorage.setItem('quoteSuccess', message);
      
      // If no items left, redirect to home, otherwise stay on cart page
      if (!willHaveRemainingItems) {
        window.location.href = '/';
      } else {
        // Switch to the other group
        setActiveCartGroup(otherGroup);
        setMsg(message);
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "Something went wrong.";
      setMsg(errorMessage);
    } finally {
      setSubmitting(false);
    }
  }

  function buildQuotePayload(merchantOrderNo: string, groupItems: CartItem[]) {
    const now = new Date();
    const nowIso = now.toISOString();
    const enquiryId = Math.floor(Math.random() * 1000) + 100;
    const enquiryCustomerId = Math.floor(Math.random() * 100) + 20;
    const leadCustomerAccount = `C${String(Math.floor(Math.random() * 10000000)).padStart(7, '0')}`;

    const payload = {
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
      itemCost: groupItems.reduce((sum, item) => sum + ((item.discounted_price || item.base_price || 0) * item.quantity), 0),
      brandingCost: 0,
      totalCost: groupItems.reduce((sum, item) => sum + ((item.discounted_price || item.base_price || 0) * item.quantity), 0),
      quote_meta: { category: activeCartGroup },
      vat: 0,
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
        company: form.company,
        address: {
          enquiryAddressId: enquiryCustomerId + 1,
          street: form.street,
          suburb: form.suburb,
          city: form.city,
          province: form.province,
          postalCode: form.postalCode,
          country: form.country,
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
      items: groupItems.map((item, idx) => {
        console.log(`Item ${idx}: stock_id=${item.stock_id}, stock_header_id=${item.stock_header_id}, colour=${item.colour}, size=${item.size}`);
        return {
          enquiryItemId: enquiryId + idx + 200,
        enquiryId,
          stockId: item.stock_id ?? item.stockId, // Use real stock_id from Supabase
          stockHeaderId: item.stock_header_id ?? item.stockHeaderId, // Use real stock_header_id from Supabase
        quantity: item.quantity,
        price: item.discounted_price || item.base_price || 0, // Use actual price from Supabase
        colour: item.colour,
        size: item.size,
        description: item.description,
        descriptionSlug: (item.description || "").toLowerCase().replace(/\s+/g, "-"),
        productColourImage: item.image_url,
        itemTotalCost: (item.discounted_price || item.base_price || 0) * item.quantity,
        brandingApplied: 0,
        lineItemMarkup: "0",
        transferred: 0,
        sample: 0,
        discontinued: 0,
        isExternal: 0,
        hexCode: getHexCodeForColour(item.colour),
        supplier: item.brand || "Barron",
        suppliedBy: item.brand || "Barron",
        // Additional Supabase fields
        stockCode: item.stock_code,
        colorStatus: item.color_status,
        basePrice: item.base_price,
        discountedPrice: item.discounted_price,
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
    })
    };

    return payload;
  }

  if (!hydrated) {
    return <div className="max-w-6xl mx-auto px-4 py-6">Loading cart…</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <Button asChild variant="outline" className="mb-4">
            <Link href="/shop">Continue shopping</Link>
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Order summary</h1>
          <p className="text-muted-foreground">Submit your quote and we will be in touch shortly.</p>
          <div className="mt-2">
            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
              MerchLab
            </span>
          </div>
        </div>

        {msg && (
          <div className={`mb-4 p-4 rounded ${msg.includes('error') || msg.includes('Error') || msg.includes('failed') || msg.includes('Failed') ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
            {msg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Items and Recipient Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Product Section */}
            <div className="bg-white rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Product</h2>
              
              {/* Tabs */}
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
                    <ToggleGroupItem
                      value="branded"
                      className={cn(
                        "flex-1 px-4 py-2 text-sm font-semibold",
                        activeCartGroup === "branded" && "bg-primary text-white"
                      )}
                    >
                      Branded ({brandedItems.length})
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="unbranded"
                      className={cn(
                        "flex-1 px-4 py-2 text-sm font-semibold",
                        activeCartGroup === "unbranded" && "bg-primary text-white"
                      )}
                    >
                      Unbranded ({unbrandedItems.length})
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
              )}

              {items.length === 0 ? (
                <div className="text-muted-foreground">Your cart is empty.</div>
              ) : (
                activeItems.length === 0 ? (
                  <div className="text-muted-foreground">
                    No {activeCartGroup === 'branded' ? 'branded' : 'unbranded'} items in your cart.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeItems.map((item) => {
                      const itemKey = getCartItemKey(item);
                      return (
                        <div key={itemKey} className="flex items-center gap-4 border rounded p-3">
                          <div className="relative w-20 h-20 rounded bg-gray-50 overflow-hidden">
                            <SmartImage 
                              src={item.image_url || null} 
                              alt={item.description || item.stock_code} 
                              fill 
                              className="object-contain" 
                              sizes="80px" 
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium leading-tight truncate">{item.description || item.stock_code}</div>
                            <div className="text-sm text-muted-foreground truncate">
                              {item.brand || "Barron"} • {item.colour} • {item.size}
                            </div>
                            {isBranded(item) && item.branding?.length ? (
                              <div className="mt-1.5 space-y-0.5">
                                <div className="text-[10px] font-medium text-primary">Branded</div>
                                {item.branding.map((b, idx) => (
                                  <div key={idx} className="text-[10px] text-muted-foreground">
                                    Position: {b.branding_position} • Size: {b.branding_size} • Type: {b.branding_type} • Colours: {b.color_count}
                                  </div>
                                ))}
                              </div>
                            ) : null}
                            <div className="mt-2 flex items-center gap-2">
                              <button
                                className="h-7 w-7 rounded border text-sm"
                                onClick={() => updateQty(itemKey, Math.max(1, item.quantity - 1))}
                                aria-label="Decrease quantity"
                              >
                                −
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => {
                                  const newQty = parseInt(e.target.value) || 1;
                                  updateQty(itemKey, Math.max(1, newQty));
                                }}
                                className="text-sm w-12 text-center border rounded px-1 py-1 h-7"
                                aria-label="Quantity"
                              />
                              <button
                                className="h-7 w-7 rounded border text-sm"
                                onClick={() => updateQty(itemKey, item.quantity + 1)}
                                aria-label="Increase quantity"
                              >
                                +
                              </button>
                              <button className="ml-2 text-xs underline" onClick={() => remove(itemKey)}>
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </div>

            {/* Contact Details */}
            {items.length > 0 && (
              <div className="bg-white rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">RECIPIENT DETAILS</h2>
                <h3 className="text-md font-medium mb-4">Contact Details</h3>
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
              </div>
            )}

            {/* Address Details */}
            {items.length > 0 && (
              <div className="bg-white rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">ADDRESS DETAILS</h2>
                <h3 className="text-md font-medium mb-4">Shipping Details</h3>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Street</label>
                        <Input
                          value={form.street}
                          onChange={(e) => setForm({ ...form, street: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Suburb</label>
                        <Input
                          value={form.suburb}
                          onChange={(e) => setForm({ ...form, suburb: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">City</label>
                        <Input
                          value={form.city}
                          onChange={(e) => setForm({ ...form, city: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Province</label>
                        <Input
                          value={form.province}
                          onChange={(e) => setForm({ ...form, province: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Postal Code</label>
                        <Input
                          value={form.postalCode}
                          onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Country</label>
                        <Input
                          value={form.country}
                          onChange={(e) => setForm({ ...form, country: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Summary */}
          <div className="lg:col-span-1">
            <div className="bg-gray-100 rounded-lg p-6 sticky top-6">
              <h2 className="text-lg font-semibold mb-4">Summary</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Products</span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                    {activeItems.length} {activeItems.length === 1 ? 'product' : 'products'}
                  </span>
                </div>
                {activeCartGroup === 'branded' && !isBrandedValid && (
                  <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                    Please complete all branding details before submitting.
                  </div>
                )}
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      id="terms" 
                      className="rounded" 
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                    />
                    <label htmlFor="terms" className="text-sm text-gray-600">
                      I have read and accept the{" "}
                      <a href="#" className="text-blue-600 hover:underline">
                        Terms & Conditions
                      </a>{" "}
                      for this website.
                    </label>
                  </div>
                </div>

                <button
                  disabled={submitting || activeItems.length === 0 || !termsAccepted || (activeCartGroup === 'branded' && !isBrandedValid)}
                  onClick={submitQuote}
                  className="luxury-btn w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Submitting…" : "Submit Quote"}
                </button>

                {msg && (
                  <div className={`text-sm ${msg.includes("submitted") ? "text-green-600" : "text-red-600"}`}>
                    {msg}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

