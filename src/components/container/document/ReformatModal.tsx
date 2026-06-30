"use client";

import { useCallback, useState } from "react";
import { Sparkles, AlertTriangle } from "lucide-react";
import Modal from "@/components/common/Modal/Modal";
import Button from "@/components/common/Button/Button";
import SelectField from "@/components/common/SelectField/SelectField";
import DiffViewer from "@/components/common/DiffViewer/DiffViewer";
import { reformatDocumentAction } from "@/server/actions";

/** Warn when the reformatted text is this fraction (or less) of the original. */
const LENGTH_DROP_RATIO = 0.7;

export type ReformatModalProps = {
  open: boolean;
  onClose: () => void;
  /** The current editor text (respects unsaved edits) to reformat. */
  sourceText: string;
  /** Active chat models the user can run the reformat with. */
  models: { id: string; name: string }[];
  /** Preselected model id (the document's default chat model). */
  defaultModelId: string | null;
  /** Persist the accepted result (parent saves + updates the editor). */
  onApply: (newText: string) => Promise<void> | void;
};

export default function ReformatModal({
  open,
  onClose,
  sourceText,
  models,
  defaultModelId,
  onApply,
}: ReformatModalProps) {
  // Only the user's explicit choice is stored; until then the picker follows the
  // default (which may resolve after mount as models load). Deriving it avoids a
  // set-state-in-effect to keep them in sync.
  const [modelOverride, setModelOverride] = useState<string | null>(null);
  const modelId = modelOverride ?? defaultModelId;
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReformatting, setIsReformatting] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const resetState = useCallback(() => {
    setResult(null);
    setError(null);
    setIsReformatting(false);
    setIsApplying(false);
  }, []);

  const handleReformat = useCallback(async () => {
    if (!modelId || isReformatting) return;
    setIsReformatting(true);
    setError(null);
    setResult(null);
    const res = await reformatDocumentAction(sourceText, modelId);
    if (res.success) {
      setResult(res.data);
    } else {
      setError(res.error);
    }
    setIsReformatting(false);
  }, [modelId, sourceText, isReformatting]);

  const handleApply = useCallback(async () => {
    if (result == null || isApplying) return;
    setIsApplying(true);
    try {
      await onApply(result);
      onClose();
    } finally {
      setIsApplying(false);
    }
  }, [result, isApplying, onApply, onClose]);

  const sourceLen = sourceText.trim().length;
  const shortResult =
    result != null && sourceLen > 0 && result.trim().length < sourceLen * LENGTH_DROP_RATIO;

  return (
    <Modal
      open={open}
      onClose={onClose}
      onExited={resetState}
      size="xl"
      title={
        <span className="inline-flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-brand-500" /> Reformat with AI
        </span>
      }
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            {result == null
              ? "Cleans up extracted/OCR text into tidy Markdown. Numbers and wording are preserved."
              : "Review the diff below, then apply."}
          </span>
          <div className="flex gap-2">
            <Button variant="outlined" onClick={onClose} disabled={isApplying}>
              Cancel
            </Button>
            {result == null ? (
              <Button
                onClick={() => void handleReformat()}
                loading={isReformatting}
                disabled={!modelId || sourceLen === 0}
              >
                Reformat
              </Button>
            ) : (
              <>
                <Button
                  variant="outlined"
                  onClick={() => setResult(null)}
                  disabled={isApplying}
                >
                  Back
                </Button>
                <Button onClick={() => void handleApply()} loading={isApplying}>
                  Apply
                </Button>
              </>
            )}
          </div>
        </div>
      }
    >
      <div className="mb-3 flex items-end gap-3">
        <SelectField
          size="small"
          label="Model"
          aria-label="Reformat model"
          placeholder="Select a model"
          options={models.map((m) => ({ value: m.id, label: m.name }))}
          value={modelId}
          onChange={(v) => setModelOverride(v == null ? null : String(v))}
          className="w-64"
          disabled={result != null || isReformatting}
        />
        {models.length === 0 ? (
          <p className="pb-1.5 text-xs text-muted-foreground">
            Add an active chat model in Settings → AI Model first.
          </p>
        ) : null}
      </div>

      {error ? (
        <div
          className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {shortResult ? (
        <div
          className="mb-3 flex items-start gap-2 rounded-md border border-amber-300/40 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400"
          role="alert"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            The reformatted text is much shorter than the original — content may
            have been dropped. Review the diff carefully before applying.
          </span>
        </div>
      ) : null}

      {result == null ? (
        <div className="rounded-md border border-border bg-surface/50 px-4 py-8 text-center text-sm text-muted-foreground">
          {isReformatting
            ? "Reformatting… large documents are processed in segments and may take a moment."
            : "Choose a model and click Reformat to generate a cleaned-up version."}
        </div>
      ) : (
        <DiffViewer oldText={sourceText} newText={result} />
      )}
    </Modal>
  );
}
