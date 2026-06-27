"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, KeyRound, UserPen } from "lucide-react";
import { Popover } from "@/components/common/Popover";
import Modal from "@/components/common/Modal/Modal";
import Button from "@/components/common/Button/Button";
import TextField from "@/components/common/TextField/TextField";
import Flex from "@/components/common/Flex/Flex";
import { useSnackbar } from "@/components/common/Snackbar/Snackbar";
import type { UserRecord } from "@/components/container/users/types";
import {
  changeOwnPasswordAction,
  logoutAction,
  updateOwnNameAction,
} from "@/server/actions";

function initials(user: UserRecord): string {
  const source = user.name.trim() || user.email;
  return source.slice(0, 2).toUpperCase();
}

export default function UserMenu({ user }: { user: UserRecord }) {
  const router = useRouter();
  const { showSnackbar } = useSnackbar();
  const anchorRef = useRef<HTMLButtonElement>(null);

  const [open, setOpen] = useState(false);
  const [nameModal, setNameModal] = useState(false);
  const [pwModal, setPwModal] = useState(false);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState(user.name);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const closeMenu = useCallback(() => setOpen(false), []);

  const handleLogout = useCallback(async () => {
    setBusy(true);
    await logoutAction();
    router.replace("/login");
    router.refresh();
  }, [router]);

  const openNameModal = useCallback(() => {
    setName(user.name);
    setError(null);
    setNameModal(true);
    setOpen(false);
  }, [user.name]);

  const openPwModal = useCallback(() => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    setPwModal(true);
    setOpen(false);
  }, []);

  const handleSaveName = useCallback(async () => {
    setError(null);
    setBusy(true);
    const result = await updateOwnNameAction(name);
    setBusy(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setNameModal(false);
    showSnackbar({ message: "Profile updated", variant: "success" });
    router.refresh();
  }, [name, router, showSnackbar]);

  const handleChangePassword = useCallback(async () => {
    setError(null);
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }
    setBusy(true);
    const result = await changeOwnPasswordAction(currentPassword, newPassword);
    setBusy(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setPwModal(false);
    showSnackbar({ message: "Password changed", variant: "success" });
  }, [currentPassword, newPassword, confirmPassword, showSnackbar]);

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary transition-colors hover:bg-primary/25"
      >
        {initials(user)}
      </button>

      <Popover open={open} onClose={closeMenu} anchorRef={anchorRef} align="end">
        <div className="w-56 overflow-hidden rounded-lg border border-border bg-background py-1 shadow-lg">
          <div className="border-b border-border px-3 py-2">
            <p className="truncate text-sm font-medium text-foreground">
              {user.name || "—"}
            </p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
          <MenuButton icon={<UserPen size={16} />} label="Edit name" onClick={openNameModal} />
          <MenuButton icon={<KeyRound size={16} />} label="Change password" onClick={openPwModal} />
          <MenuButton
            icon={<LogOut size={16} />}
            label="Sign out"
            onClick={() => void handleLogout()}
          />
        </div>
      </Popover>

      <Modal
        open={nameModal}
        onClose={() => setNameModal(false)}
        size="sm"
        title="Edit name"
        footer={
          <Flex gap={2} justify="flex-end" style={{ width: "100%" }}>
            <Button variant="text" onClick={() => setNameModal(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={() => void handleSaveName()}
              loading={busy}
              disabled={busy}
            >
              Save
            </Button>
          </Flex>
        }
      >
        <div className="flex flex-col gap-4">
          {error ? <ErrorBanner message={error} /> : null}
          <TextField
            variant="outlined"
            label="Display name"
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
      </Modal>

      <Modal
        open={pwModal}
        onClose={() => setPwModal(false)}
        size="sm"
        title="Change password"
        footer={
          <Flex gap={2} justify="flex-end" style={{ width: "100%" }}>
            <Button variant="text" onClick={() => setPwModal(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={() => void handleChangePassword()}
              loading={busy}
              disabled={
                busy ||
                !currentPassword ||
                !newPassword ||
                !confirmPassword
              }
            >
              Update password
            </Button>
          </Flex>
        }
      >
        <div className="flex flex-col gap-4">
          {error ? <ErrorBanner message={error} /> : null}
          <TextField
            variant="outlined"
            type="password"
            label="Current password"
            autoComplete="current-password"
            fullWidth
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <TextField
            variant="outlined"
            type="password"
            label="New password"
            autoComplete="new-password"
            fullWidth
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <TextField
            variant="outlined"
            type="password"
            label="Confirm new password"
            autoComplete="new-password"
            fullWidth
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
      </Modal>
    </>
  );
}

function MenuButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-surface-strong"
    >
      <span className="text-muted-foreground">{icon}</span>
      {label}
    </button>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
      role="alert"
    >
      {message}
    </div>
  );
}
