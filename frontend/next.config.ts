import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Browser requests must use NEXT_PUBLIC_API_URL = {site origin}/api so Set-Cookie (refresh_token)
  // lands on the same host as the Next app; middleware then sees the cookie on /tickets, /cart, etc.
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.BACKEND_URL ?? "http://localhost:8080"}/:path*`,
      },
    ];
  },
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
