"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { KeyRound, Pencil, Sparkles, Trash2 } from "lucide-react";
import DataTable from "@/components/common/DataTable/DataTable";
import Button from "@/components/common/Button/Button";
import Typography from "@/components/common/Typography/Typography";
import Paper from "@/components/common/Paper/Paper";
import Flex from "@/components/common/Flex/Flex";
import Modal from "@/components/common/Modal/Modal";
import TextField from "@/components/common/TextField/TextField";
import Switch from "@/components/common/Switch/Switch";
import ApiLoadingBackdrop from "@/components/common/ApiLoadingBackdrop/ApiLoadingBackdrop";
import { useApiLoading } from "@/hooks/useApiLoading";
import {
  createApiKeyAction,
  deleteApiKeyAction,
  updateApiKeyAction,
} from "@/server/actions";
import type { ApiKeyFormValues, ApiKeyRecord, ApiKeyStatus } from "../api-key/types";

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function unwrapAction<T>(
  result: { success: true; data: T } | { success: false; error: string },
): T {
  if (!result.success) throw new Error(result.error);
  return result.data;
}

type SharePointFormState = {
  name: string;
  endpoint: string;
  tenantId: string;
  clientId: string;
  apiKey: string;
  sitePath: string;
  folderPath: string;
  active: boolean;
};

const EMPTY_FORM: SharePointFormState = {
  name: "",
  endpoint: "",
  tenantId: "",
  clientId: "",
  apiKey: "",
  sitePath: "",
  folderPath: "",
  active: true,
};

export type SharePointSettingsContentProps = {
  initialRecords: ApiKeyRecord[];
  loadError?: string | null;
};

