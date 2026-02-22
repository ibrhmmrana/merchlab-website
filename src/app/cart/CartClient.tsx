"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useCartStore, getCartItemKey, isBranded, type CartItem } from "@/store/cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useRef } from "react";
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

// Email validation - checks for legitimate email patterns
function validateEmail(email: string): { isValid: boolean; error?: string } {
  if (!email || email.trim() === '') {
    return { isValid: false, error: 'Email is required' };
  }

  const trimmedEmail = email.trim().toLowerCase();

  // Basic email regex - more strict than HTML5 email input
  const emailRegex = /^[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9]@[a-zA-Z0-9][a-zA-Z0-9.-]*[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
  
  if (!emailRegex.test(trimmedEmail)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }

  const [localPart, domain] = trimmedEmail.split('@');
  
  // Reject emails that are too short (likely fake)
  if (localPart.length < 2) {
    return { isValid: false, error: 'Email address is too short' };
  }

  // Reject emails with suspicious patterns (all numbers, all same character, etc.)
  if (/^\d+$/.test(localPart) && localPart.length < 5) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }

  // Reject common fake/test words in local part
  const fakeLocalParts = [
    'test', 'testing', 'fake', 'dummy', 'temp', 'temporary', 
    'sample', 'demo', 'example', 'admin', 'user', 'guest',
    'email', 'mail', 'contact', 'info', 'noreply', 'no-reply'
  ];
  
  // Check if local part is exactly a fake word or starts with it followed by numbers only
  if (fakeLocalParts.includes(localPart) || 
      fakeLocalParts.some(fake => localPart === fake || localPart.match(new RegExp(`^${fake}\\d+$`)))) {
    return { isValid: false, error: 'Please enter a real email address' };
  }

  // Reject domains that look fake or are commonly used for testing
  const suspiciousDomains = [
    'test.com', 'test.co.za', 'example.com', 'example.co.za',
    'email.com', 'mail.com', 'testmail.com', 'tempmail.com',
    'fakemail.com', 'dummy.com', 'sample.com', 'demo.com',
    'test.org', 'example.org', 'test.net', 'example.net',
    'domain.com', 'website.com', 'site.com', 'web.com'
  ];
  
  if (suspiciousDomains.includes(domain)) {
    return { isValid: false, error: 'Please enter a real email address' };
  }

  // Reject patterns where local part and domain are the same (e.g., test@test.com)
  if (localPart === domain.split('.')[0]) {
    return { isValid: false, error: 'Please enter a real email address' };
  }

  // Reject common fake email patterns (local@domain where both are suspicious)
  const fakePatterns = [
    /^test@test\./i,
    /^test@email\./i,
    /^test@mail\./i,
    /^123@123\./i,
    /^a@a\./i,
    /^abc@abc\./i,
    /^email@email\./i,
    /^mail@mail\./i,
    /^user@user\./i,
    /^admin@admin\./i,
    /^fake@fake\./i,
    /^dummy@dummy\./i,
    /^sample@sample\./i,
    /^demo@demo\./i,
  ];

  for (const pattern of fakePatterns) {
    if (pattern.test(trimmedEmail)) {
      return { isValid: false, error: 'Please enter a real email address' };
    }
  }

  // Reject emails where domain is just a generic word (like "email", "mail", "test")
  const genericDomainWords = ['email', 'mail', 'test', 'example', 'domain', 'website', 'site', 'web'];
  const domainBase = domain.split('.')[0];
  if (genericDomainWords.includes(domainBase) && domain.split('.').length <= 2) {
    return { isValid: false, error: 'Please enter a real email address' };
  }

  return { isValid: true };
}

