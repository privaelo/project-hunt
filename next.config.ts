import type { NextConfig } from "next";

// Dynamically set WORKOS_REDIRECT_URI based on the deployment environment
const getWorkosRedirectUri = () => {
  // If explicitly set, use that (for local development)
  if (process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI) {
    return process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI;
  }
  // For Vercel deployments
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/callback`;
  }
  // Fallback for local development
  return 'http://localhost:3000/callback';
};

// Helper to get Convex hostname from env
const getConvexRemotePattern = () => {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) return null;
  try {
    const url = new URL(convexUrl);
    return {
      protocol: url.protocol.replace(':', '') as 'http' | 'https',
      hostname: url.hostname,
    };
  } catch {
    return null;
  }
};

const convexRemotePattern = getConvexRemotePattern();

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'workoscdn.com',
      },
      {
        protocol: 'https',
        hostname: '*.convex.cloud',
      },
      {
        protocol: 'https',
        hostname: '*.convex.site',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
      },
      ...(convexRemotePattern ? [convexRemotePattern] : []),
    ],
  },
  env: {
    NEXT_PUBLIC_WORKOS_REDIRECT_URI: getWorkosRedirectUri(),
  },
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },
  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
