"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Modal from "@/components/common/Modal/Modal";
import Button from "@/components/common/Button/Button";
import TextField from "@/components/common/TextField/TextField";
import SelectField from "@/components/common/SelectField/SelectField";
import Switch from "@/components/common/Switch/Switch";
import Flex from "@/components/common/Flex/Flex";
import Typography from "@/components/common/Typography/Typography";
import { KeyRound, Sparkles } from "lucide-react";
import { PROVIDER_OPTIONS } from "./mockData";
import type { ApiKeyFormValues, ApiKeyProvider } from "./types";

const DEFAULT_FORM: ApiKeyFormValues = {
  name: "",
  provider: "openai",
  apiKey: "",
  endpoint: "",
  apiVersion: "",
  active: true,
};

type AddApiKeyModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: ApiKeyFormValues) => void | Promise<void>;
  title?: string;
  submitLabel?: string;
  initialValues?: Partial<ApiKeyFormValues>;
  apiKeyOptional?: boolean;
};

export default function AddApiKeyModal({ open, onClose, onSubmit }: AddApiKeyModalProps) {
  const {
    title = "Add API key",
    submitLabel = "Save key",
    initialValues,
    apiKeyOptional = false,
  } = arguments[0] as AddApiKeyModalProps;

  const [form, setForm] = useState<ApiKeyFormValues>({ ...DEFAULT_FORM, ...initialValues });

  const resetState = useCallback(() => {
    setForm({ ...DEFAULT_FORM, ...initialValues });
  }, [initialValues]);

  useEffect(() => {
    if (!open) return;
    resetState();
  }, [open, resetState]);

  const handleClose = useCallback(() => {
    onClose();
    resetState();
  }, [onClose, resetState]);

  const patchForm = useCallback((patch: Partial<ApiKeyFormValues>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const providerLabel = useMemo(
    () => PROVIDER_OPTIONS.find((p) => p.value === form.provider)?.label ?? "Provider",
    [form.provider],
  );

  const isFoundry = form.provider === "microsoft-foundry";

  // Foundry needs an endpoint; its key is optional (blank ⇒ Entra ID token).
  // For every other provider the key is required (unless we're editing).
  const canSubmit =
    form.name.trim().length > 0 &&
    (isFoundry
      ? (form.endpoint ?? "").trim().length > 0
      : apiKeyOptional || form.apiKey.trim().length > 0);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    await onSubmit({
      ...form,
      name: form.name.trim(),
      apiKey: form.apiKey.trim(),
      endpoint: (form.endpoint ?? "").trim(),
      apiVersion: (form.apiVersion ?? "").trim(),
    });
    handleClose();
  }, [canSubmit, form, onSubmit, handleClose]);

  return (
    <Modal
      open={open}
      onClose={handleClose}
      size="md"
      title={title}
      footer={
        <Flex gap={6} justify="flex-end" style={{ width: "100%" }}>
          <Button variant="text" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            startIcon={<Sparkles size={16} />}
          >
            {submitLabel}
          </Button>
        </Flex>
      }
    >
      <div className="flex flex-col gap-4">
        <Typography variant="body2" color="muted">
          The full key is stored on the server; the table shows a masked value only.
        </Typography>

        <TextField
          variant="outlined"
          label="Name"
          placeholder="e.g. OpenAI production"
          fullWidth
          value={form.name}
          onChange={(e) => patchForm({ name: e.target.value })}
        />

        <SelectField
          variant="outlined"
          label="Provider"
          fullWidth
          options={PROVIDER_OPTIONS.filter((o) => o.value !== "sharepoint").map(
            (o) => ({ value: o.value, label: o.label }),
          )}
          value={form.provider}
          onChange={(value) =>
            patchForm({ provider: (value ?? "openai") as ApiKeyProvider })
          }
        />

        {isFoundry ? (
          <>
            <TextField
              variant="outlined"
              label="Endpoint"
              placeholder="https://<resource>.services.ai.azure.com/openai/v1"
              fullWidth
              value={form.endpoint ?? ""}
              onChange={(e) => patchForm({ endpoint: e.target.value })}
            />
            <TextField
              variant="outlined"
              label="API version"
              placeholder="Leave blank for /openai/v1 (GA)"
              fullWidth
              value={form.apiVersion ?? ""}
              onChange={(e) => patchForm({ apiVersion: e.target.value })}
            />
          </>
        ) : null}

        <TextField
          variant="outlined"
          label={`${providerLabel} API key`}
          placeholder={
            isFoundry
              ? "Leave blank to use Entra ID (DefaultAzureCredential)"
              : apiKeyOptional
                ? "Leave blank to keep existing key"
                : "Paste your API key"
          }
          fullWidth
          value={form.apiKey}
          onChange={(e) => patchForm({ apiKey: e.target.value })}
          startAdornment={<KeyRound size={16} />}
        />

        {isFoundry ? (
          <Typography variant="caption" color="muted">
            Leave the key blank to authenticate with an Entra ID token via
            DefaultAzureCredential (needs AZURE_TENANT_ID / AZURE_CLIENT_ID /
            AZURE_CLIENT_SECRET or a managed identity on the host).
          </Typography>
        ) : null}

        <Switch
          label="Active"
          checked={form.active}
          onChange={(e) => patchForm({ active: e.target.checked })}
        />
      </div>
    </Modal>
  );
}

