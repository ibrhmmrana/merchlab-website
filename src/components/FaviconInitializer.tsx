"use client";

import { useEffect } from "react";

export function FaviconInitializer() {
  useEffect(() => {
    // Ensure MerchLab favicon is set on all pages
    const setFavicon = () => {
      const faviconUrl = "https://bmkdwnfrldoqvduhpgsu.supabase.co/storage/v1/object/public/Storage/ML%20Favicon.png";
      
      // Set main favicon
      let faviconLink = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      if (!faviconLink) {
        faviconLink = document.createElement('link');
        faviconLink.rel = 'icon';
        faviconLink.type = 'image/png';
        document.head.appendChild(faviconLink);
      }
      faviconLink.href = faviconUrl;
      
      // Set shortcut icon
      let shortcutLink = document.querySelector('link[rel="shortcut icon"]') as HTMLLinkElement;
      if (!shortcutLink) {
        shortcutLink = document.createElement('link');
        shortcutLink.rel = 'shortcut icon';
        shortcutLink.type = 'image/png';
        document.head.appendChild(shortcutLink);
      }
      shortcutLink.href = faviconUrl;
      
      // Set apple-touch-icon
      let appleLink = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
      if (!appleLink) {
        appleLink = document.createElement('link');
        appleLink.rel = 'apple-touch-icon';
        document.head.appendChild(appleLink);
      }
      appleLink.href = faviconUrl;
    };

    // Set favicon immediately
    setFavicon();
    
    // Also set it after a short delay to ensure it overrides any default
    const timer = setTimeout(setFavicon, 100);
    
    return () => clearTimeout(timer);
  }, []);

  return null;
}
