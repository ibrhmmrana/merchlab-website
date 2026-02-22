import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import CartDrawer from "@/components/CartDrawer";
import { GlobalLoadingProvider } from "@/components/GlobalLoadingProvider";
import CookieConsent from "@/components/CookieConsent";
import { BrandingProvider } from "@/components/providers/BrandingProvider";
import { ConditionalFooter } from "@/components/ConditionalFooter";
import { ConditionalHeader } from "@/components/ConditionalHeader";
import WhatsAppWidget from "@/components/WhatsAppWidget";

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
        {/* Meta Pixel (Facebook) */}
        <Script
          id="meta-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '1688658625454431');
fbq('track', 'PageView');
            `,
          }}
        />
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=1688658625454431&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
        <BrandingProvider>
        <GlobalLoadingProvider>
          <div className="min-h-screen flex flex-col">
            <ConditionalHeader />
            <main className="flex-1">
              {children}
            </main>
            <ConditionalFooter />
            <CartDrawer />
            <CookieConsent />
            <WhatsAppWidget />
          </div>
        </GlobalLoadingProvider>
        </BrandingProvider>
      </body>
    </html>
  );
}
