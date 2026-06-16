"use client";

import { useCallback, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { KeyRound, Pencil, Trash2 } from "lucide-react";
import DataTable from "@/components/common/DataTable/DataTable";
import Button from "@/components/common/Button/Button";
import Typography from "@/components/common/Typography/Typography";
import Paper from "@/components/common/Paper/Paper";
import Flex from "@/components/common/Flex/Flex";
import Modal from "@/components/common/Modal/Modal";
import AddApiKeyModal from "./AddApiKeyModal";
import { PROVIDER_OPTIONS } from "./mockData";
import type { ApiKeyFormValues, ApiKeyProvider, ApiKeyRecord, ApiKeyStatus } from "./types";
import ApiLoadingBackdrop from "@/components/common/ApiLoadingBackdrop/ApiLoadingBackdrop";
import { useApiLoading } from "@/hooks/useApiLoading";
import {
  createApiKeyAction,
  deleteApiKeyAction,
  updateApiKeyAction,
} from "@/server/actions";

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function providerLabel(provider: ApiKeyProvider): string {
  return PROVIDER_OPTIONS.find((p) => p.value === provider)?.label ?? provider;
}

function unwrapAction<T>(
  result: { success: true; data: T } | { success: false; error: string },
): T {
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.data;
}

export type ApiKeyPageContentProps = {
  initialRecords: ApiKeyRecord[];
  loadError?: string | null;
};

export default function ApiKeyPageContent({
  initialRecords,
  loadError = null,
}: ApiKeyPageContentProps) {
  const [records, setRecords] = useState<ApiKeyRecord[]>(initialRecords);
  const [actionError, setActionError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ApiKeyRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiKeyRecord | null>(null);
  const { isLoading, withLoading } = useApiLoading();

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

  const handleCreateKey = useCallback(
    async (values: ApiKeyFormValues) => {
      await runAction(async () => {
        const record = unwrapAction(await createApiKeyAction(values));
        setRecords((prev) => [record, ...prev]);
      });
    },
    [runAction],
  );

  const handleUpdateKey = useCallback(
    async (values: ApiKeyFormValues) => {
      if (!editing) return;

      await runAction(async () => {
        const record = unwrapAction(await updateApiKeyAction(editing.id, values));
        setRecords((prev) => prev.map((r) => (r.id === record.id ? record : r)));
        setEditing(null);
      });
    },
    [editing, runAction],
  );

  const handleDeleteKey = useCallback(async () => {
    if (!deleteTarget) return;

    await runAction(async () => {
      unwrapAction(await deleteApiKeyAction(deleteTarget.id));
      setRecords((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      setDeleteTarget(null);
    });
  }, [deleteTarget, runAction]);

  const openAddModal = useCallback(() => {
    setEditing(null);
    setModalOpen(true);
  }, []);

  const openEditModal = useCallback((record: ApiKeyRecord) => {
    setEditing(record);
    setModalOpen(true);
  }, []);

  const columns = useMemo<ColumnDef<ApiKeyRecord, unknown>[]>(
    () => [
      { accessorKey: "name", header: "Name" },
      {
        accessorKey: "provider",
        header: "Provider",
        cell: ({ getValue }) => (
          <span className="text-sm">{providerLabel(getValue<ApiKeyProvider>())}</span>
        ),
      },
      {
        accessorKey: "keyMasked",
        header: "API key",
        cell: ({ getValue }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ getValue }) => {
          const status = getValue<ApiKeyStatus>();
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
              aria-label="Edit API key"
              onClick={() => openEditModal(row.original)}
              className="aspect-square! min-w-8! p-1.5!"
            >
              <Pencil size={16} />
            </Button>
            <Button
              variant="text"
              size="small"
              aria-label="Delete API key"
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

  return (
    <div className="relative flex flex-col gap-6 p-6">
      <ApiLoadingBackdrop show={isLoading} />
      {loadError ? (
        <div
          className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive"
          role="alert"
        >
          Failed to load API keys: {loadError}
        </div>
      ) : null}

      {actionError ? (
        <div
          className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive"
          role="alert"
        >
          {actionError}
        </div>
      ) : null}

      <Flex justify="space-between" align="flex-start" wrap="wrap" gap={3}>
        <div className="space-y-1">
          <Typography variant="h4" component="h1">
            API Key
          </Typography>
          <Typography variant="body2" color="muted">
            Manage provider API keys used by the application.
          </Typography>
        </div>
        <Button
          variant="contained"
          size="small"
          aria-label="Add API key"
          onClick={openAddModal}
          className="aspect-square! min-w-9! p-2!"
        >
          <KeyRound size={18} />
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
          emptyMessage="No API keys yet. Click the key icon to add one."
        />
      </Paper>

      <AddApiKeyModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={editing ? handleUpdateKey : handleCreateKey}
        title={editing ? "Edit API key" : "Add API key"}
        submitLabel={editing ? "Save changes" : "Save key"}
        initialValues={
          editing
            ? {
                name: editing.name,
                provider: editing.provider,
                apiKey: "",
                active: editing.status === "active",
              }
            : undefined
        }
        apiKeyOptional={editing != null}
      />

      <Modal
        open={deleteTarget != null}
        onClose={() => setDeleteTarget(null)}
        size="sm"
        title="Delete API key"
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
              onClick={() => void handleDeleteKey()}
              disabled={isLoading}
              loading={isLoading}
            >
              Delete
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">
          This will permanently delete{" "}
          <span className="font-semibold text-foreground">
            &quot;{deleteTarget?.name ?? "this API key"}&quot;
          </span>
          .
        </p>
      </Modal>
    </div>
  );
}
