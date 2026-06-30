import mammoth from "mammoth";
import TurndownService from "turndown";
import { extractText, getDocumentProxy } from "unpdf";
import { unzipSync, strFromU8 } from "fflate";
import * as XLSX from "xlsx";
import type { SourceFormat } from "@/server/db/schema/enums";

/** Extensions we know how to turn into Markdown, mapped to their source format. */
const FORMAT_BY_EXT: Record<string, SourceFormat> = {
  pdf: "pdf",
  docx: "docx",
  xlsx: "xlsx",
  xlsm: "xlsx",
  xls: "xlsx",
  pptx: "pptx",
  md: "md",
  markdown: "md",
  txt: "txt",
};

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
});

export interface ParsedDocument {
  markdown: string;
  sourceFormat: SourceFormat;
}

/** Lowercased file extension (without the dot), or "" when there is none. */
export function fileExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

/** True when a file's extension is one we can extract text from. */
export function isSupportedFile(name: string): boolean {
  return fileExtension(name) in FORMAT_BY_EXT;
}

/** The handful of XML entities slide/cell text uses. */
function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&");
}

/** Below this many extracted chars a PDF is treated as scanned → OCR fallback. */
const MIN_PDF_TEXT_CHARS = 20;

async function parsePdf(bytes: Uint8Array): Promise<string> {
  // pdfjs transfers (detaches) the ArrayBuffer it's given, which would corrupt
  // a buffer shared with the fetch response — pass it an independent copy.
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const { text } = await extractText(pdf, { mergePages: true });
  const extracted = (Array.isArray(text) ? text.join("\n\n") : text).trim();
  if (extracted.length >= MIN_PDF_TEXT_CHARS) return extracted;

  // Scanned / image-only PDF: fall back to OCR (best-effort, lazily loaded so
  // tesseract/canvas stay out of the path for text-based files).
  try {
    const { ocrPdf } = await import("./ocr");
    const ocr = await ocrPdf(bytes);
    return ocr.length > extracted.length ? ocr : extracted;
  } catch {
    return extracted;
  }
}

async function parseDocx(buffer: Buffer): Promise<string> {
  const { value: html } = await mammoth.convertToHtml({ buffer });
  // Drop images (mammoth would otherwise inline them as huge data URIs).
  const withoutImages = html.replace(/<img\b[^>]*>/gi, "");
  return turndown.turndown(withoutImages).trim();
}

/** Render a worksheet's rows as a GitHub-flavored Markdown table. */
function sheetToMarkdown(rows: unknown[][]): string {
  const cells = rows.map((row) =>
    row.map((c) => (c == null ? "" : String(c).replace(/\|/g, "\\|").replace(/\n/g, " "))),
  );
  const width = cells.reduce((max, row) => Math.max(max, row.length), 0);
  if (width === 0) return "";

  const pad = (row: string[]) =>
    `| ${Array.from({ length: width }, (_, i) => row[i] ?? "").join(" | ")} |`;

  const [header, ...body] = cells;
  const lines = [
    pad(header ?? []),
    `| ${Array.from({ length: width }, () => "---").join(" | ")} |`,
    ...body.map(pad),
  ];
  return lines.join("\n");
}

function parseXlsx(buffer: Buffer): string {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sections: string[] = [];
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    if (!ws) continue;
    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
      header: 1,
      blankrows: false,
      defval: "",
    });
    const table = sheetToMarkdown(rows);
    if (table) sections.push(`## ${name}\n\n${table}`);
  }
  return sections.join("\n\n").trim();
}

/** PPTX is a zip of slide XML; pull the text runs (`<a:t>`) per slide, in order. */
function parsePptx(bytes: Uint8Array): string {
  const files = unzipSync(bytes);
  const slidePaths = Object.keys(files)
    .filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
    .sort((a, b) => {
      const na = Number(a.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
      const nb = Number(b.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
      return na - nb;
    });

  const sections: string[] = [];
  slidePaths.forEach((path, idx) => {
    const xml = strFromU8(files[path]);
    const runs = [...xml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)].map((m) =>
      decodeXmlEntities(m[1]),
    );
    const text = runs.join(" ").replace(/\s+/g, " ").trim();
    if (text) sections.push(`## Slide ${idx + 1}\n\n${text}`);
  });
  return sections.join("\n\n").trim();
}

/**
 * Extract Markdown from a downloaded file's bytes based on its extension.
 * Returns null for unsupported types so the caller can skip-and-report.
 */
export async function parseFileToMarkdown(
  name: string,
  buffer: Buffer,
): Promise<ParsedDocument | null> {
  const ext = fileExtension(name);
  const sourceFormat = FORMAT_BY_EXT[ext];
  if (!sourceFormat) return null;

  const bytes = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  let markdown = "";
  switch (sourceFormat) {
    case "pdf":
      markdown = await parsePdf(bytes);
      break;
    case "docx":
      markdown = await parseDocx(buffer);
      break;
    case "xlsx":
      markdown = parseXlsx(buffer);
      break;
    case "pptx":
      markdown = parsePptx(bytes);
      break;
    case "md":
    case "txt":
      markdown = buffer.toString("utf8").replace(/\r\n/g, "\n").trim();
      break;
  }

  return { markdown, sourceFormat };
}
