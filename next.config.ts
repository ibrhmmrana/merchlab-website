import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'bmkdwnfrldoqvduhpgsu.supabase.co', pathname: '/storage/**' },
      // Barron / Azure buckets we've seen in data
      { protocol: 'https', hostname: 'barronapidevb9ca.blob.core.windows.net', pathname: '/**' },
      { protocol: 'https', hostname: 'daznsaapp02.blob.core.windows.net', pathname: '/**' },
      { protocol: 'https', hostname: 'paznsaapp02.blob.core.windows.net', pathname: '/**' },
      // Fallback wildcard (covers any other *.blob.core.windows.net buckets)
      { protocol: 'https', hostname: '*.blob.core.windows.net', pathname: '/**' },
      // Unsplash for homepage images
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
    ],
  },
};

export default nextConfig;