export default function SharePointSettingsContent({
  initialRecords,
  loadError = null,
}: SharePointSettingsContentProps) {
  const [records, setRecords] = useState<ApiKeyRecord[]>(initialRecords);
  const [actionError, setActionError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ApiKeyRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiKeyRecord | null>(null);
  const [form, setForm] = useState<SharePointFormState>(EMPTY_FORM);
  const { isLoading, withLoading } = useApiLoading();

  // Reset / hydrate the form whenever the modal opens (add vs edit).
  useEffect(() => {
    if (!modalOpen) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing form to the open target
    setForm(
      editing
        ? {
            name: editing.name,
            endpoint: editing.endpoint ?? "",
            tenantId: editing.tenantId ?? "",
            clientId: editing.clientId ?? "",
            apiKey: "",
            sitePath: editing.sitePath ?? "",
            folderPath: editing.folderPath ?? "",
            active: editing.status === "active",
          }
        : EMPTY_FORM,
    );
  }, [modalOpen, editing]);

  const patch = useCallback((p: Partial<SharePointFormState>) => {
    setForm((prev) => ({ ...prev, ...p }));
  }, []);

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

  const canSubmit =
    form.name.trim().length > 0 &&
    form.endpoint.trim().length > 0 &&
    form.tenantId.trim().length > 0 &&
    form.clientId.trim().length > 0 &&
    (editing != null || form.apiKey.trim().length > 0);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    const values: ApiKeyFormValues = {
      name: form.name.trim(),
      provider: "sharepoint",
      apiKey: form.apiKey.trim(),
      endpoint: form.endpoint.trim(),
      tenantId: form.tenantId.trim(),
      clientId: form.clientId.trim(),
      sitePath: form.sitePath.trim(),
      folderPath: form.folderPath.trim(),
      active: form.active,
    };

    await runAction(async () => {
      if (editing) {
        const record = unwrapAction(await updateApiKeyAction(editing.id, values));
        setRecords((prev) => prev.map((r) => (r.id === record.id ? record : r)));
      } else {
        const record = unwrapAction(await createApiKeyAction(values));
        setRecords((prev) => [record, ...prev]);
      }
      setModalOpen(false);
      setEditing(null);
    });
  }, [canSubmit, form, editing, runAction]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    await runAction(async () => {
      unwrapAction(await deleteApiKeyAction(deleteTarget.id));
      setRecords((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      setDeleteTarget(null);
    });
  }, [deleteTarget, runAction]);

  const openAdd = useCallback(() => {
    setEditing(null);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((record: ApiKeyRecord) => {
    setEditing(record);
    setModalOpen(true);
  }, []);

  const columns = useMemo<ColumnDef<ApiKeyRecord, unknown>[]>(
    () => [
      { accessorKey: "name", header: "Name" },
      {
        accessorKey: "endpoint",
        header: "Site host",
        cell: ({ getValue }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {getValue<string | null>() ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "clientId",
        header: "Client ID",
        cell: ({ getValue }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {getValue<string | null>() ?? "—"}
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
              ? { bg: "rgba(34,197,94,0.15)", color: "rgb(22,163,74)", label: "Active" }
              : { bg: "rgba(148,163,184,0.18)", color: "rgb(100,116,139)", label: "Inactive" };
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
              aria-label="Edit connection"
              onClick={() => openEdit(row.original)}
              className="aspect-square! min-w-8! p-1.5!"
            >
              <Pencil size={16} />
            </Button>
            <Button
              variant="text"
              size="small"
              aria-label="Delete connection"
              onClick={() => setDeleteTarget(row.original)}
              className="aspect-square! min-w-8! p-1.5!"
            >
              <Trash2 size={16} />
            </Button>
          </Flex>
        ),
      },
    ],
    [openEdit],
  );

  return (
    <div className="relative flex flex-col gap-6 p-6">
      <ApiLoadingBackdrop show={isLoading} />
      {loadError ? (
        <div
          className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive"
          role="alert"
        >
          Failed to load SharePoint connections: {loadError}
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
            SharePoint
          </Typography>
          <Typography variant="body2" color="muted">
            Azure service principal (app-only) used to read SharePoint folders for
            RAG import. The most-recently-updated active connection is used.
          </Typography>
        </div>
        <Button
          variant="contained"
          size="small"
          aria-label="Add SharePoint connection"
          onClick={openAdd}
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
          emptyMessage="No SharePoint connections yet. Click the key icon to add one."
        />
      </Paper>

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        size="md"
        title={editing ? "Edit SharePoint connection" : "Add SharePoint connection"}
        footer={
          <Flex gap={6} justify="flex-end" style={{ width: "100%" }}>
            <Button
              variant="text"
              onClick={() => {
                setModalOpen(false);
                setEditing(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={() => void handleSubmit()}
              disabled={!canSubmit}
              startIcon={<Sparkles size={16} />}
            >
              {editing ? "Save changes" : "Save connection"}
            </Button>
          </Flex>
        }
      >
        <div className="flex flex-col gap-4">
          <Typography variant="body2" color="muted">
            App-only auth via the ACS token endpoint. The client secret is stored
            on the server; the table never shows it.
          </Typography>

          <TextField
            variant="outlined"
            label="Name"
            placeholder="e.g. Banpu SharePoint"
            fullWidth
            value={form.name}
            onChange={(e) => patch({ name: e.target.value })}
          />
          <TextField
            variant="outlined"
            label="Site host"
            placeholder="https://contoso.sharepoint.com"
            fullWidth
            value={form.endpoint}
            onChange={(e) => patch({ endpoint: e.target.value })}
          />
          <TextField
            variant="outlined"
            label="Tenant ID"
            placeholder="00000000-0000-0000-0000-000000000000"
            fullWidth
            value={form.tenantId}
            onChange={(e) => patch({ tenantId: e.target.value })}
          />
          <TextField
            variant="outlined"
            label="Client ID"
            placeholder="App (client) id"
            fullWidth
            value={form.clientId}
            onChange={(e) => patch({ clientId: e.target.value })}
          />
          <TextField
            variant="outlined"
            label="Client secret"
            placeholder={editing ? "Leave blank to keep existing secret" : "App client secret"}
            fullWidth
            value={form.apiKey}
            onChange={(e) => patch({ apiKey: e.target.value })}
            startAdornment={<KeyRound size={16} />}
          />
          <Typography variant="body2" color="muted">
            Import defaults (optional) — pre-fill the import dialog.
          </Typography>
          <TextField
            variant="outlined"
            label="Default site path"
            placeholder="/sites/ECM-ACCP-TEST"
            fullWidth
            value={form.sitePath}
            onChange={(e) => patch({ sitePath: e.target.value })}
          />
          <TextField
            variant="outlined"
            label="Default folder (server-relative URL)"
            placeholder="/sites/ECM-ACCP-TEST/Shared Documents/ai-drop-zone"
            fullWidth
            value={form.folderPath}
            onChange={(e) => patch({ folderPath: e.target.value })}
          />
          <Switch
            label="Active"
            checked={form.active}
            onChange={(e) => patch({ active: e.target.checked })}
          />
        </div>
      </Modal>

      <Modal
        open={deleteTarget != null}
        onClose={() => setDeleteTarget(null)}
        size="sm"
        title="Delete SharePoint connection"
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
            &quot;{deleteTarget?.name ?? "this connection"}&quot;
          </span>
          .
        </p>
      </Modal>
    </div>
  );
}
