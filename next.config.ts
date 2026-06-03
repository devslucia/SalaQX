import type { NextConfig } from "next";

process.env.TZ = "America/Argentina/Buenos_Aires";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
