import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ["localhost", "aiverse.app"],
    remotePatterns: [
      { protocol: "https", hostname: "**" }
    ]
  },
  env: {
    NEXT_PUBLIC_APP_NAME: "AIverse",
    NEXT_PUBLIC_APP_DESCRIPTION: "Your Multi-Modal AI Workspace",
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:1337",
  }
};

export default nextConfig;
