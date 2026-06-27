"use client";

import { useCallback, useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import Modal from "@/components/common/Modal/Modal";
import Button from "@/components/common/Button/Button";
import TextField from "@/components/common/TextField/TextField";
import Switch from "@/components/common/Switch/Switch";
import Flex from "@/components/common/Flex/Flex";
import type { CreateUserFormValues } from "./types";

export type UserModalSubmit = CreateUserFormValues;

type UserModalProps = {
  open: boolean;
  mode: "create" | "edit";
  onClose: () => void;
  onSubmit: (values: UserModalSubmit) => void | Promise<void>;
  /** Prefill (edit). Email is read-only in edit mode. */
  initialValues?: { email: string; name: string; active: boolean };
};

const EMPTY = { email: "", name: "", password: "", active: true };

export default function UserModal({
  open,
  mode,
  onClose,
  onSubmit,
  initialValues,
}: UserModalProps) {
  const [form, setForm] = useState<CreateUserFormValues>(EMPTY);

  const reset = useCallback(() => {
    setForm({
      email: initialValues?.email ?? "",
      name: initialValues?.name ?? "",
      password: "",
      active: initialValues?.active ?? true,
    });
  }, [initialValues]);

  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  const patch = useCallback((p: Partial<CreateUserFormValues>) => {
    setForm((prev) => ({ ...prev, ...p }));
  }, []);

  const isCreate = mode === "create";
  const canSubmit = isCreate
    ? form.email.trim().length > 0 && form.password.length >= 8
    : true;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    await onSubmit({
      ...form,
      email: form.email.trim(),
      name: form.name.trim(),
    });
  }, [canSubmit, form, onSubmit]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={isCreate ? "Add user" : "Edit user"}
      footer={
        <Flex gap={2} justify="flex-end" style={{ width: "100%" }}>
          <Button variant="text" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            startIcon={<UserPlus size={16} />}
          >
            {isCreate ? "Create user" : "Save changes"}
          </Button>
        </Flex>
      }
    >
      <div className="flex flex-col gap-4">
        <TextField
          variant="outlined"
          type="email"
          label="Email"
          placeholder="you@example.com"
          fullWidth
          value={form.email}
          disabled={!isCreate}
          onChange={(e) => patch({ email: e.target.value })}
        />

        <TextField
          variant="outlined"
          label="Display name"
          placeholder="Optional"
          fullWidth
          value={form.name}
          onChange={(e) => patch({ name: e.target.value })}
        />

        {isCreate ? (
          <TextField
            variant="outlined"
            type="password"
            label="Password"
            placeholder="At least 8 characters"
            autoComplete="new-password"
            fullWidth
            value={form.password}
            onChange={(e) => patch({ password: e.target.value })}
          />
        ) : null}

        <Switch
          label="Active"
          checked={form.active}
          onChange={(e) => patch({ active: e.target.checked })}
        />
      </div>
    </Modal>
  );
}
