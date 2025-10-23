"use client";
import { useCartStore, getCartItemKey } from "@/store/cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useHasHydrated } from "@/lib/hooks/useHasHydrated";
import SmartImage from "@/components/SmartImage";
import AddressAutocomplete from "@/components/AddressAutocomplete";

export default function CartPage() {
  const hydrated = useHasHydrated();
  const items = useCartStore((s) => s.items);
  const updateQty = useCartStore((s) => s.updateQty);
  const remove = useCartStore((s) => s.remove);
  const clear = useCartStore((s) => s.clear);

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
    country: "",
    lat: undefined as number | undefined,
    lng: undefined as number | undefined,
  });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [addressSearch, setAddressSearch] = useState("");
  const [addressSelected, setAddressSelected] = useState(false);

  function update<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function generateMerchantOrderNo() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const rand = Math.floor(1000 + Math.random()*9000);
    return `MLQ-${y}${m}${dd}-${rand}`;
  }

  function buildQuotePayload(merchantOrderNo: string) {
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
      itemCount: items.length,
      itemCost: items.reduce((sum, item) => sum + ((item.discounted_price || item.base_price || 0) * item.quantity), 0),
      brandingCost: 0,
      totalCost: items.reduce((sum, item) => sum + ((item.discounted_price || item.base_price || 0) * item.quantity), 0),
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
      items: items.map((item, idx) => {
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

  function getHexCodeForColour(colour: string | null): string {
    if (!colour) return "#000000";
    
    const colourMap: Record<string, string> = {
      "Black": "#000000",
      "White": "#FFFFFF",
      "Red": "#FF0000",
      "Blue": "#0000FF",
      "Green": "#008000",
      "Yellow": "#FFFF00",
      "Orange": "#FF6600",
      "Purple": "#800080",
      "Pink": "#FFC0CB",
      "Brown": "#A52A2A",
      "Grey": "#808080",
      "Gray": "#808080",
      "Charcoal": "#25282A",
      "Navy": "#000080",
      "Royal": "#06038D",
      "Khaki": "#B9975B",
      "Tan": "#D2B48C",
      "Olive": "#808000",
      "Silver": "#C0C0C0",
      "Gold": "#FFD700",
    };

    return colourMap[colour] || "#000000";
  }

  async function submitQuote() {
    setSubmitting(true);
    setMsg(null);
    try {
      const mon = generateMerchantOrderNo();
      const fullEnquiryJson = buildQuotePayload(mon);
      
      // Debug: Log stock_id verification
      console.log("=== STOCK ID VERIFICATION ===");
      items.forEach((item, idx) => {
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
        items: items.map(item => ({
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
      
      // Clear cart and redirect to home with success message
      clear();
      
      // Store success message in sessionStorage for the home page to display
      sessionStorage.setItem('quoteSuccess', 'true');
      
      // Redirect to home page
      window.location.href = '/';
    } catch (e: any) {
      setMsg(e.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Order Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Product Section */}
            <div className="bg-white rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Product</h2>
              {items.length === 0 ? (
                <div className="text-muted-foreground">Your cart is empty.</div>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => {
                    const itemKey = getCartItemKey(item);
                    return (
                      <div key={itemKey} className="flex items-center gap-4 border rounded p-3">
                        <div className="relative w-20 h-20 rounded bg-gray-50 overflow-hidden">
                          <SmartImage src={item.image_url || null} alt={item.description || item.stock_code} fill className="object-contain" sizes="80px" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium leading-tight truncate">{item.description || item.stock_code}</div>
                          <div className="text-sm text-muted-foreground truncate">
                            {item.brand || "Barron"} • {item.colour} • {item.size}
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              className="h-7 w-7 rounded border text-sm"
                              onClick={() => updateQty(itemKey, Math.max(1, item.quantity - 1))}
                              aria-label="Decrease quantity"
                            >
                              −
                            </button>
                            <span className="text-sm w-6 text-center">{item.quantity}</span>
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
              )}

            </div>

            {/* Contact Details */}
            <div className="bg-white rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">RECIPIENT DETAILS</h2>
              <h3 className="text-md font-medium mb-4">Contact Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">First Name *</label>
                  <Input
                    value={form.firstName}
                    onChange={(e) => update("firstName", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Last Name *</label>
                  <Input
                    value={form.lastName}
                    onChange={(e) => update("lastName", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Email *</label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
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
                      onChange={(e) => update("phone", e.target.value)}
                      className="rounded-l-none"
                    />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Company Name</label>
                  <Input
                    value={form.company}
                    onChange={(e) => update("company", e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Address Details */}
            <div className="bg-white rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">ADDRESS DETAILS</h2>
              <h3 className="text-md font-medium mb-4">Shipping Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Address Search</label>
                  <AddressAutocomplete
                    value={addressSearch}
                    onChange={setAddressSearch}
                    onAddressParsed={(addr) => {
                      console.log('Form updating with address:', addr);
                      
                      // If address is being cleared, hide individual fields
                      if (!addr.street && !addr.city && !addr.formattedAddress) {
                        console.log('Clearing address fields');
                        setAddressSelected(false);
                        setForm((f) => ({
                          ...f,
                          street: "",
                          suburb: "",
                          city: "",
                          province: "",
                          postalCode: "",
                          country: "",
                          lat: undefined,
                          lng: undefined,
                        }));
                        return;
                      }
                      
                      // Show individual fields and populate them
                      console.log('Showing address fields and populating');
                      setAddressSelected(true);
                      setForm((f) => ({
                        ...f,
                        street: addr.street || "",
                        suburb: addr.suburb || "",
                        city: addr.city || "",
                        province: addr.province || "",
                        postalCode: addr.postalCode || "",
                        country: addr.country || f.country || "South Africa",
                        // Optionally track coords if your payload supports it:
                        lat: addr.lat,
                        lng: addr.lng,
                      }));
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
                        onChange={(e) => update("street", e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Suburb</label>
                      <Input
                        value={form.suburb}
                        onChange={(e) => update("suburb", e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">City</label>
                      <Input
                        value={form.city}
                        onChange={(e) => update("city", e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Province</label>
                      <Input
                        value={form.province}
                        onChange={(e) => update("province", e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Postal Code</label>
                      <Input
                        value={form.postalCode}
                        onChange={(e) => update("postalCode", e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Country</label>
                      <Input
                        value={form.country}
                        onChange={(e) => update("country", e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Summary */}
          <div className="lg:col-span-1">
            <div className="bg-gray-100 rounded-lg p-6 sticky top-6">
              <h2 className="text-lg font-semibold mb-4">Summary</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Products</span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                    {items.length} products
                  </span>
                </div>
                
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
                  disabled={submitting || items.length === 0 || !termsAccepted}
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