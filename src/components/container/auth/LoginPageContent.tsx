"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import Button from "@/components/common/Button/Button";
import TextField from "@/components/common/TextField/TextField";
import Typography from "@/components/common/Typography/Typography";
import Paper from "@/components/common/Paper/Paper";
import { loginAction } from "@/server/actions";

export type LoginPageContentProps = {
  next: string;
};

export default function LoginPageContent({ next }: LoginPageContentProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !submitting;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await loginAction(email, password);
      if (!result.success) {
        setError(result.error);
        setSubmitting(false);
        return;
      }
      // Full refresh so the root layout re-reads the new session cookie.
      router.replace(next);
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
      setSubmitting(false);
    }
  }, [canSubmit, email, password, next, router]);

  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-background px-4 py-12 text-foreground">
      <Paper variant="outlined" className="w-full max-w-sm p-8">
        <form
          className="flex flex-col gap-6"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
        >
          <div className="space-y-1 text-center">
            <Typography variant="h4" component="h1">
              Sign in
            </Typography>
            <Typography variant="body2" color="muted">
              Sign in to continue to Synapse.
            </Typography>
          </div>

          {error ? (
            <div
              className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive"
              role="alert"
            >
              {error}
            </div>
          ) : null}

          <TextField
            variant="outlined"
            type="email"
            label="Email"
            placeholder="you@example.com"
            autoComplete="username"
            fullWidth
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <TextField
            variant="outlined"
            type="password"
            label="Password"
            placeholder="••••••••"
            autoComplete="current-password"
            fullWidth
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={!canSubmit}
            loading={submitting}
            startIcon={<LogIn size={16} />}
          >
            Sign in
          </Button>
        </form>
      </Paper>
    </div>
  );
}
