import type { DocumentOption, RagRecord } from "./types";

export const SAMPLE_DOCUMENTS: DocumentOption[] = [
  {
    id: "doc-1",
    name: "introduction.md",
    collection: "Documentation / getting-started",
    content: `# Introduction

Welcome to Synapse Rumi. This guide covers the core concepts you need to get started with document management and retrieval-augmented generation.

## What is RAG?

Retrieval-augmented generation combines your private documents with a language model. The system retrieves relevant chunks at query time and passes them as context to improve answer quality.

## Key benefits

- Ground responses in your own data
- Reduce hallucinations on domain-specific topics
- Keep knowledge bases up to date without retraining models`,
    contentTh: null,
  },
  {
    id: "doc-2",
    name: "api-reference.md",
    collection: "Documentation / guides",
    content: `# API Reference

## Authentication

All API requests require a valid API key in the Authorization header.

## Endpoints

### POST /v1/chat

Send a message and receive a streamed or complete response.

### POST /v1/embeddings

Generate vector embeddings for text input. Use this endpoint when building custom retrieval pipelines.

### GET /v1/documents

List uploaded documents with pagination and optional collection filters.`,
    contentTh: null,
  },
  {
    id: "doc-3",
    name: "best-practices.md",
    collection: "Documentation / guides",
    content: `# Best Practices

## Chunking strategy

Choose chunk size based on your content type. Technical docs often work well with 512–1024 tokens. Narrative content may benefit from larger chunks with moderate overlap.

## Embedding models

Match your embedding model to the model used at query time. Mixing embedding families can hurt retrieval quality.

## Evaluation

Maintain a small set of question–answer pairs and measure recall@k after each index change.`,
    contentTh: null,
  },
  {
    id: "doc-4",
    name: "standup-2025-01.md",
    collection: "Notes / meetings",
    content: `# Standup — Jan 2025

## Yesterday
- Shipped document sidebar improvements
- Started RAG configuration UI

## Today
- Finish RAG page with chunk preview
- Review embedding provider options

## Blockers
- Waiting on staging API keys for integration tests`,
    contentTh: null,
  },
];

export const INITIAL_RAG_RECORDS: RagRecord[] = [
  {
    id: "rag-1",
    name: "Product docs — semantic",
    documentIds: ["doc-1"],
    documentNames: ["introduction.md"],
    method: "semantic",
    chunkStrategy: "fixed",
    chunkSize: 512,
    chunkOverlap: 64,
    embeddingModel: "text-embedding-3-small",
    includeMetadata: true,
    chunkCount: 4,
    status: "ready",
    updatedAt: "2025-05-20T10:30:00Z",
  },
  {
    id: "rag-2",
    name: "API reference — hybrid",
    documentIds: ["doc-2", "doc-3"],
    documentNames: ["api-reference.md", "best-practices.md"],
    method: "hybrid",
    chunkStrategy: "markdown",
    chunkSize: 768,
    chunkOverlap: 128,
    embeddingModel: "text-embedding-3-large",
    includeMetadata: true,
    chunkCount: 3,
    status: "ready",
    updatedAt: "2025-05-22T14:15:00Z",
  },
  {
    id: "rag-3",
    name: "Meeting notes — keyword",
    documentIds: ["doc-4"],
    documentNames: ["standup-2025-01.md"],
    method: "keyword",
    chunkStrategy: "recursive",
    chunkSize: 256,
    chunkOverlap: 32,
    embeddingModel: "text-embedding-3-small",
    includeMetadata: false,
    chunkCount: 2,
    status: "processing",
    updatedAt: "2025-05-26T09:00:00Z",
  },
];

export const RAG_METHOD_OPTIONS = [
  { value: "semantic", label: "Semantic (vector)" },
  { value: "keyword", label: "Keyword (BM25)" },
  { value: "hybrid", label: "Hybrid (semantic + keyword)" },
] as const;

export const CHUNK_STRATEGY_OPTIONS = [
  { value: "fixed", label: "Fixed size (char window)" },
  { value: "recursive", label: "Recursive (paragraph → sentence)" },
  { value: "markdown", label: "Markdown (by heading)" },
  { value: "sentence", label: "Sentence" },
] as const;

export const CHUNK_STRATEGY_LABELS: Record<string, string> = {
  fixed: "Fixed",
  recursive: "Recursive",
  markdown: "Markdown",
  sentence: "Sentence",
};

export const EMBEDDING_MODEL_OPTIONS = [
  { value: "text-embedding-3-small", label: "text-embedding-3-small" },
  { value: "text-embedding-3-large", label: "text-embedding-3-large" },
  { value: "text-embedding-ada-002", label: "text-embedding-ada-002" },
];
