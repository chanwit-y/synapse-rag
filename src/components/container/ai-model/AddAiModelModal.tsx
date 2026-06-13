"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Modal from "@/components/common/Modal/Modal";
import Button from "@/components/common/Button/Button";
import TextField from "@/components/common/TextField/TextField";
import SelectField from "@/components/common/SelectField/SelectField";
import Switch from "@/components/common/Switch/Switch";
import Typography from "@/components/common/Typography/Typography";
import { Cpu, Sparkles } from "lucide-react";
import { MODEL_ID_OPTIONS, MODEL_TYPE_OPTIONS } from "./mockData";
import type { AiModelFormValues, AiModelProvider, AiModelType, ApiKeyOption } from "./types";

const DEFAULT_FORM: AiModelFormValues = {
  apiKeyId: null,
  name: "",
  provider: "openai",
  modelId: "",
  type: "chat",
  contextWindow: 128000,
  temperature: 0.7,
  isDefault: false,
  active: true,
};

type AddAiModelModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: AiModelFormValues) => void | Promise<void>;
  title?: string;
  submitLabel?: string;
  initialValues?: Partial<AiModelFormValues>;
  apiKeyOptions: ApiKeyOption[];
};

export default function AddAiModelModal({ open, onClose, onSubmit }: AddAiModelModalProps) {
  const {
    title = "Add AI model",
    submitLabel = "Save model",
    initialValues,
    apiKeyOptions,
  } = arguments[0] as AddAiModelModalProps;

  const [form, setForm] = useState<AiModelFormValues>({ ...DEFAULT_FORM, ...initialValues });

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

  const patchForm = useCallback((patch: Partial<AiModelFormValues>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const selectedApiKey = useMemo(
    () => apiKeyOptions.find((k) => k.id === form.apiKeyId) ?? null,
    [apiKeyOptions, form.apiKeyId],
  );

  const derivedProvider: AiModelProvider = selectedApiKey?.provider ?? form.provider;

  const modelIdOptions = useMemo(() => {
    const presets = MODEL_ID_OPTIONS[derivedProvider] ?? [];
    if (form.modelId && !presets.some((o) => o.value === form.modelId)) {
      return [{ value: form.modelId, label: form.modelId }, ...presets];
    }
    return presets;
  }, [derivedProvider, form.modelId]);

  const showTemperature = form.type === "chat" || form.type === "completion";

  const canSubmit =
    form.name.trim().length > 0 &&
    form.modelId.trim().length > 0 &&
    form.apiKeyId != null;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    try {
      await onSubmit({
        ...form,
        provider: derivedProvider,
        name: form.name.trim(),
        modelId: form.modelId.trim(),
        temperature: showTemperature ? form.temperature : null,
      });
      handleClose();
    } catch {
      // Parent surfaces the error; keep the modal open.
    }
  }, [canSubmit, form, derivedProvider, onSubmit, handleClose, showTemperature]);

  const handleApiKeyChange = useCallback(
    (apiKeyId: string | null) => {
      const apiKey = apiKeyOptions.find((k) => k.id === apiKeyId);
      const provider = apiKey?.provider ?? "openai";
      const presets = MODEL_ID_OPTIONS[provider] ?? [];
      const first = presets[0];
      setForm((prev) => ({
        ...prev,
        apiKeyId: apiKeyId ?? null,
        provider,
        modelId: first?.value ?? "",
        type: first?.type ?? prev.type,
      }));
    },
    [apiKeyOptions],
  );

  const handleModelIdChange = useCallback(
    (modelId: string) => {
      const preset = MODEL_ID_OPTIONS[derivedProvider]?.find((o) => o.value === modelId);
      patchForm({
        modelId,
        ...(preset?.type ? { type: preset.type } : {}),
      });
    },
    [derivedProvider, patchForm],
  );

  return (
    <Modal
      open={open}
      onClose={handleClose}
      size="md"
      title={title}
      footer={
        <div className="flex w-full justify-end gap-3">
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
      <div className="flex flex-col gap-4">
        <Typography variant="body2" color="muted">
          Configure models used for chat, embeddings, and completions.
        </Typography>

        <TextField
          variant="outlined"
          label="Name"
          placeholder="e.g. Default chat — GPT-4o"
          fullWidth
          value={form.name}
          onChange={(e) => patchForm({ name: e.target.value })}
        />

        <SelectField
          variant="outlined"
          label="API Key"
          fullWidth
          options={apiKeyOptions.map((k) => ({
            value: k.id,
            label: `${k.name} (${k.provider})`,
          }))}
          value={form.apiKeyId ?? ""}
          onChange={(value) => handleApiKeyChange(value ? String(value) : null)}
        />

        <SelectField
          variant="outlined"
          label="Type"
          fullWidth
          options={MODEL_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          value={form.type}
          onChange={(value) => {
            const type = (value ?? "chat") as AiModelType;
            patchForm({
              type,
              temperature: type === "embedding" ? null : (form.temperature ?? 0.7),
            });
          }}
        />

        {modelIdOptions.length > 0 ? (
          <SelectField
            variant="outlined"
            label="Model ID"
            fullWidth
            options={modelIdOptions.map((o) => ({ value: o.value, label: o.label }))}
            value={form.modelId}
            onChange={(value) => handleModelIdChange(value != null ? String(value) : "")}
          />
        ) : (
          <TextField
            variant="outlined"
            label="Model ID"
            placeholder="e.g. my-custom-model"
            fullWidth
            value={form.modelId}
            onChange={(e) => patchForm({ modelId: e.target.value })}
            startAdornment={<Cpu size={16} />}
          />
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            variant="outlined"
            label="Context window (tokens)"
            type="number"
            fullWidth
            value={String(form.contextWindow)}
            onChange={(e) =>
              patchForm({ contextWindow: Number(e.target.value) || 4096 })
            }
          />
          {showTemperature ? (
            <TextField
              variant="outlined"
              label="Temperature"
              type="number"
              fullWidth
              min={0}
              max={2}
              step={0.1}
              value={form.temperature != null ? String(form.temperature) : ""}
              onChange={(e) =>
                patchForm({ temperature: Number(e.target.value) })
              }
            />
          ) : (
            <div className="hidden sm:block" aria-hidden />
          )}
        </div>

        <Switch
          label="Set as default for this type"
          checked={form.isDefault}
          onChange={(e) => patchForm({ isDefault: e.target.checked })}
        />

        <Switch
          label="Active"
          checked={form.active}
          onChange={(e) => patchForm({ active: e.target.checked })}
        />
      </div>
    </Modal>
  );
}
