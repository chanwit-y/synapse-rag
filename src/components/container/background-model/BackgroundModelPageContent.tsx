"use client";

import { useCallback, useMemo, useState } from "react";
import Button from "@/components/common/Button/Button";
import Flex from "@/components/common/Flex/Flex";
import Paper from "@/components/common/Paper/Paper";
import SelectField from "@/components/common/SelectField/SelectField";
import Typography from "@/components/common/Typography/Typography";
import ApiLoadingBackdrop from "@/components/common/ApiLoadingBackdrop/ApiLoadingBackdrop";
import { useApiLoading } from "@/hooks/useApiLoading";
import { setBackgroundModelAction } from "@/server/actions";
import type { BackgroundModelOption } from "./types";

/** Sentinel value for the "not set" option (SelectField uses string/number values). */
const UNSET = "";

function unwrapAction<T>(
  result: { success: true; data: T } | { success: false; error: string },
): T {
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.data;
}

export type BackgroundModelPageContentProps = {
  initialModelId: string | null;
  modelOptions: BackgroundModelOption[];
  loadError?: string | null;
};

export default function BackgroundModelPageContent({
  initialModelId,
  modelOptions,
  loadError = null,
}: BackgroundModelPageContentProps) {
  const [selected, setSelected] = useState<string>(initialModelId ?? UNSET);
  const [saved, setSaved] = useState<string>(initialModelId ?? UNSET);
  const [actionError, setActionError] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState(false);
  const { isLoading, withLoading } = useApiLoading();

  const options = useMemo(
    () => [
      { value: UNSET, label: "Not set — use the chat's selected model" },
      ...modelOptions.map((m) => ({
        value: m.id,
        label: `${m.name} — ${m.modelId} (${m.provider})`,
      })),
    ],
    [modelOptions],
  );

  const dirty = selected !== saved;

  const handleSave = useCallback(async () => {
    setActionError(null);
    setSavedNote(false);
    try {
      await withLoading(async () => {
        const result = unwrapAction(
          await setBackgroundModelAction(selected === UNSET ? null : selected),
        );
        const next = result.modelId ?? UNSET;
        setSelected(next);
        setSaved(next);
        setSavedNote(true);
      });
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "An unexpected error occurred",
      );
    }
  }, [selected, withLoading]);

  return (
    <div className="relative flex flex-col gap-6 p-6">
      <ApiLoadingBackdrop show={isLoading} />

      {loadError ? (
        <div
          className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive"
          role="alert"
        >
          Failed to load setting: {loadError}
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

      <div className="space-y-1">
        <Typography variant="h4" component="h1">
          Background Model
        </Typography>
        <Typography variant="body2" color="muted">
          The chat model used for cheap background tasks — query expansion,
          context summaries, and Wikipedia grounding. When unset, each task uses
          the model selected in the chat.
        </Typography>
      </div>

      <Paper variant="outlined" className="max-w-xl space-y-4 p-5">
        <SelectField
          variant="outlined"
          label="Background model"
          fullWidth
          options={options}
          value={selected}
          onChange={(value) => {
            setSelected(value != null ? String(value) : UNSET);
            setSavedNote(false);
          }}
          helperText={
            modelOptions.length === 0
              ? "No active chat models yet. Add one under Settings → AI Model."
              : undefined
          }
        />

        <Flex align="center" gap={3}>
          <Button
            variant="contained"
            size="small"
            onClick={() => void handleSave()}
            disabled={isLoading || !dirty}
            loading={isLoading}
          >
            Save
          </Button>
          {savedNote && !dirty ? (
            <Typography variant="body2" color="muted">
              Saved.
            </Typography>
          ) : null}
        </Flex>
      </Paper>
    </div>
  );
}
