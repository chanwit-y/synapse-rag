"use client";

import { useCallback, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Trash2 } from "lucide-react";
import DataTable from "@/components/common/DataTable/DataTable";
import Button from "@/components/common/Button/Button";
import Typography from "@/components/common/Typography/Typography";
import Paper from "@/components/common/Paper/Paper";
import Flex from "@/components/common/Flex/Flex";
import Modal from "@/components/common/Modal/Modal";
import AddRagModal from "./AddRagModal";
import type { ChunkRecord, RagFormValues, RagMethod, RagRecord, RagStatus } from "./types";
import ApiLoadingBackdrop from "@/components/common/ApiLoadingBackdrop/ApiLoadingBackdrop";
import { useApiLoading } from "@/hooks/useApiLoading";
import {
  createRagAction,
  deleteRagAction,
  listRagsAction,
  updateRagAction,
  embedAndUpsertRagChunksAction,
  deleteRagChunksByRagIdAction,
} from "@/server/actions";
import type { AiModelRecord } from "@/components/container/ai-model/types";
import type { DocumentOption } from "./types";
import type { RagChunkUpsert } from "@/server/services/rag-chunk.service";

const METHOD_LABELS: Record<RagMethod, string> = {
  semantic: "Semantic",
  keyword: "Keyword",
  hybrid: "Hybrid",
};

