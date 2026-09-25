import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export -> produces ./out, which Capacitor bundles into the native app
  output: "export",
  // No Next.js image optimization server in a static/native build
  images: { unoptimized: true },
};

export default nextConfig;
