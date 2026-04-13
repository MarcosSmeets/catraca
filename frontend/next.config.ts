import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // API proxy: see app/api/[[...path]]/route.ts (explicit Set-Cookie forwarding; rewrites are unreliable for cookies).
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "api.qrserver.com",
      },
    ],
  },
};

export default nextConfig;
