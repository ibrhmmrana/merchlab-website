import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import { GlobalLoadingProvider } from "@/components/GlobalLoadingProvider";
import CookieConsent from "@/components/CookieConsent";

export const metadata: Metadata = {
  title: "MerchLab - Premium Merchandise Solutions",
  description: "High-quality merchandise and promotional products for your business needs",
  icons: {
    icon: [
      {
        url: "https://bmkdwnfrldoqvduhpgsu.supabase.co/storage/v1/object/public/Storage/ML%20Favicon.png",
        type: "image/png",
      },
    ],
    shortcut: "https://bmkdwnfrldoqvduhpgsu.supabase.co/storage/v1/object/public/Storage/ML%20Favicon.png",
    apple: "https://bmkdwnfrldoqvduhpgsu.supabase.co/storage/v1/object/public/Storage/ML%20Favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <GlobalLoadingProvider>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
            <CartDrawer />
            <CookieConsent />
          </div>
        </GlobalLoadingProvider>
      </body>
    </html>
  );
}
