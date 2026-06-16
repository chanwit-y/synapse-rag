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
import AddAiInstructionModal from "./AddAiInstructionModal";
import type {
  AiInstructionFormValues,
  AiInstructionRecord,
  AiInstructionStatus,
} from "./types";
import ApiLoadingBackdrop from "@/components/common/ApiLoadingBackdrop/ApiLoadingBackdrop";
import { useApiLoading } from "@/hooks/useApiLoading";
import {
  createAiInstructionAction,
  deleteAiInstructionAction,
  updateAiInstructionAction,
} from "@/server/actions";

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

export type AiInstructionPageContentProps = {
  initialRecords: AiInstructionRecord[];
  loadError?: string | null;
};

export default function AiInstructionPageContent({
  initialRecords,
  loadError = null,
}: AiInstructionPageContentProps) {
  const [records, setRecords] = useState<AiInstructionRecord[]>(initialRecords);
  const [actionError, setActionError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AiInstructionRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AiInstructionRecord | null>(null);
  const { isLoading, withLoading } = useApiLoading();

  const runAction = useCallback(
    async (fn: () => Promise<void>) => {
      setActionError(null);
      try {
        await withLoading(fn);
      } catch (error) {
        setActionError(
          error instanceof Error ? error.message : "An unexpected error occurred",
        );
        throw error;
      }
    },
    [withLoading],
  );

  const handleCreate = useCallback(
    async (values: AiInstructionFormValues) => {
      await runAction(async () => {
        const record = unwrapAction(await createAiInstructionAction(values));
        setRecords((prev) => [record, ...prev]);
      });
    },
    [runAction],
  );

  const handleUpdate = useCallback(
    async (values: AiInstructionFormValues) => {
      if (!editing) return;

      await runAction(async () => {
        const record = unwrapAction(
          await updateAiInstructionAction(editing.id, values),
        );
        setRecords((prev) => prev.map((r) => (r.id === record.id ? record : r)));
        setEditing(null);
      });
    },
    [editing, runAction],
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;

    await runAction(async () => {
      unwrapAction(await deleteAiInstructionAction(deleteTarget.id));
      setRecords((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      setDeleteTarget(null);
    });
  }, [deleteTarget, runAction]);

  const openAddModal = useCallback(() => {
    setEditing(null);
    setModalOpen(true);
  }, []);

  const openEditModal = useCallback((record: AiInstructionRecord) => {
    setEditing(record);
    setModalOpen(true);
  }, []);

  const columns = useMemo<ColumnDef<AiInstructionRecord, unknown>[]>(
    () => [
      { accessorKey: "name", header: "Name" },
      {
        accessorKey: "description",
        header: "Description",
        cell: ({ getValue }) => {
          const description = getValue<string>();
          return (
            <span className="line-clamp-2 max-w-md text-sm text-muted-foreground">
              {description || "—"}
            </span>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ getValue }) => {
          const status = getValue<AiInstructionStatus>();
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
              aria-label="Edit instruction"
              onClick={() => openEditModal(row.original)}
              className="aspect-square! min-w-8! p-1.5!"
            >
              <Pencil size={16} />
            </Button>
            <Button
              variant="text"
              size="small"
              aria-label="Delete instruction"
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
          Failed to load instructions: {loadError}
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
            AI Instruction
          </Typography>
          <Typography variant="body2" color="muted">
            Manage reusable instruction templates used as system prompts in chat.
          </Typography>
        </div>
        <Button
          variant="contained"
          size="small"
          aria-label="Add instruction"
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
          emptyMessage="No instruction templates yet. Click the plus icon to add one."
        />
      </Paper>

      <AddAiInstructionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={editing ? handleUpdate : handleCreate}
        title={editing ? "Edit instruction" : "Add instruction"}
        submitLabel={editing ? "Save changes" : "Save instruction"}
        initialValues={
          editing
            ? {
                name: editing.name,
                description: editing.description,
                content: editing.content,
                active: editing.status === "active",
              }
            : undefined
        }
      />

      <Modal
        open={deleteTarget != null}
        onClose={() => setDeleteTarget(null)}
        size="sm"
        title="Delete instruction"
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
              onClick={() => void handleDelete()}
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
            &quot;{deleteTarget?.name ?? "this instruction"}&quot;
          </span>
          .
        </p>
      </Modal>
    </div>
  );
}
