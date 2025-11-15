import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import { GlobalLoadingProvider } from "@/components/GlobalLoadingProvider";
import CookieConsent from "@/components/CookieConsent";
import { BrandingProvider } from "@/components/providers/BrandingProvider";

export const metadata: Metadata = {
  metadataBase: new URL('https://merchlab.io'),
  title: 'MerchLab – Premium Merchandise Solutions',
  description: 'High-quality merchandise and professional brand support.',
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
  openGraph: {
    type: 'website',
    locale: 'en_ZA',
    url: 'https://merchlab.io',
    siteName: 'MerchLab',
    title: 'MerchLab – Premium Merchandise Solutions',
    description: 'High-quality merchandise and professional brand support.',
    images: [{
      url: 'https://bmkdwnfrldoqvduhpgsu.supabase.co/storage/v1/object/public/Storage/ML%20Preview%20Image.png',
      width: 1200,
      height: 630,
      alt: 'MerchLab – Premium Merchandise Solutions'
    }]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MerchLab – Premium Merchandise Solutions',
    description: 'High-quality merchandise and professional brand support.',
    images: ['https://bmkdwnfrldoqvduhpgsu.supabase.co/storage/v1/object/public/Storage/ML%20Preview%20Image.png']
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <BrandingProvider>
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
        </BrandingProvider>
      </body>
    </html>
  );
}
