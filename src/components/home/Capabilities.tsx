"use client";
import { Cpu, Leaf, LifeBuoy, BadgeCheck, Brush, Stamp } from "lucide-react";

const pillars = [
  {
    icon: Cpu,
    title: "Technology-driven",
    body: "Workflow automation and real-time status updates keep your order moving and visible.",
  },
  {
    icon: Leaf,
    title: "Quality that lasts",
    body: "Tried-and-tested products with careful QA so your merch looks sharp and wears well.",
  },
  {
    icon: LifeBuoy,
    title: "Full-service support",
    body: "From brief to delivery — we advise on styles, branding and logistics at every step.",
  },
];

const methods = [
  { icon: BadgeCheck, title: "Embroidery" },
  { icon: Brush,      title: "Screen print" },
  { icon: Stamp,      title: "Digital transfer" },
  { icon: BadgeCheck, title: "Laser etch" },
  { icon: Brush,      title: "UV print" },
];

export default function Capabilities() {
  return (
    <section className="bg-[#F9FAFB]">
      <div className="max-w-7xl mx-auto px-4 py-14 space-y-10">
        <div className="grid md:grid-cols-3 gap-6">
          {pillars.map((p) => (
            <div key={p.title} className="rounded-2xl border bg-white p-6 hover:shadow-sm transition">
              <p.icon className="h-6 w-6 text-[var(--ml-blue)]" />
              <h3 className="mt-4 font-semibold text-lg">{p.title}</h3>
              <p className="mt-2 text-sm text-gray-600">{p.body}</p>
            </div>
          ))}
        </div>

        <div>
          <h3 className="text-xl md:text-2xl font-bold tracking-tight mb-4">Branding methods</h3>
          <div className="flex flex-wrap gap-3">
            {methods.map((m) => (
              <div key={m.title} className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1.5">
                <m.icon className="h-4 w-4 text-[var(--ml-blue)]" />
                <span className="text-sm">{m.title}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
