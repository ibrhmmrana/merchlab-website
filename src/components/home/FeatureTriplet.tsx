"use client";
import { Cpu, Leaf, LifeBuoy } from "lucide-react";

const features = [
  {
    icon: Cpu,
    title: "Technology-driven",
    body: "Advanced tools streamline workflows with real-time tracking — smooth, fast and transparent."
  },
  {
    icon: Leaf,
    title: "High quality & sustainable",
    body: "Curated, durable products that reflect your values and delight your audience."
  },
  {
    icon: LifeBuoy,
    title: "Full-service support",
    body: "From consultation to design to delivery — your end-to-end merch partner."
  },
];

export default function FeatureTriplet() {
  return (
    <section className="bg-white">
      <div className="max-w-7xl mx-auto px-4 py-14">
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border p-6 hover:shadow-sm transition">
              <f.icon className="h-6 w-6 text-[var(--ml-blue)]" />
              <h3 className="mt-4 font-semibold text-lg">{f.title}</h3>
              <p className="mt-2 text-sm text-gray-600">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
