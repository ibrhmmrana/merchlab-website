import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Us – MerchLab",
  description:
    "Learn about MerchLab, our mission, leadership, and how we make branded merchandise simple, fast and accessible.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gray-900 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 text-center">
          <p className="uppercase tracking-[0.25em] text-sm text-gray-400 mb-4 font-medium">
            About MerchLab
          </p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            Create. Customise. Deliver.
          </h1>
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-gray-300 leading-relaxed">
            We make branded merchandise simple, fast and accessible — giving
            every business the merchandising power of a big brand.
          </p>
          <div className="mt-8 inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-5 py-2 text-sm font-medium">
            <span className="inline-block w-2 h-2 rounded-full bg-green-400" />
            100 % Black-Owned &middot; BBBEE
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
        <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Our Mission
            </h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              MerchLab makes branded merchandise simple, fast and accessible.
              Our goal is to revolutionise custom merchandise by removing
              unnecessary friction and giving small businesses the same
              merchandising power as big brands. We make it easy to create,
              customise and deliver quality merchandise to whomever, whenever,
              and to launch drop-shipping stores effortlessly and hassle-free.
            </p>
            <p className="text-gray-600 leading-relaxed">
              At the heart of MerchLab is our belief that technology should do
              the heavy lifting. Our 24/7 online platform, powered by agentic AI
              and smart automation, streamlines every step — from faster quotes
              and consistent follow-ups to live order tracking — while people
              step in where judgment and nuance matter. We act as more than just
              a supplier; we are a strategic partner committed to enhancing your
              brand&apos;s presence and impact.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-gray-50 border border-gray-100 p-6 text-center">
              <p className="text-3xl font-bold text-gray-900">24/7</p>
              <p className="text-sm text-gray-500 mt-1">Online Platform</p>
            </div>
            <div className="rounded-2xl bg-gray-50 border border-gray-100 p-6 text-center">
              <p className="text-3xl font-bold text-gray-900">AI</p>
              <p className="text-sm text-gray-500 mt-1">Powered Automation</p>
            </div>
            <div className="rounded-2xl bg-gray-50 border border-gray-100 p-6 text-center">
              <p className="text-3xl font-bold text-gray-900">100%</p>
              <p className="text-sm text-gray-500 mt-1">Black-Owned</p>
            </div>
            <div className="rounded-2xl bg-gray-50 border border-gray-100 p-6 text-center">
              <p className="text-3xl font-bold text-gray-900">ZA</p>
              <p className="text-sm text-gray-500 mt-1">South African</p>
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <hr className="border-gray-200" />
      </div>

      {/* Leadership */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
        <div className="text-center mb-16">
          <p className="uppercase tracking-[0.2em] text-sm text-gray-400 font-medium mb-3">
            The People Behind MerchLab
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            Leadership
          </h2>
        </div>

        {/* Anita */}
        <div className="grid md:grid-cols-5 gap-10 md:gap-16 items-start mb-20">
          <div className="md:col-span-2 flex justify-center md:justify-start">
            <div className="relative w-64 h-[307px] rounded-2xl overflow-hidden shadow-lg ring-1 ring-gray-200">
              <Image
                src="/Anita_Mitchell.png"
                alt="Anita Modi Mitchell – Founder & Managing Director"
                fill
                className="object-cover object-top"
                sizes="(max-width: 768px) 256px, 256px"
                priority
              />
            </div>
          </div>
          <div className="md:col-span-3">
            <p className="text-sm uppercase tracking-wider text-gray-400 font-medium mb-1">
              Founder &amp; Managing Director
            </p>
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              Anita Modi Mitchell
            </h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              MerchLab is led by Founder and Managing Director Anita Modi
              Mitchell, a tech-first entrepreneur focused on using digital
              innovation to unlock commercial growth. With nearly two decades of
              experience in advertising and marketing, Anita has helped global
              and local brands connect more meaningfully with people and markets.
            </p>
            <p className="text-gray-600 leading-relaxed mb-6">
              She has guided businesses through brand repositioning, operational
              streamlining and the design of effective sales funnels that deepen
              customer engagement. This work has given her a practical,
              end-to-end view of how brand, communication and commercial strategy
              intersect — and how technology can bind them together. MerchLab is
              a direct continuation of this focus, turning cumbersome legacy
              operations into a responsive, data-enabled growth channel for
              clients.
            </p>
            <a
              href="https://www.linkedin.com/in/anita-modi-mitchell/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
              </svg>
              Connect on LinkedIn
            </a>
          </div>
        </div>

        {/* Cassim */}
        <div className="grid md:grid-cols-5 gap-10 md:gap-16 items-start">
          <div className="md:col-span-2 md:order-2 flex justify-center md:justify-end">
            <div className="relative w-64 h-[307px] rounded-2xl overflow-hidden shadow-lg ring-1 ring-gray-200">
              <Image
                src="/Cassim_Motala.png"
                alt="Cassim Motala – Investor"
                fill
                className="object-cover object-top"
                sizes="(max-width: 768px) 256px, 256px"
                priority
              />
            </div>
          </div>
          <div className="md:col-span-3 md:order-1">
            <p className="text-sm uppercase tracking-wider text-gray-400 font-medium mb-1">
              Investor
            </p>
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              Cassim Motala
            </h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              Supporting this vision is our investor, Cassim Motala. Cassim has a
              long track record in investment, entrepreneurship and value
              creation. He started his career in the late 1990s with an internet
              gaming start-up, helped build a global payments business and spent
              16 years in Private Equity at RMB Ventures, where he was a
              dealmaker and later co-head of the team.
            </p>
            <p className="text-gray-600 leading-relaxed mb-6">
              He served on the RMB Investment Committee, the RMB Management Board
              and several notable private equity boards. Cassim brings deep
              experience in building and scaling businesses, ensuring that
              MerchLab&apos;s ambition is backed by strong commercial and governance
              foundations.
            </p>
            <a
              href="https://www.linkedin.com/in/cassim-motala-931b031/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
              </svg>
              Connect on LinkedIn
            </a>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <hr className="border-gray-200" />
      </div>

      {/* Behind the Scenes */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
        <div className="max-w-3xl mx-auto text-center">
          <p className="uppercase tracking-[0.2em] text-sm text-gray-400 font-medium mb-3">
            Behind the Scenes
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">
            Meet Mia
          </h2>
          <p className="text-gray-600 leading-relaxed mb-6">
            Behind the scenes, Anita is supported by an agentic team responsible
            for sales, customer service and AI-enabled operations.
          </p>
          <p className="text-gray-600 leading-relaxed mb-6">
            <span className="font-semibold text-gray-900">Mia</span> is our
            Customer Experience Manager. She is the friendly, professional voice
            you will meet on email, WhatsApp and outbound and inbound calls. Mia
            helps you understand product options, branding choices and timelines.
            She guides you through quotes, answers questions and keeps you
            updated on your order. When something is unclear or delayed, she
            explains what is happening and what will happen next.
          </p>
          <p className="text-gray-600 leading-relaxed">
            Together, the platform, Mia, Anita and Cassim share one simple
            mission: to make high-quality branded merchandise easy to create,
            effortless to manage and genuinely useful in growing your brand.
          </p>
        </div>
      </section>

      {/* Company details bar */}
      <section className="bg-gray-50 border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">
                Registered Name
              </p>
              <p className="text-sm font-medium text-gray-700">
                Merch Lab (Pty) Ltd t/a MerchLab
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">
                BBBEE Status
              </p>
              <p className="text-sm font-medium text-gray-700">
                100% Black-Owned
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">
                Registration No.
              </p>
              <p className="text-sm font-medium text-gray-700">
                2023/983638/07
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">
                VAT Registration
              </p>
              <p className="text-sm font-medium text-gray-700">4690323557</p>
            </div>
          </div>

          {/* Social */}
          <div className="flex items-center justify-center gap-6 mt-10">
            <a
              href="https://www.linkedin.com/company/merchlabza/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-blue-600 transition-colors"
              aria-label="LinkedIn"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
              </svg>
            </a>
            <a
              href="https://www.instagram.com/merchlabza"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-pink-500 transition-colors"
              aria-label="Instagram"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </a>
            <a
              href="https://www.facebook.com/merchlabza"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-blue-700 transition-colors"
              aria-label="Facebook"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385h-3.047v-3.47h3.047v-2.642c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953h-1.514c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385c5.738-.9 10.126-5.864 10.126-11.854z" />
              </svg>
            </a>
            <a
              href="https://wa.me/27726187461"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-green-500 transition-colors"
              aria-label="WhatsApp"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Ready to elevate your brand?
          </h2>
          <p className="text-gray-400 mb-8 max-w-xl mx-auto">
            Browse our catalogue, get a quote, or reach out — we&apos;re here to
            help you create merchandise that matters.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/shop"
              className="inline-flex items-center px-6 py-3 bg-white text-gray-900 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
            >
              Shop Now
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center px-6 py-3 border border-white/30 text-white font-semibold rounded-lg hover:bg-white/10 transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
