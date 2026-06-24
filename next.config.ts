import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // sqlite-vec resolves its native extension at runtime; bundling breaks it.
  // @azure/identity is a server-only dep (lazy-imported for Microsoft Foundry
  // token auth) and shouldn't be bundled.
  serverExternalPackages: ["sqlite-vec", "@azure/identity"],
};

export default nextConfig;