// Phone number validation and cleaning for South African numbers
function validateAndCleanPhone(phone: string): { isValid: boolean; cleaned: string; error?: string } {
  if (!phone || phone.trim() === '') {
    return { isValid: false, cleaned: '', error: 'Phone number is required' };
  }

  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');

  // If it starts with 27 (country code), remove it
  if (cleaned.startsWith('27')) {
    cleaned = cleaned.substring(2);
  }

  // If it starts with 0, remove it (common South African format)
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  // Should be exactly 9 digits for South African mobile numbers
  if (cleaned.length !== 9) {
    return { 
      isValid: false, 
      cleaned, 
      error: cleaned.length < 9 
        ? 'Phone number is too short. Please enter 9 digits after +27' 
        : 'Phone number is too long. Please enter 9 digits after +27'
    };
  }

  // South African mobile numbers typically start with 6, 7, or 8
  const firstDigit = cleaned[0];
  if (!['6', '7', '8'].includes(firstDigit)) {
    return { 
      isValid: false, 
      cleaned, 
      error: 'Please enter a valid South African mobile number (should start with 6, 7, or 8)' 
    };
  }

  // Check for obviously fake numbers (all same digit, sequential, etc.)
  if (/^(\d)\1{8}$/.test(cleaned)) {
    return { isValid: false, cleaned, error: 'Please enter a valid phone number' };
  }

  return { isValid: true, cleaned };
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
  const subtotal = activeItems.reduce(
    (sum, i) => sum + (i.quantity * (i.discounted_price ?? i.base_price ?? 0)),
    0
  );
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
  const [validationErrors, setValidationErrors] = useState<{
    email?: string;
    phone?: string;
  }>({});

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
      const brandingItems = itemSelections.map((sel, selIdx) => {
        // Prefer logo_file (SVG) over artwork_url (original), convert to array format
        const logoFileValue = sel.logo_file || sel.artwork_url || null;
        const logoFileArray = logoFileValue ? [logoFileValue] : [];
        
        console.debug('[payload] branding row pre-map', {
          position: sel.branding_position,
          artwork_url: sel.artwork_url,
          logo_file: sel.logo_file,
        });
        
        const mappedRow = {
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
          logoFile: logoFileArray, // Prefer SVG, fallback to original
        };
        
        console.debug('[payload] branding row post-map', {
          position: mappedRow.brandingPosition,
          logoFile: mappedRow.logoFile,
        });
        
        return mappedRow;
      });

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

    // Validate email and phone before submission
    const emailValidation = validateEmail(form.email);
    const phoneValidation = validateAndCleanPhone(form.phone);

    if (!emailValidation.isValid || !phoneValidation.isValid) {
      setValidationErrors({
        email: emailValidation.isValid ? undefined : emailValidation.error,
        phone: phoneValidation.isValid ? undefined : phoneValidation.error
      });
      setMsg("Please fix the validation errors before submitting.");
      return;
    }

    // Clean phone number before submission
    if (phoneValidation.isValid && phoneValidation.cleaned !== form.phone) {
      setForm({ ...form, phone: phoneValidation.cleaned });
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
        
        // Build selections from cart items (most up-to-date, includes artwork_url from uploads)
        // Convert cart item branding to QuoteBrandingSelection format
        const selectionsFromCart = activeItems.flatMap(item => {
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
            logo_file: b.logo_file || null, // Include vectorized SVG URL
          }));
        });
        
        // Try to fetch from database as fallback, but prioritize cart data (especially artwork_url)
        let dbSelections: QuoteBrandingSelection[] = [];
        try {
          dbSelections = await fetchQuoteBrandingSelections(sessionToken, itemKeys);
        } catch (e) {
          console.warn('Failed to fetch selections from DB, will use cart item branding:', e);
        }
        
        // Use cart selections if available (they have the latest artwork_url from uploads)
        // Otherwise fall back to DB selections
        const selections = selectionsFromCart.length > 0 ? selectionsFromCart : dbSelections;
        
        // Debug: Log selections to verify logo_file and artwork_url are present
        console.debug('[payload] selections for payload', {
          selectionsCount: selections.length,
          selections: selections.map(s => ({
            position: s.branding_position,
            artwork_url: s.artwork_url,
            logo_file: s.logo_file,
            hasSvg: !!s.logo_file && s.logo_file.endsWith('.svg'),
          }))
        });
        
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
        
        // Log final payload with logoFile details
        const firstPayload = brandedPayload[0] as { items?: Array<{ brandingItems?: Array<{ logoFile?: unknown[] }> }> } | undefined;
        console.debug('[payload] final webhook payload', {
          itemsCount: Array.isArray(firstPayload?.items) ? firstPayload.items.length : 0,
          brandingItems: Array.isArray(firstPayload?.items) ? firstPayload.items.flatMap((item) => {
            return item.brandingItems?.map((bi) => ({
              logoFile: bi.logoFile,
              isSvg: Array.isArray(bi.logoFile) && bi.logoFile[0]?.toString().endsWith('.svg'),
            })) || [];
          }) : [],
        });
        
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
                      onChange={(e) => {
                        const email = e.target.value;
                        setForm({ ...form, email });
                        // Validate email
                        const validation = validateEmail(email);
                        setValidationErrors(prev => ({
                          ...prev,
                          email: validation.isValid ? undefined : validation.error
                        }));
                      }}
                      onBlur={(e) => {
                        // Re-validate on blur
                        const validation = validateEmail(e.target.value);
                        setValidationErrors(prev => ({
                          ...prev,
                          email: validation.isValid ? undefined : validation.error
                        }));
                      }}
                      className={cn("mt-1", validationErrors.email && "border-red-500 focus-visible:ring-red-500")}
                    />
                    {validationErrors.email && (
                      <p className="text-sm text-red-600 mt-1">{validationErrors.email}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Phone Number *</label>
                    <div className="flex mt-1">
                      <span className="inline-flex items-center px-3 text-sm text-gray-500 bg-gray-50 border border-r-0 border-gray-300 rounded-l-md">
                        +27
                      </span>
                      <Input
                        value={form.phone}
                        onChange={(e) => {
                          const phone = e.target.value;
                          // Clean and validate phone number
                          const validation = validateAndCleanPhone(phone);
                          if (validation.isValid) {
                            setForm({ ...form, phone: validation.cleaned });
                            setValidationErrors(prev => ({
                              ...prev,
                              phone: undefined
                            }));
                          } else {
                            // Still allow typing, but show error
                            setForm({ ...form, phone });
                            setValidationErrors(prev => ({
                              ...prev,
                              phone: validation.error
                            }));
                          }
                        }}
                        onBlur={(e) => {
                          // Clean phone number on blur
                          const validation = validateAndCleanPhone(e.target.value);
                          if (validation.isValid) {
                            setForm({ ...form, phone: validation.cleaned });
                            setValidationErrors(prev => ({
                              ...prev,
                              phone: undefined
                            }));
                          } else {
                            setValidationErrors(prev => ({
                              ...prev,
                              phone: validation.error
                            }));
                          }
                        }}
                        className={cn("rounded-l-none", validationErrors.phone && "border-red-500 focus-visible:ring-red-500")}
                      />
                    </div>
                    {validationErrors.phone && (
                      <p className="text-sm text-red-600 mt-1">{validationErrors.phone}</p>
                    )}
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
                {activeItems.length > 0 && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="font-medium">R {subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-base font-semibold border-t border-gray-300 pt-2">
                      <span>Total</span>
                      <span>R {subtotal.toFixed(2)}</span>
                    </div>
                  </>
                )}
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

