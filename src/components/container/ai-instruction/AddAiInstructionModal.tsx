"use client";

import { useCallback, useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import Modal from "@/components/common/Modal/Modal";
import Button from "@/components/common/Button/Button";
import TextField from "@/components/common/TextField/TextField";
import Switch from "@/components/common/Switch/Switch";
import Flex from "@/components/common/Flex/Flex";
import Typography from "@/components/common/Typography/Typography";
import type { AiInstructionFormValues } from "./types";

const DEFAULT_FORM: AiInstructionFormValues = {
  name: "",
  description: "",
  content: "",
  active: true,
};

type AddAiInstructionModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: AiInstructionFormValues) => void | Promise<void>;
  title?: string;
  submitLabel?: string;
  initialValues?: Partial<AiInstructionFormValues>;
};

export default function AddAiInstructionModal({
  open,
  onClose,
  onSubmit,
  title = "Add instruction",
  submitLabel = "Save instruction",
  initialValues,
}: AddAiInstructionModalProps) {
  const [form, setForm] = useState<AiInstructionFormValues>({
    ...DEFAULT_FORM,
    ...initialValues,
  });

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

  const patchForm = useCallback((patch: Partial<AiInstructionFormValues>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const canSubmit =
    form.name.trim().length > 0 && form.content.trim().length > 0;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    await onSubmit({
      ...form,
      name: form.name.trim(),
      description: form.description.trim(),
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
          Templates are reusable system prompts. An active template can be picked
          in the chat to steer the model.
        </Typography>

        <TextField
          variant="outlined"
          label="Name"
          placeholder="e.g. Concise technical answers"
          fullWidth
          value={form.name}
          onChange={(e) => patchForm({ name: e.target.value })}
        />

        <TextField
          variant="outlined"
          label="Description"
          placeholder="Short summary of when to use this (optional)"
          fullWidth
          value={form.description}
          onChange={(e) => patchForm({ description: e.target.value })}
        />

        <TextField
          variant="outlined"
          label="Instruction"
          placeholder="You are a helpful assistant that…"
          fullWidth
          multiline
          minRows={6}
          value={form.content}
          onChange={(e) => patchForm({ content: e.target.value })}
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
