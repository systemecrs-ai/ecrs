import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse', 'canvas', '@napi-rs/canvas'],
};

export default nextConfig;
