import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize for Vercel deployment
  // output: 'standalone' is handled automatically by Vercel

  // Image optimization configuration
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.in',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  // Logging configuration for debugging
  logging: {
    fetches: {
      fullUrl: true,
    },
  },

  // Experimental features for better performance
  experimental: {
    // Enable optimized package imports
    optimizePackageImports: ['lucide-react', 'date-fns'],
  },

  // Headers are handled in vercel.json for API routes
  // Security headers are handled in middleware.ts
};

export default nextConfig;
