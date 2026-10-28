import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  distDir: process.env.CUPO_VERIFY_PRODUCTION === "1" ? ".next-qa" : ".next",
};

export default nextConfig;
