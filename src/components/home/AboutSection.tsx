"use client";

export default function AboutSection() {
  return (
    <section className="bg-white">
      <div className="max-w-7xl mx-auto px-4 py-14 grid md:grid-cols-2 gap-10">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Built for teams that care about the details</h2>
          <p className="mt-4 text-gray-600">
            MerchLab exists to help brands express who they are through thoughtful, high-quality merchandise.
            What started as a small creative project has become a dedicated merch studio focused on
            reliability, design craft, and service. We combine smart tooling with a partner-first mindset so
            every item lands exactly as imagined.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl border p-5">
            <div className="text-2xl md:text-3xl font-extrabold">1 minute </div>
            <div className="text-sm text-gray-600">Typical quote turnaround</div>
          </div>
          <div className="rounded-2xl border p-5">
            <div className="text-2xl md:text-3xl font-extrabold">10k+</div>
            <div className="text-sm text-gray-600">SKUs available</div>
          </div>
          <div className="rounded-2xl border p-5">
            <div className="text-2xl md:text-3xl font-extrabold">End-to-end</div>
            <div className="text-sm text-gray-600">Consult, design, fulfil</div>
          </div>
          <div className="rounded-2xl border p-5">
            <div className="text-2xl md:text-3xl font-extrabold">Sustainable</div>
            <div className="text-sm text-gray-600">Curated materials & options</div>
          </div>
        </div>
      </div>
    </section>
  );
}
