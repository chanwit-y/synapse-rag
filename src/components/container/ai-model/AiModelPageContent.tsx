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
import AddAiModelModal from "./AddAiModelModal";
import { MODEL_TYPE_OPTIONS, PROVIDER_OPTIONS } from "./mockData";
import type {
  AiModelFormValues,
  AiModelProvider,
  AiModelRecord,
  AiModelStatus,
  AiModelType,
  ApiKeyOption,
} from "./types";
import ApiLoadingBackdrop from "@/components/common/ApiLoadingBackdrop/ApiLoadingBackdrop";
import { useApiLoading } from "@/hooks/useApiLoading";
import {
  createAiModelAction,
  deleteAiModelAction,
  listAiModelsAction,
  updateAiModelAction,
} from "@/server/actions";

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function providerLabel(provider: AiModelProvider): string {
  return PROVIDER_OPTIONS.find((p) => p.value === provider)?.label ?? provider;
}

function typeLabel(type: AiModelType): string {
  return MODEL_TYPE_OPTIONS.find((t) => t.value === type)?.label ?? type;
}

function unwrapAction<T>(
  result: { success: true; data: T } | { success: false; error: string },
): T {
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.data;
}

export interface AiModelPageContentProps {
  initialRecords: AiModelRecord[];
  apiKeyOptions: ApiKeyOption[];
  loadError?: string | null;
}

export default function AiModelPageContent({
  initialRecords,
  apiKeyOptions,
  loadError = null,
}: AiModelPageContentProps) {
  const [records, setRecords] = useState<AiModelRecord[]>(initialRecords);
  const [actionError, setActionError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AiModelRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AiModelRecord | null>(null);
  const { isLoading, withLoading } = useApiLoading();

  const refreshModels = useCallback(async () => {
    const result = await listAiModelsAction();
    if (result.success) {
      setRecords(result.data);
    }
  }, []);

  const handleCreateModel = useCallback(
    async (values: AiModelFormValues) => {
      try {
        setActionError(null);
        await withLoading(async () => {
          unwrapAction(await createAiModelAction(values));
          await refreshModels();
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to create AI model";
        setActionError(message);
        throw error;
      }
    },
    [refreshModels, withLoading],
  );

  const handleUpdateModel = useCallback(
    async (values: AiModelFormValues) => {
      if (!editing) return;

      try {
        setActionError(null);
        await withLoading(async () => {
          unwrapAction(await updateAiModelAction(editing.id, values));
          setEditing(null);
          await refreshModels();
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to update AI model";
        setActionError(message);
        throw error;
      }
    },
    [editing, refreshModels, withLoading],
  );

  const handleDeleteModel = useCallback(async () => {
    if (!deleteTarget) return;

    try {
      setActionError(null);
      await withLoading(async () => {
        unwrapAction(await deleteAiModelAction(deleteTarget.id));
        setDeleteTarget(null);
        await refreshModels();
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete AI model";
      setActionError(message);
    }
  }, [deleteTarget, refreshModels, withLoading]);

  const openAddModal = useCallback(() => {
    setEditing(null);
    setModalOpen(true);
  }, []);

  const openEditModal = useCallback((record: AiModelRecord) => {
    setEditing(record);
    setModalOpen(true);
  }, []);

  const columns = useMemo<ColumnDef<AiModelRecord, unknown>[]>(
    () => [
      { accessorKey: "name", header: "Name" },
      {
        accessorKey: "provider",
        header: "Provider",
        cell: ({ row }) => {
          const { apiKeyName, provider } = row.original;
          return (
            <div className="flex flex-col">
              <span className="text-sm">{providerLabel(provider)}</span>
              {apiKeyName && (
                <span className="text-xs text-muted-foreground">{apiKeyName}</span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "modelId",
        header: "Model ID",
        cell: ({ getValue }) => (
          <span className="font-mono text-xs">{getValue<string>()}</span>
        ),
      },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ getValue }) => (
          <span className="text-sm">{typeLabel(getValue<AiModelType>())}</span>
        ),
      },
      {
        accessorKey: "contextWindow",
        header: "Context",
        cell: ({ getValue }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {getValue<number>().toLocaleString()} tokens
          </span>
        ),
      },
      {
        accessorKey: "temperature",
        header: "Temp.",
        cell: ({ row }) => {
          const temp = row.original.temperature;
          if (temp == null) return <span className="text-muted-foreground">—</span>;
          return <span className="font-mono text-xs">{temp}</span>;
        },
      },
      {
        accessorKey: "isDefault",
        header: "Default",
        cell: ({ getValue }) => {
          const isDefault = getValue<boolean>();
          if (!isDefault) return <span className="text-muted-foreground">—</span>;
          return (
            <span
              style={{
                padding: "2px 10px",
                borderRadius: 9999,
                fontSize: "0.75rem",
                fontWeight: 600,
                background: "rgba(59,130,246,0.15)",
                color: "rgb(37,99,235)",
              }}
            >
              Default
            </span>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ getValue }) => {
          const status = getValue<AiModelStatus>();
          const style =
            status === "active"
              ? {
                  bg: "rgba(34,197,94,0.15)",
                  color: "rgb(22,163,74)",
                  label: "Active",
                }
              : {
                  bg: "rgba(148,163,184,0.18)",
                  color: "rgb(100,116,139)",
                  label: "Inactive",
                };

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
              aria-label="Edit AI model"
              onClick={() => openEditModal(row.original)}
              className="aspect-square! min-w-8! p-1.5!"
            >
              <Pencil size={16} />
            </Button>
            <Button
              variant="text"
              size="small"
              aria-label="Delete AI model"
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
            AI Model
          </Typography>
          <Typography variant="body2" color="muted">
            Manage chat, embedding, and completion models used across the application.
          </Typography>
        </div>
        <Button
          variant="contained"
          size="small"
          aria-label="Add AI model"
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
          emptyMessage="No AI models yet. Click Add to configure one."
        />
      </Paper>

      <AddAiModelModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSubmit={editing ? handleUpdateModel : handleCreateModel}
        title={editing ? "Edit AI model" : "Add AI model"}
        submitLabel={editing ? "Save changes" : "Save model"}
        apiKeyOptions={apiKeyOptions}
        initialValues={
          editing
            ? {
                apiKeyId: editing.apiKeyId,
                name: editing.name,
                provider: editing.provider,
                modelId: editing.modelId,
                type: editing.type,
                contextWindow: editing.contextWindow,
                temperature: editing.temperature,
                isDefault: editing.isDefault,
                active: editing.status === "active",
              }
            : undefined
        }
      />

      <Modal
        open={deleteTarget != null}
        onClose={() => setDeleteTarget(null)}
        size="sm"
        title="Delete AI model"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="outlined"
              color="inherit"
              size="small"
              onClick={() => setDeleteTarget(null)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="error"
              size="small"
              onClick={handleDeleteModel}
              disabled={isLoading}
              loading={isLoading}
            >
              Delete
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            This will permanently delete{" "}
            <span className="font-semibold text-foreground">
              &quot;{deleteTarget?.name ?? "this model"}&quot;
            </span>
            .
          </p>
          {deleteTarget?.isDefault && (
            <p className="text-sm text-muted-foreground">
              This model is marked as default. You may want to set another
              default after deleting.
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
