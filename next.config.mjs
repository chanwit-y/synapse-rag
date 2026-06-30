/** @type {import('next').NextConfig} */
const nextConfig = {
  // sqlite-vec resolves its native extension at runtime; bundling breaks it.
  // @azure/identity is a server-only dep (lazy-imported for Microsoft Foundry
  // token auth) and shouldn't be bundled.
  // unpdf (pdfjs), tesseract.js (workers/wasm) and @napi-rs/canvas (native) back
  // the SharePoint PDF parsing + OCR and must stay external, not bundled.
  serverExternalPackages: [
    "sqlite-vec",
    "@azure/identity",
    "unpdf",
    "tesseract.js",
    "@napi-rs/canvas",
  ],
};

export default nextConfig;
