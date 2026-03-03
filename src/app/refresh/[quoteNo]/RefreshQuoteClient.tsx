"use client";

import { useState } from "react";
import Link from "next/link";
import SmartImage from "@/components/SmartImage";
import { Button } from "@/components/ui/button";

export type QuoteDisplayItem = {
  description: string;
  colour: string;
  size: string;
  requested_qty: number;
  price: number;
  line_total: number;
  image_url: string | null;
  branding?: Array<{ brandingType: string; brandingPosition: string; brandingSize: string }>;
};

export type QuoteDisplayTotals = {
  subtotal: number;
  delivery_fee: number;
  vat: number;
  grand_total: number;
};

export type QuoteDisplayCustomer = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  company?: string;
};

export type QuoteDisplayAddress = {
  street: string;
  suburb: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
};

export type QuoteDisplayData = {
  quoteNo: string;
  items: QuoteDisplayItem[];
  totals: QuoteDisplayTotals;
  customer: QuoteDisplayCustomer;
  shipping_address: QuoteDisplayAddress;
};

type Props = {
  data: QuoteDisplayData;
};

export default function RefreshQuoteClient({ data }: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleRefresh() {
    setStatus("loading");
    setMessage(null);
    try {
      const res = await fetch("/api/refresh-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteNo: data.quoteNo }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus("success");
        setMessage(json.message ?? "Quote resent successfully.");
      } else {
        setStatus("error");
        setMessage(json.error ?? "Failed to resend quote.");
      }
    } catch {
      setStatus("error");
      setMessage("Failed to resend quote.");
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Quote {data.quoteNo}</h1>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleRefresh}
            disabled={status === "loading"}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {status === "loading" ? "Sending…" : "Refresh quote"}
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Back to shop</Link>
          </Button>
        </div>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg text-sm ${
            status === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
          }`}
        >
          {message}
        </div>
      )}

      <div className="space-y-8">
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Items</h2>
          <ul className="space-y-4">
            {data.items.map((item, idx) => (
              <li key={idx} className="flex gap-4 border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                <div className="relative w-24 h-24 rounded bg-gray-100 overflow-hidden flex-shrink-0">
                  <SmartImage
                    src={item.image_url || null}
                    alt={item.description}
                    fill
                    className="object-contain"
                    sizes="96px"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900">{item.description}</p>
                  <p className="text-sm text-gray-600">
                    {item.colour} &middot; Size {item.size} &middot; Qty {item.requested_qty}
                  </p>
                  {item.branding && item.branding.length > 0 && (
                    <div className="mt-1 text-xs text-gray-500">
                      {item.branding.map((b, i) => (
                        <span key={i}>
                          {b.brandingType}, {b.brandingPosition}, {b.brandingSize}
                          {i < item.branding!.length - 1 ? "; " : ""}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-medium text-gray-900">R {item.line_total}</p>
                  <p className="text-xs text-gray-500">R {item.price} each</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-600">Subtotal</dt>
              <dd>R {data.totals.subtotal}</dd>
            </div>
            {data.totals.delivery_fee > 0 && (
              <div className="flex justify-between">
                <dt className="text-gray-600">Delivery</dt>
                <dd>R {data.totals.delivery_fee}</dd>
              </div>
            )}
            {data.totals.vat > 0 && (
              <div className="flex justify-between">
                <dt className="text-gray-600">VAT (15%)</dt>
                <dd>R {data.totals.vat}</dd>
              </div>
            )}
            <div className="flex justify-between font-semibold text-base pt-2 border-t border-gray-200">
              <dt>Total</dt>
              <dd>R {data.totals.grand_total}</dd>
            </div>
          </dl>
        </section>

        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer</h2>
          <p className="text-gray-700">
            {data.customer.first_name} {data.customer.last_name}
          </p>
          {data.customer.company && <p className="text-gray-600 text-sm">{data.customer.company}</p>}
          <p className="text-gray-600 text-sm">{data.customer.email}</p>
          <p className="text-gray-600 text-sm">{data.customer.phone}</p>
        </section>

        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Delivery address</h2>
          <address className="text-gray-700 not-italic text-sm">
            {data.shipping_address.street && <span>{data.shipping_address.street}<br /></span>}
            {data.shipping_address.suburb && <span>{data.shipping_address.suburb}<br /></span>}
            {(data.shipping_address.city || data.shipping_address.province || data.shipping_address.postal_code) && (
              <span>
                {[data.shipping_address.city, data.shipping_address.province, data.shipping_address.postal_code].filter(Boolean).join(" ")}
                <br />
              </span>
            )}
            {data.shipping_address.country && <span>{data.shipping_address.country}</span>}
          </address>
        </section>
      </div>
    </div>
  );
}
