"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import Modal from "@/components/common/Modal/Modal";
import DataTable from "@/components/common/DataTable/DataTable";
import Button from "@/components/common/Button/Button";
import TextField from "@/components/common/TextField/TextField";
import SelectField from "@/components/common/SelectField/SelectField";
import Switch from "@/components/common/Switch/Switch";
import Flex from "@/components/common/Flex/Flex";
import Typography from "@/components/common/Typography/Typography";
import { Layers, Pencil, Sparkles, Trash2 } from "lucide-react";
import DocumentMultiSelect from "./DocumentMultiSelect";
import {
  CHUNK_STRATEGY_OPTIONS,
  RAG_METHOD_OPTIONS,
  SIZING_UNIT_OPTIONS,
} from "./mockData";
import { truncatePreview } from "./chunkUtils";
import { previewRagChunksAction } from "@/server/actions";
import type {
  ChunkRecord,
  ContentLang,
  DocumentOption,
  RagChunkStrategy,
  RagFormValues,
  RagMethod,
  RagSizingUnit,
} from "./types";

function LangBadge({ lang }: { lang: ContentLang }) {
  const isThai = lang === "th";
  return (
    <span
      title={isThai ? "Indexed from Thai translation" : "Indexed from English source"}
      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none ${
        isThai
          ? "bg-brand-500/15 text-brand-700"
          : "bg-muted text-muted-foreground"
      }`}
    >
      {isThai ? "TH" : "EN"}
    </span>
  );
}

const DEFAULT_FORM: RagFormValues = {
  name: "",
  documentIds: [],
  method: "semantic",
  chunkStrategy: "fixed",
  sizingUnit: "chars",
  chunkSize: 512,
  chunkOverlap: 64,
  customSeparators: [],
  semanticThreshold: 95,
  embeddingModel: "text-embedding-3-small",
  includeMetadata: true,
};

function unwrap<T>(
  result: { success: true; data: T } | { success: false; error: string },
): T {
  if (!result.success) throw new Error(result.error);
  return result.data;
}

type AddRagModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: RagFormValues, chunks: ChunkRecord[]) => void;
  documents: DocumentOption[];
  embeddingModelOptions: Array<{ value: string; label: string }>;
  title?: string;
  submitLabel?: string;
  initialValues?: Partial<RagFormValues>;
  autoGenerateOnOpen?: boolean;
};

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

function normalizeChunkIndices(chunks: ChunkRecord[]): ChunkRecord[] {
  return chunks.map((chunk, i) => ({ ...chunk, index: i + 1 }));
}

const baseChunkColumns: ColumnDef<ChunkRecord, unknown>[] = [
  {
    accessorKey: "index",
    header: "#",
    size: 48,
    cell: ({ getValue }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {getValue<number>()}
      </span>
    ),
  },
  {
    accessorKey: "documentName",
    header: "Document",
    cell: ({ row }) => (
      <span className="flex items-center gap-2 text-sm text-foreground">
        <span className="truncate">{row.original.documentName}</span>
        <LangBadge lang={row.original.lang} />
      </span>
    ),
  },
  {
    accessorKey: "content",
    header: "Preview",
    cell: ({ getValue }) => (
      <span className="line-clamp-2 text-sm text-foreground">
        {truncatePreview(getValue<string>(), 160)}
      </span>
    ),
  },
  {
    accessorKey: "charCount",
    header: "Chars",
    cell: ({ getValue }) => (
      <span className="font-mono text-xs">{getValue<number>()}</span>
    ),
  },
  {
    accessorKey: "tokenEstimate",
    header: "Tokens (est.)",
    cell: ({ getValue }) => (
      <span className="font-mono text-xs">{getValue<number>()}</span>
    ),
  },
];

export default function AddRagModal({
  open,
  onClose,
  onSubmit,
  documents,
  embeddingModelOptions,
  title = "New RAG configuration",
  submitLabel = "Create RAG",
  initialValues,
}: AddRagModalProps) {

  const [form, setForm] = useState<RagFormValues>(() => ({ ...DEFAULT_FORM, ...initialValues }));
  // Preferred content language for chunking. Only applied to documents that
  // actually have a Thai translation; others always use their English source.
  const [contentLang, setContentLang] = useState<ContentLang>("th");
  const [chunks, setChunks] = useState<ChunkRecord[]>([]);
  const [hasChunked, setHasChunked] = useState(false);
  const [isChunking, setIsChunking] = useState(false);
  const [chunkError, setChunkError] = useState<string | null>(null);
  const [editingChunk, setEditingChunk] = useState<ChunkRecord | null>(null);
  const [editingContent, setEditingContent] = useState("");

  const isSemantic = form.chunkStrategy === "semantic";
  const isCustom = form.chunkStrategy === "custom";
  const isAuto = form.chunkStrategy === "auto";
  const unitLabel = form.sizingUnit === "tokens" ? "tokens" : "chars";

  const selectedDocuments = useMemo(
    () => documents.filter((d) => form.documentIds.includes(d.id)),
    [documents, form.documentIds],
  );

  // Show the language picker only when at least one selected document has a
  // Thai translation to choose from.
  const thaiDocCount = useMemo(
    () => selectedDocuments.filter((d) => !!d.contentTh && d.contentTh.trim().length > 0).length,
    [selectedDocuments],
  );
  const canSelectLanguage = thaiDocCount > 0;

  useEffect(() => {
    setEditingContent(editingChunk?.content ?? "");
  }, [editingChunk]);

  const openEditChunk = useCallback((chunk: ChunkRecord) => {
    setEditingChunk(chunk);
  }, []);

  const handleDeleteChunk = useCallback((chunk: ChunkRecord) => {
    setChunks((prev) => normalizeChunkIndices(prev.filter((c) => c.id !== chunk.id)));
  }, []);

  const handleSaveChunk = useCallback(() => {
    if (!editingChunk) return;
    const nextContent = editingContent.trim();
    setChunks((prev) =>
      normalizeChunkIndices(
        prev.map((c) =>
          c.id !== editingChunk.id
            ? c
            : {
                ...c,
                content: nextContent,
                charCount: nextContent.length,
                tokenEstimate: estimateTokens(nextContent),
              },
        ),
      ),
    );
    setEditingChunk(null);
    setEditingContent("");
  }, [editingChunk, editingContent]);

  const chunkColumns = useMemo<ColumnDef<ChunkRecord, unknown>[]>(
    () => [
      ...baseChunkColumns,
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <Flex gap={1} justify="flex-end" align="center">
            <Button
              variant="text"
              size="small"
              aria-label="Edit chunk"
              onClick={() => openEditChunk(row.original)}
              className="aspect-square! min-w-8! p-1.5!"
            >
              <Pencil size={16} />
            </Button>
            <Button
              variant="text"
              size="small"
              aria-label="Delete chunk"
              onClick={() => handleDeleteChunk(row.original)}
              className="aspect-square! min-w-8! p-1.5!"
            >
              <Trash2 size={16} />
            </Button>
          </Flex>
        ),
      },
    ],
    [handleDeleteChunk, openEditChunk],
  );

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const patchForm = useCallback((patch: Partial<RagFormValues>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleLanguageChange = useCallback((lang: ContentLang) => {
    setContentLang(lang);
  }, []);

  // Generate the chunk preview on the server (handles token sizing, custom
  // separators, per-format `auto`, and embedding-based `semantic`).
  const runPreview = useCallback(async () => {
    if (form.documentIds.length === 0) {
      setChunks([]);
      setHasChunked(false);
      return;
    }
    setIsChunking(true);
    setChunkError(null);
    try {
      const result = unwrap(
        await previewRagChunksAction(
          form.documentIds,
          {
            chunkStrategy: form.chunkStrategy,
            sizingUnit: form.sizingUnit,
            chunkSize: form.chunkSize,
            chunkOverlap: form.chunkOverlap,
            customSeparators: form.customSeparators,
            semanticThreshold: form.semanticThreshold,
            embeddingModel: form.embeddingModel,
          },
          contentLang,
        ),
      );
      setChunks(normalizeChunkIndices(result));
      setHasChunked(true);
    } catch (e) {
      setChunkError(e instanceof Error ? e.message : "Failed to generate chunks");
      setChunks([]);
      setHasChunked(false);
    } finally {
      setIsChunking(false);
    }
  }, [
    form.documentIds,
    form.chunkStrategy,
    form.sizingUnit,
    form.chunkSize,
    form.chunkOverlap,
    form.customSeparators,
    form.semanticThreshold,
    form.embeddingModel,
    contentLang,
  ]);

  // Debounced auto-preview for non-semantic strategies. Semantic is gated behind
  // an explicit click (it embeds every sentence, which we don't want per keystroke).
  useEffect(() => {
    if (!open || form.documentIds.length === 0 || isSemantic) return;
    const t = setTimeout(() => {
      void runPreview();
    }, 500);
    return () => clearTimeout(t);
  }, [open, form.documentIds, isSemantic, runPreview]);

  const canSubmit =
    form.name.trim().length > 0 &&
    form.documentIds.length > 0 &&
    hasChunked &&
    chunks.length > 0;

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;
    onSubmit(form, chunks);
    handleClose();
  }, [canSubmit, form, chunks, onSubmit, handleClose]);

  return (
    <Modal
      open={open}
      onClose={handleClose}
      size="xl"
      title={title}
      footer={
        <div className="flex w-full justify-end" style={{ gap: 8 }}>
          <Button variant="text" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!canSubmit}
            startIcon={<Sparkles size={16} />}
          >
            {submitLabel}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6 pb-4">
        <section className="flex flex-col gap-4">
          <Typography variant="subtitle2" color="muted">
            Configuration
          </Typography>

          <TextField
            variant="outlined"
            label="Name"
            placeholder="e.g. Product docs — semantic"
            fullWidth
            value={form.name}
            onChange={(e) => patchForm({ name: e.target.value })}
          />

          <DocumentMultiSelect
            documents={documents}
            value={form.documentIds}
            onChange={(documentIds) => patchForm({ documentIds })}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              variant="outlined"
              label="RAG method"
              fullWidth
              options={RAG_METHOD_OPTIONS.map((o) => ({
                value: o.value,
                label: o.label,
              }))}
              value={form.method}
              onChange={(value) =>
                patchForm({ method: (value ?? "semantic") as RagMethod })
              }
            />
            <SelectField
              variant="outlined"
              label="Embedding model"
              fullWidth
              options={embeddingModelOptions}
              value={form.embeddingModel}
              onChange={(value) =>
                patchForm({
                  embeddingModel: value != null ? String(value) : form.embeddingModel,
                })
              }
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <SelectField
              variant="outlined"
              label="Chunk strategy"
              fullWidth
              options={CHUNK_STRATEGY_OPTIONS.map((o) => ({
                value: o.value,
                label: o.label,
              }))}
              value={form.chunkStrategy}
              onChange={(value) =>
                patchForm({
                  chunkStrategy: (value ?? "fixed") as RagChunkStrategy,
                })
              }
            />
            <Typography variant="caption" color="muted">
              {isAuto
                ? "Picks a strategy per document from its source format (PDF/Word → recursive, Excel/PowerPoint/Markdown → by heading, text → sentence)."
                : isSemantic
                  ? "Groups sentences by embedding similarity; chunk size still caps each group."
                  : "How documents are split. Chunk size caps every strategy; oversized sections fall back to a recursive split with overlap."}
            </Typography>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <SelectField
              variant="outlined"
              label="Size unit"
              fullWidth
              options={SIZING_UNIT_OPTIONS.map((o) => ({
                value: o.value,
                label: o.label,
              }))}
              value={form.sizingUnit}
              onChange={(value) =>
                patchForm({ sizingUnit: (value ?? "chars") as RagSizingUnit })
              }
            />
            <TextField
              variant="outlined"
              label={`Chunk size (${unitLabel})`}
              type="number"
              fullWidth
              value={String(form.chunkSize)}
              onChange={(e) =>
                patchForm({ chunkSize: Number(e.target.value) || 512 })
              }
            />
            <TextField
              variant="outlined"
              label={`Chunk overlap (${unitLabel})`}
              type="number"
              fullWidth
              value={String(form.chunkOverlap)}
              onChange={(e) =>
                patchForm({ chunkOverlap: Number(e.target.value) || 0 })
              }
            />
          </div>

          {isCustom && (
            <div className="flex flex-col gap-1.5">
              <TextField
                variant="outlined"
                label="Custom separators (one per line)"
                fullWidth
                multiline
                minRows={3}
                value={(form.customSeparators ?? []).join("\n")}
                onChange={(e) =>
                  patchForm({
                    customSeparators: e.target.value
                      .split("\n")
                      .map((s) => s.replace(/\r$/, ""))
                      .filter((s) => s.length > 0),
                  })
                }
              />
              <Typography variant="caption" color="muted">
                Split is applied in order. Prefix a line with{" "}
                <span className="font-mono">re:</span> for a regular expression
                (e.g. <span className="font-mono">{"re:\\n#{1,6}\\s"}</span>).
              </Typography>
            </div>
          )}

          {isSemantic && (
            <div className="flex flex-col gap-1.5">
              <TextField
                variant="outlined"
                label="Boundary percentile (1–99)"
                type="number"
                fullWidth
                value={String(form.semanticThreshold ?? 95)}
                onChange={(e) =>
                  patchForm({ semanticThreshold: Number(e.target.value) || 95 })
                }
              />
              <Typography variant="caption" color="muted">
                A new chunk starts where consecutive-sentence distance exceeds this
                percentile. Higher = fewer, larger chunks.
              </Typography>
            </div>
          )}

          <Switch
            label="Include document metadata in chunks"
            checked={form.includeMetadata}
            onChange={(e) => patchForm({ includeMetadata: e.target.checked })}
          />

          {canSelectLanguage && (
            <div className="flex flex-col gap-2 rounded-lg border border-brand-500/30 bg-brand-500/5 p-3">
              <Flex justify="space-between" align="center" gap={3} wrap="wrap">
                <div className="min-w-0">
                  <Typography variant="subtitle2">Content language</Typography>
                  <Typography variant="caption" color="muted">
                    {thaiDocCount} of {selectedDocuments.length} selected document
                    {selectedDocuments.length === 1 ? "" : "s"} {thaiDocCount === 1 ? "has" : "have"} a
                    Thai translation. Choose which language to index.
                  </Typography>
                </div>
                <div className="w-40 shrink-0">
                  <SelectField
                    variant="outlined"
                    fullWidth
                    options={[
                      { value: "th", label: "Thai (TH)" },
                      { value: "en", label: "English (EN)" },
                    ]}
                    value={contentLang}
                    onChange={(value) =>
                      handleLanguageChange((value === "en" ? "en" : "th") as ContentLang)
                    }
                  />
                </div>
              </Flex>
              {contentLang === "th" && thaiDocCount < selectedDocuments.length && (
                <Typography variant="caption" color="muted">
                  Documents without a Thai translation will be indexed in English.
                </Typography>
              )}
            </div>
          )}

          <Flex gap={16} align="center" wrap="wrap" className="pt-1">
            <Button
              variant="outlined"
              startIcon={<Layers size={16} />}
              onClick={() => void runPreview()}
              disabled={form.documentIds.length === 0}
              loading={isChunking}
              style={{marginRight: 14}}
            >
              {hasChunked ? "Regenerate chunks" : "Generate chunks"}
            </Button>
            {isSemantic && (
              <Typography variant="caption" color="muted">
                Semantic chunking embeds each sentence — click to preview.
              </Typography>
            )}
            {!isSemantic && form.documentIds.length > 0 && !hasChunked && (
              <Typography variant="caption" color="muted">
                Generating preview from {selectedDocuments.length} selected document
                {selectedDocuments.length === 1 ? "" : "s"}…
              </Typography>
            )}
          </Flex>

          {chunkError && (
            <div
              className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              role="alert"
            >
              {chunkError}
            </div>
          )}
        </section>

        {hasChunked && (
          <section className="flex flex-col gap-3">
            <Flex justify="space-between" align="center" wrap="wrap" gap={2}>
              <Typography variant="subtitle2">
                Chunk preview
                <Typography
                  component="span"
                  variant="caption"
                  color="muted"
                  className="ml-2"
                >
                  {chunks.length} chunk{chunks.length === 1 ? "" : "s"}
                </Typography>
              </Typography>
            </Flex>

            {chunks.length > 0 ? (
              <DataTable
                columns={chunkColumns}
                data={chunks}
                striped
                density="compact"
                pagination={chunks.length > 5}
                defaultPageSize={5}
                pageSizeOptions={[5, 10]}
                getRowId={(row) => row.id}
                emptyMessage="No chunks generated."
              />
            ) : (
              <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                No chunks were produced. Try adjusting chunk size or overlap.
              </p>
            )}
          </section>
        )}
      </div>

      <Modal
        open={editingChunk != null}
        onClose={() => {
          setEditingChunk(null);
          setEditingContent("");
        }}
        size="lg"
        title="Edit chunk"
        footer={
          <div className="flex w-full justify-end" style={{ gap: 8}}>
            <Button
              variant="text"
              onClick={() => {
                setEditingChunk(null);
                setEditingContent("");
              }}
            >
              Cancel
            </Button>
            <Button variant="contained" onClick={handleSaveChunk}>
              Save
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <Typography variant="body2" color="muted">
            Document: <span className="font-medium">{editingChunk?.documentName}</span>
          </Typography>
          <TextField
            label="Content"
            fullWidth
            multiline
            minRows={8}
            value={editingContent}
            onChange={(e) => setEditingContent(e.target.value)}
          />
        </div>
      </Modal>
    </Modal>
  );
}
