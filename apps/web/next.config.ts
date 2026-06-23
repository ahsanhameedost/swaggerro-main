import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Tree-shake heavy barrel imports (HeroUI + icon libs) so only the components
  // actually used ship to the browser — meaningfully smaller client bundle.
  experimental: {
    optimizePackageImports: ["@heroui/react", "lucide-react", "@heroicons/react"]
  }
};

export default nextConfig;
