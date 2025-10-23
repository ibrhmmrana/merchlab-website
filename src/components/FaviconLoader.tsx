"use client";

import { useEffect } from "react";
import { useLoadingStore } from "@/store/loading";

// Create a spinning favicon with MerchLab branding
function createSpinningFavicon() {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return null;
  
  // Create a spinning effect with MerchLab colors
  ctx.clearRect(0, 0, 32, 32);
  
  // Base circle with MerchLab brand color
  ctx.beginPath();
  ctx.arc(16, 16, 14, 0, Math.PI * 2);
  ctx.fillStyle = '#3B82F6'; // MerchLab blue
  ctx.fill();
  
  // Add spinning indicator with white
  const time = Date.now() / 100;
  ctx.beginPath();
  ctx.arc(16, 16, 10, time, time + Math.PI * 1.5);
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 3;
  ctx.stroke();
  
  // Add inner spinning dot
  ctx.beginPath();
  ctx.arc(16 + Math.cos(time) * 6, 16 + Math.sin(time) * 6, 2, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  
  return canvas.toDataURL('image/png');
}

// Use the actual MerchLab favicon
function getMerchLabFavicon() {
  return 'https://bmkdwnfrldoqvduhpgsu.supabase.co/storage/v1/object/public/Storage/ML%20Favicon.png';
}

export function FaviconLoader() {
  const { isPageLoading } = useLoadingStore();

  useEffect(() => {
    let animationId: number;
    let faviconLink: HTMLLinkElement | null = null;

    // Find or create favicon link
    const findOrCreateFaviconLink = () => {
      faviconLink = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      if (!faviconLink) {
        faviconLink = document.createElement('link');
        faviconLink.rel = 'icon';
        faviconLink.type = 'image/png';
        document.head.appendChild(faviconLink);
      }
      return faviconLink;
    };

    // Always ensure MerchLab favicon is set as default
    const setDefaultFavicon = () => {
      findOrCreateFaviconLink();
      if (faviconLink) {
        faviconLink.href = getMerchLabFavicon();
      }
    };

    if (isPageLoading) {
      // Start spinning animation
      const animate = () => {
        const favicon = createSpinningFavicon();
        if (favicon && faviconLink) {
          faviconLink.href = favicon;
        }
        animationId = requestAnimationFrame(animate);
      };
      
      findOrCreateFaviconLink();
      animate();
    } else {
      // Stop animation and set MerchLab favicon
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      
      setDefaultFavicon();
    }

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isPageLoading]);

  // Set default favicon on mount
  useEffect(() => {
    const faviconLink = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (faviconLink) {
      faviconLink.href = getMerchLabFavicon();
    }
  }, []);

  return null; // This component doesn't render anything
}
