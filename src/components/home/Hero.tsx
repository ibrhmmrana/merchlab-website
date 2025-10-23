"use client";
import Link from "next/link";
import SmartImage from "@/components/SmartImage";

export default function Hero() {
  return (
    <section className="relative overflow-hidden min-h-[60vh] md:min-h-[80vh]">
          {/* Background image */}
      <div 
        className="absolute inset-0 bg-cover bg-center md:bg-center bg-no-repeat hero-bg-position"
      />
      {/* Black overlay at 45% opacity on mobile only */}
      <div className="absolute inset-0 bg-black/45 md:bg-transparent" />
      {/* Grid noise overlay */}
      <div className="absolute inset-0 ml-grid-noise pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 pt-20 md:pt-32 pb-32">
            {/* Reseller badge with Barron logo (dark mark on light pill for contrast) */}
            <div className="inline-flex items-center gap-3 rounded-full bg-white/90 text-[15px] text-[var(--ml-ink)] px-4 py-2 ring-1 ring-black/5 mb-6">
              <span className="relative inline-block w-6 h-6">
                <SmartImage
                  src="https://bmkdwnfrldoqvduhpgsu.supabase.co/storage/v1/object/public/Storage/Barron%20Logo.png"
                  alt="Barron"
                  fill
                  className="object-contain"
                  sizes="24px"
                />
              </span>
              Authorised Barron Reseller
            </div>

        {/* Headline (do not use the word Barron) */}
        <h1 className="text-white font-extrabold tracking-tight leading-[1.05] text-4xl md:text-6xl max-w-5xl">
        Your Brand,<br className="hidden md:block" /> Perfectly Personalised
</h1>


        <p className="mt-5 text-white/85 text-base md:text-lg max-w-2xl">
          We build premium, on-brand merchandise without the busywork — fast lead times, clear
          tracking, and hands-on support from brief to delivery.
        </p>

        <div className="mt-8 flex gap-3">
          <Link
            href="/shop"
            className="px-6 py-4 rounded-xl bg-white text-[var(--ml-blue)] font-semibold shadow-xl shadow-black/20 hover:bg-gray-50 hover:shadow-2xl hover:shadow-black/30 transition-all duration-200 transform hover:scale-105"
          >
            Shop now
          </Link>
              <Link
                href="/contact"
                className="px-5 py-3 rounded-xl border border-white/25 text-white/90 hover:bg-white/10 transition"
              >
                Contact Us
              </Link>
        </div>
      </div>
    </section>
  );
}