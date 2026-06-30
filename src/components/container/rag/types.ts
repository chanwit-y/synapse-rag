export type RagMethod = "semantic" | "keyword" | "hybrid";

/** How a document's text is split into chunks before embedding. */
export type RagChunkStrategy =
  | "fixed"
  | "recursive"
  | "markdown"
  | "sentence"
  | "custom"
  | "auto"
  | "semantic";

/** Unit chunkSize / chunkOverlap are measured in. */
export type RagSizingUnit = "chars" | "tokens";

export type RagStatus = "ready" | "processing" | "failed";

export type RagRecord = {
  id: string;
  name: string;
  documentIds: string[];
  documentNames: string[];
  method: RagMethod;
  chunkStrategy: RagChunkStrategy;
  sizingUnit: RagSizingUnit;
  chunkSize: number;
  chunkOverlap: number;
  /** Ordered separators for the `custom` strategy (a `re:` prefix marks a regex). */
  customSeparators?: string[];
  /** Percentile (1–99) for `semantic` method splitting; undefined ⇒ default 95. */
  semanticThreshold?: number;
  embeddingModel?: string;
  includeMetadata?: boolean;
  chunkCount: number;
  status: RagStatus;
  updatedAt: string;
};

/** Which language variant of a document's content is being indexed. */
export type ContentLang = "en" | "th";

export type DocumentOption = {
  id: string;
  name: string;
  collection: string;
  /** English source content. */
  content: string;
  /** Thai translation, or `null` when the document has not been translated. */
  contentTh: string | null;
  /** Original file format (drives the `auto` strategy); null ⇒ treat as markdown. */
  sourceFormat: SourceFormat | null;
};

/** Original file format an imported document was extracted from. */
export type SourceFormat = "pdf" | "docx" | "xlsx" | "pptx" | "md" | "txt";

export type ChunkRecord = {
  id: string;
  index: number;
  documentId: string;
  documentName: string;
  content: string;
  charCount: number;
  tokenEstimate: number;
  /** Language of the source document this chunk was derived from. */
  lang: ContentLang;
};

export type RagFormValues = {
  name: string;
  documentIds: string[];
  method: RagMethod;
  chunkStrategy: RagChunkStrategy;
  sizingUnit: RagSizingUnit;
  chunkSize: number;
  chunkOverlap: number;
  /** Ordered separators for the `custom` strategy (a `re:` prefix marks a regex). */
  customSeparators?: string[];
  /** Percentile (1–99) for `semantic` method splitting; undefined ⇒ default 95. */
  semanticThreshold?: number;
  embeddingModel: string;
  includeMetadata: boolean;
};
