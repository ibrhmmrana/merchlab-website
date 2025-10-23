"use client";
import { Search, Palette, Package } from "lucide-react";

const steps = [
  { icon: Search,  title: "Discover", body: "Browse categories and shortlist the pieces that fit your brief." },
  { icon: Palette, title: "Customise", body: "We guide you on finishes, placement and colour to suit your brand." },
  { icon: Package, title: "Deliver",   body: "Production begins and we keep you posted — right through to hand-over." },
];

export default function Process() {
  return (
    <section className="bg-white">
      <div className="max-w-7xl mx-auto px-4 py-14">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-8">How it works</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((s, i) => (
            <div key={s.title} className="rounded-2xl border p-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-[var(--ml-blue)]/10 grid place-items-center">
                  <s.icon className="h-5 w-5 text-[var(--ml-blue)]" />
                </div>
                <div className="text-sm text-gray-500">Step {i + 1}</div>
              </div>
              <h3 className="mt-3 font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-gray-600">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
