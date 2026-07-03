import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Live product images are served from the API's public bucket/CDN — allow
  // next/image to optimize them (local /public assets need no entry here).
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "swaggeroo.osdevlabs.com" },
      { protocol: "https", hostname: "**.amazonaws.com" },
      { protocol: "http", hostname: "localhost" },
    ],
  },
  // Tree-shake heavy barrel imports (HeroUI + icon libs) so only the components
  // actually used ship to the browser — meaningfully smaller client bundle.
  experimental: {
    optimizePackageImports: ["@heroui/react", "lucide-react", "@heroicons/react"]
  }
};

export default nextConfig;
