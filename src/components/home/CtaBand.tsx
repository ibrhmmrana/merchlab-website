"use client";
import Link from "next/link";

export default function CtaBand(){
  return (
    <section className="my-10">
      <div className="max-w-7xl mx-auto px-4">
        <div className="rounded-2xl bg-gradient-to-r from-[var(--ml-blue)] to-[#4D87FF] text-white p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
          <div>
            <h3 className="text-xl md:text-2xl font-bold">Ready to bring your merch to life?</h3>
            <p className="text-white/95">Tell us what you need — we'll prepare a quick quote and guide you on finishes & branding.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/shop" className="px-4 py-2 rounded-xl bg-white text-[var(--ml-blue)] font-medium hover:brightness-95 transition">Shop</Link>
            <Link href="/cart" className="px-4 py-2 rounded-xl border border-white/80 text-white hover:bg-white/10 transition">Enquire now</Link>
          </div>
        </div>
      </div>
    </section>
  );
}