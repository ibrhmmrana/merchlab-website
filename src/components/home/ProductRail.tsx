"use client";
import Link from "next/link";
import SmartImage from "@/components/SmartImage";
import type { RailItem } from "@/lib/data/home";

export default function ProductRail({ items, title }: { items: RailItem[]; title: string }) {
  if (!items?.length) return null;
  return (
    <section className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex items-end justify-between mb-4">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h2>
        <Link href="/shop" className="text-[var(--ml-blue)] text-sm">Browse all →</Link>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:thin]">
        {items.map((g) => (
          <Link key={g.stock_header_id} href="/shop" className="min-w-[220px] max-w-[220px] rounded-2xl border bg-white hover:shadow-sm transition">
            <div className="relative aspect-square bg-gray-50 rounded-t-2xl overflow-hidden">
              <SmartImage src={g.representative_image_url || null} alt={g.group_name ?? "Product"} fill className="object-contain" sizes="220px" />
              <div className="absolute left-2 top-2 flex gap-1">
                {g.in_stock ? <span className="text-[10px] bg-green-600 text-white px-1.5 py-0.5 rounded">In: {g.in_stock}</span> : null}
                {g.incoming ? <span className="text-[10px] bg-amber-600 text-white px-1.5 py-0.5 rounded">ETA: {g.incoming}</span> : null}
              </div>
            </div>
            <div className="p-3">
              <div className="text-xs text-gray-500">{g.brand ?? "Barron"}</div>
              <div className="text-sm font-medium line-clamp-2">{g.group_name}</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}