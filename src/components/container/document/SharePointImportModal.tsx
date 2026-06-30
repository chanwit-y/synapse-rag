"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import Modal from "@/components/common/Modal/Modal";
import Button from "@/components/common/Button/Button";
import Checkbox from "@/components/common/Checkbox/Checkbox";
import TextField from "@/components/common/TextField/TextField";
import {
  getSharePointDefaultsAction,
  listSharePointFilesAction,
} from "@/server/actions";
import type { SharePointFileEntry } from "@/server/services";

function unwrap<T>(
  result: { success: true; data: T } | { success: false; error: string },
): T {
  if (!result.success) throw new Error(result.error);
  return result.data;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export type SharePointImportModalProps = {
  open: boolean;
  onClose: () => void;
  /** Imports the selected files; parent handles the collection target + refresh. */
  onImport: (
    site: string,
    folderServerRelativeUrl: string,
    selectedUrls: string[],
  ) => Promise<void>;
};

export default function SharePointImportModal({
  open,
  onClose,
  onImport,
}: SharePointImportModalProps) {
  const [site, setSite] = useState("");
  const [folder, setFolder] = useState("");
  const [files, setFiles] = useState<SharePointFileEntry[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Pre-fill site + folder from the active connection's defaults when opened.
  useEffect(() => {
    if (!open) return;
    void (async () => {
      const res = await getSharePointDefaultsAction();
      if (res.success) {
        if (res.data.site) setSite((cur) => cur || res.data.site);
        if (res.data.folder) setFolder((cur) => cur || res.data.folder);
      }
    })();
  }, [open]);

  const resetState = useCallback(() => {
    setSite("");
    setFolder("");
    setFiles(null);
    setSelected(new Set());
    setError(null);
    setIsLoading(false);
    setIsImporting(false);
  }, []);

  const handleList = useCallback(async () => {
    if (!site.trim() || !folder.trim()) return;
    setIsLoading(true);
    setError(null);
    setFiles(null);
    setSelected(new Set());
    try {
      const list = unwrap(await listSharePointFilesAction(site.trim(), folder.trim()));
      setFiles(list);
      // Pre-select all supported files.
      setSelected(new Set(list.filter((f) => f.supported).map((f) => f.serverRelativeUrl)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to list files");
    } finally {
      setIsLoading(false);
    }
  }, [site, folder]);

  const toggleSelect = useCallback((url: string) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(url)) n.delete(url);
      else n.add(url);
      return n;
    });
  }, []);

  const handleImport = useCallback(async () => {
    if (selected.size === 0) return;
    setIsImporting(true);
    try {
      await onImport(site.trim(), folder.trim(), [...selected]);
    } finally {
      setIsImporting(false);
    }
  }, [onImport, site, folder, selected]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      onExited={resetState}
      size="lg"
      title={<span>Import files from SharePoint</span>}
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">
            {selected.size} {selected.size === 1 ? "file" : "files"} selected
          </span>
          <div className="flex gap-2">
            <Button variant="outlined" onClick={onClose} disabled={isImporting}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleImport()}
              loading={isImporting}
              disabled={selected.size === 0}
            >
              Import files
            </Button>
          </div>
        </div>
      }
    >
      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
        <TextField
          variant="outlined"
          label="Site path"
          placeholder="/sites/AIteamN"
          fullWidth
          value={site}
          onChange={(e) => setSite(e.target.value)}
        />
        <TextField
          variant="outlined"
          label="Folder (server-relative URL)"
          placeholder="/sites/AIteamN/Shared Documents/ai-drop-zone"
          fullWidth
          value={folder}
          onChange={(e) => setFolder(e.target.value)}
        />
        <Button
          variant="outlined"
          onClick={() => void handleList()}
          loading={isLoading}
          disabled={!site.trim() || !folder.trim()}
        >
          List files
        </Button>
      </div>

      {error ? (
        <div
          className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div className="max-h-[50vh] min-h-[200px] overflow-y-auto rounded-md border border-border">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Listing files…
          </div>
        ) : files === null ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Enter a site and folder path, then “List files”.
          </div>
        ) : files.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No files found in that folder.
          </div>
        ) : (
          <div className="py-1">
            {files.map((file) => (
              <div
                key={file.serverRelativeUrl}
                className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm hover:bg-surface"
              >
                <Checkbox
                  checked={selected.has(file.serverRelativeUrl)}
                  onChange={() => toggleSelect(file.serverRelativeUrl)}
                  disabled={!file.supported}
                  aria-label={`Select ${file.name}`}
                />
                <span
                  className={`truncate ${file.supported ? "text-foreground" : "text-muted-foreground"}`}
                  title={file.name}
                >
                  {file.name}
                </span>
                {!file.supported ? (
                  <span className="shrink-0 rounded bg-surface-strong px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Unsupported
                  </span>
                ) : null}
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                  {formatBytes(file.size)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
