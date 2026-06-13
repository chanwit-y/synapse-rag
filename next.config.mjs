/** @type {import('next').NextConfig} */
const nextConfig = {
  // sqlite-vec resolves its native extension at runtime; bundling breaks it.
  serverExternalPackages: ["sqlite-vec"],
};

export default nextConfig;
