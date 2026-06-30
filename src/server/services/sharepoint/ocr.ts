import { getDocumentProxy, renderPageAsImage } from "unpdf";
import type { Worker } from "tesseract.js";

/** Render PDF pages with @napi-rs/canvas (pdfjs needs a canvas). */
const canvasImport = () => import("@napi-rs/canvas");

/** Upscale factor when rasterizing pages — higher = better OCR, slower. */
const RENDER_SCALE = 2;
/** Cap pages OCR'd per document to bound runtime. */
const MAX_OCR_PAGES = 20;

let workerPromise: Promise<Worker> | null = null;

/** Lazily create a shared tesseract worker (English + Thai). */
async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = await import("tesseract.js");
      return createWorker(["eng", "tha"]);
    })();
  }
  return workerPromise;
}

/**
 * OCR a scanned PDF: rasterize each page and recognize text (eng+tha).
 * Best-effort — returns "" if rendering/OCR is unavailable. Bounded to
 * {@link MAX_OCR_PAGES} pages.
 */
export async function ocrPdf(bytes: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const total = Math.min(pdf.numPages, MAX_OCR_PAGES);
  const worker = await getWorker();

  const pages: string[] = [];
  for (let i = 1; i <= total; i++) {
    // pdfjs detaches the buffer it reads, so pass a fresh copy each page.
    const png = await renderPageAsImage(new Uint8Array(bytes), i, {
      canvasImport,
      scale: RENDER_SCALE,
    });
    const { data } = await worker.recognize(Buffer.from(png));
    const text = data.text?.trim();
    if (text) pages.push(text);
  }
  return pages.join("\n\n").trim();
}
