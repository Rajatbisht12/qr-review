import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow remote tenant logos to be used with next/image if desired later.
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