const STATUS_STYLES: Record<RagStatus, { bg: string; color: string; label: string }> = {
  ready: { bg: "rgba(34,197,94,0.15)", color: "rgb(22,163,74)", label: "Ready" },
  processing: {
    bg: "rgba(234,179,8,0.15)",
    color: "rgb(202,138,4)",
    label: "Processing",
  },
  failed: { bg: "rgba(239,68,68,0.15)", color: "rgb(220,38,38)", label: "Failed" },
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function unwrapAction<T>(
  result: { success: true; data: T } | { success: false; error: string },
): T {
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.data;
}

function buildEmbeddingModelOptions(models: AiModelRecord[]): Array<{ value: string; label: string }> {
  const active = models.filter((m) => m.status === "active");
  const source = active.length > 0 ? active : models;

  const options = source.map((m) => ({
    value: m.modelId,
    label: `${m.name} (${m.modelId})`,
  }));
  return options.length > 0
    ? options
    : [{ value: "text-embedding-3-small", label: "text-embedding-3-small" }];
}

function toRagChunkUpserts(
  chunks: ChunkRecord[],
  includeMetadata: boolean,
): RagChunkUpsert[] {
  return chunks.map((chunk, i) => ({
    chunkIndex: i,
    content: chunk.content,
    tokenCount: chunk.tokenEstimate,
    metadata: includeMetadata
      ? {
          documentId: chunk.documentId,
          documentName: chunk.documentName,
          index: chunk.index,
        }
      : undefined,
    embedding: null,
  }));
}

export interface RagPageContentProps {
  initialRecords: RagRecord[];
  initialDocuments: DocumentOption[];
  initialEmbeddingModels: AiModelRecord[];
  loadError?: string | null;
}

export default function RagPageContent({
  initialRecords,
  initialDocuments,
  initialEmbeddingModels,
  loadError = null,
}: RagPageContentProps) {
  const [records, setRecords] = useState<RagRecord[]>(initialRecords);
  const documents = initialDocuments;
  const embeddingModelOptions = useMemo(
    () => buildEmbeddingModelOptions(initialEmbeddingModels),
    [initialEmbeddingModels],
  );
  const embeddingModelValues = useMemo(
    () => new Set(embeddingModelOptions.map((o) => o.value)),
    [embeddingModelOptions],
  );
  const defaultEmbeddingModel = embeddingModelOptions[0]?.value ?? "text-embedding-3-small";
  const [actionError, setActionError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalInstance, setModalInstance] = useState(0);
  const [editing, setEditing] = useState<RagRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RagRecord | null>(null);
  const { isLoading, withLoading } = useApiLoading();

  const refreshRags = useCallback(async () => {
    const result = await listRagsAction();
    if (result.success) {
      setRecords(result.data);
    }
  }, []);

  const runAction = useCallback(
    async (fn: () => Promise<void>) => {
      setActionError(null);
      try {
        await withLoading(fn);
      } catch (error) {
        setActionError(error instanceof Error ? error.message : "An unexpected error occurred");
        throw error;
      }
    },
    [withLoading],
  );

  const handleCreateRag = useCallback(
    async (values: RagFormValues, chunks: ChunkRecord[]) => {
      await runAction(async () => {
        const record = unwrapAction(await createRagAction(values, chunks));
        unwrapAction(
          await embedAndUpsertRagChunksAction(
            record.id,
            toRagChunkUpserts(chunks, values.includeMetadata),
            values.embeddingModel,
          ),
        );
        await refreshRags();
      });
    },
    [runAction, refreshRags],
  );

  const handleUpdateRag = useCallback(
    async (values: RagFormValues, chunks: ChunkRecord[]) => {
      if (!editing) return;
      await runAction(async () => {
        unwrapAction(await updateRagAction(editing.id, values, chunks));
        unwrapAction(
          await embedAndUpsertRagChunksAction(
            editing.id,
            toRagChunkUpserts(chunks, values.includeMetadata),
            values.embeddingModel,
          ),
        );
        await refreshRags();
        setEditing(null);
      });
    },
    [editing, runAction, refreshRags],
  );

  const openAddModal = useCallback(() => {
    setEditing(null);
    setModalInstance((v) => v + 1);
    setModalOpen(true);
  }, []);

  const openEditModal = useCallback((record: RagRecord) => {
    setEditing(record);
    setModalInstance((v) => v + 1);
    setModalOpen(true);
  }, []);

  const columns = useMemo<ColumnDef<RagRecord, unknown>[]>(
    () => [
      { accessorKey: "name", header: "Name" },
      {
        accessorKey: "documentNames",
        header: "Documents",
        cell: ({ getValue }) => {
          const names = getValue<string[]>();
          if (names.length <= 2) {
            return <span className="text-sm">{names.join(", ")}</span>;
          }
          return (
            <span className="text-sm" title={names.join(", ")}>
              {names.slice(0, 2).join(", ")}
              <span className="text-muted-foreground"> +{names.length - 2}</span>
            </span>
          );
        },
      },
      {
        accessorKey: "method",
        header: "Method",
        cell: ({ getValue }) => METHOD_LABELS[getValue<RagMethod>()],
      },
      {
        accessorKey: "chunkCount",
        header: "Chunks",
        cell: ({ getValue }) => (
          <span className="font-mono text-sm">{getValue<number>()}</span>
        ),
      },
      {
        accessorKey: "chunkSize",
        header: "Chunk size",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.chunkSize} / {row.original.chunkOverlap} overlap
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ getValue }) => {
          const status = getValue<RagStatus>();
          const style = STATUS_STYLES[status];
          return (
            <span
              style={{
                padding: "2px 10px",
                borderRadius: 9999,
                fontSize: "0.75rem",
                fontWeight: 600,
                background: style.bg,
                color: style.color,
              }}
            >
              {style.label}
            </span>
          );
        },
      },
      {
        accessorKey: "updatedAt",
        header: "Updated",
        cell: ({ getValue }) => (
          <span className="text-sm text-muted-foreground">
            {formatDate(getValue<string>())}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <Flex gap={2} justify="flex-end" align="center">
            <Button
              variant="text"
              size="small"
              aria-label="Edit RAG"
              onClick={() => openEditModal(row.original)}
              className="aspect-square! min-w-8! p-1.5!"
            >
              <Pencil size={16} />
            </Button>
            <Button
              variant="text"
              size="small"
              aria-label="Delete RAG"
              onClick={() => setDeleteTarget(row.original)}
              className="aspect-square! min-w-8! p-1.5!"
            >
              <Trash2 size={16} />
            </Button>
          </Flex>
        ),
      },
    ],
    [openEditModal],
  );

  const displayError = actionError ?? loadError;

  return (
    <div className="relative flex flex-col gap-6 p-6">
      <ApiLoadingBackdrop show={isLoading} />
      {displayError ? (
        <div
          className="shrink-0 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive"
          role="alert"
        >
          {displayError}
        </div>
      ) : null}

      <Flex justify="space-between" align="flex-start" wrap="wrap" gap={3}>
        <div className="space-y-1">
          <Typography variant="h4" component="h1">
            RAG
          </Typography>
          <Typography variant="body2" color="muted">
            Manage retrieval configurations and preview document chunks before indexing.
          </Typography>
        </div>
        <Button
          variant="contained"
          size="small"
          aria-label="Add RAG"
          onClick={openAddModal}
          className="aspect-square! min-w-9! p-2!"
        >
          <Plus size={18} />
        </Button>
      </Flex>

      <Paper variant="outlined" className="overflow-hidden p-0!">
        <DataTable
          columns={columns}
          data={records}
          striped
          hoverable
          pagination
          defaultPageSize={10}
          pageSizeOptions={[5, 10, 20]}
          filterable
          getRowId={(row) => row.id}
          emptyMessage="No RAG configurations yet. Click Add RAG to create one."
        />
      </Paper>

      <AddRagModal
        key={`${modalInstance}-${editing?.id ?? "new"}`}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={editing ? handleUpdateRag : handleCreateRag}
        documents={documents}
        embeddingModelOptions={embeddingModelOptions}
        title={editing ? "Edit RAG configuration" : "New RAG configuration"}
        submitLabel={editing ? "Save changes" : "Create RAG"}
        initialValues={
          editing
            ? {
                name: editing.name,
                documentIds: editing.documentIds,
                method: editing.method,
                chunkSize: editing.chunkSize,
                chunkOverlap: editing.chunkOverlap,
                embeddingModel:
                  editing.embeddingModel && embeddingModelValues.has(editing.embeddingModel)
                    ? editing.embeddingModel
                    : defaultEmbeddingModel,
                includeMetadata: editing.includeMetadata ?? true,
              }
            : undefined
        }
        autoGenerateOnOpen={editing != null}
      />

      <Modal
        open={deleteTarget != null}
        onClose={() => setDeleteTarget(null)}
        size="sm"
        title="Delete RAG configuration?"
        footer={
          <Flex gap={6} justify="flex-end" style={{ width: "100%" }}>
            <Button variant="text" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="contained"
              disabled={isLoading}
              onClick={() =>
                void runAction(async () => {
                  if (!deleteTarget) return;
                  unwrapAction(await deleteRagChunksByRagIdAction(deleteTarget.id));
                  unwrapAction(await deleteRagAction(deleteTarget.id));
                  setRecords((prev) => prev.filter((r) => r.id !== deleteTarget.id));
                  setDeleteTarget(null);
                  await refreshRags();
                })
              }
              startIcon={<Trash2 size={16} />}
            >
              Delete
            </Button>
          </Flex>
        }
      >
        <div className="flex flex-col gap-2">
          <Typography variant="body2">
            This will remove{" "}
            <span className="font-medium">{deleteTarget?.name}</span>.
          </Typography>
          <Typography variant="caption" color="muted">
            You can create it again later if needed.
          </Typography>
        </div>
      </Modal>
    </div>
  );
}
