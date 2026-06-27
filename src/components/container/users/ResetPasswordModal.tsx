"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound } from "lucide-react";
import Modal from "@/components/common/Modal/Modal";
import Button from "@/components/common/Button/Button";
import TextField from "@/components/common/TextField/TextField";
import Flex from "@/components/common/Flex/Flex";

type ResetPasswordModalProps = {
  open: boolean;
  email: string;
  onClose: () => void;
  onSubmit: (newPassword: string) => void | Promise<void>;
};

export default function ResetPasswordModal({
  open,
  email,
  onClose,
  onSubmit,
}: ResetPasswordModalProps) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setPassword("");
      setConfirm("");
      setError(null);
    }
  }, [open]);

  const handleSubmit = useCallback(async () => {
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setError(null);
    await onSubmit(password);
  }, [password, confirm, onSubmit]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Reset password"
      footer={
        <Flex gap={2} justify="flex-end" style={{ width: "100%" }}>
          <Button variant="text" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleSubmit()}
            disabled={!password || !confirm}
            startIcon={<KeyRound size={16} />}
          >
            Reset password
          </Button>
        </Flex>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Set a new password for{" "}
          <span className="font-semibold text-foreground">{email}</span>.
        </p>
        {error ? (
          <div
            className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            {error}
          </div>
        ) : null}
        <TextField
          variant="outlined"
          type="password"
          label="New password"
          autoComplete="new-password"
          fullWidth
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <TextField
          variant="outlined"
          type="password"
          label="Confirm password"
          autoComplete="new-password"
          fullWidth
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>
    </Modal>
  );
}
