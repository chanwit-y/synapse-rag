import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // sqlite-vec resolves its native extension at runtime; bundling breaks it.
  serverExternalPackages: ["sqlite-vec"],
};

export default nextConfig;
