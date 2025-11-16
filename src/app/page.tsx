import { Suspense } from "react";
import Hero from "@/components/home/Hero";
import ShopByCategory from "@/components/home/ShopByCategory";
import AboutSection from "@/components/home/AboutSection";
import Capabilities from "@/components/home/Capabilities";
import Process from "@/components/home/Process";
import CtaBand from "@/components/home/CtaBand";
import SuccessNotification from "@/components/SuccessNotification";

export const revalidate = 60;

export default async function HomePage() {
  return (
    <main className="bg-[#F9FAFB]">
      <Hero />
      <ShopByCategory />
      <AboutSection />
      <Capabilities />
      <Process />
      <CtaBand />
      <Suspense fallback={null}>
        <SuccessNotification />
      </Suspense>
    </main>
  );
}