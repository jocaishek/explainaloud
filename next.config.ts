import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  // The dev-only overlay badge sits bottom-left, right on top of the landing
  // page's footer wordmark. It never ships in a production build; this just
  // keeps it out of the way while working on the design.
  devIndicators: false,
};

export default nextConfig;
