export type RagMethod = "semantic" | "keyword" | "hybrid";

export type RagStatus = "ready" | "processing" | "failed";

export type RagRecord = {
  id: string;
  name: string;
  documentIds: string[];
  documentNames: string[];
  method: RagMethod;
  chunkSize: number;
  chunkOverlap: number;
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
};

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
  chunkSize: number;
  chunkOverlap: number;
  embeddingModel: string;
  includeMetadata: boolean;
};
