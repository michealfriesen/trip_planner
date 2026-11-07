import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["opening_hours"],
  experimental: {
    serverActions: {
      bodySizeLimit: "32kb",
    },
  },
};

export default nextConfig;