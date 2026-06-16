"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { FileSidebar } from "@/components/common/FileTree";
import type { TreeNode, TreeViewGroup } from "@/components/common/FileTree";

// The markdown editor pulls in @uiw/react-md-editor (+ remark/rehype/katex),
// a large bundle only needed once a document is open. Load it lazily so it
// stays out of the document route's initial JS.
const MarkdownEditor = dynamic(
  () => import("@/components/common/MarkdownEditor").then((m) => m.MarkdownEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full flex-1 items-center justify-center text-sm text-muted-foreground">
        Loading editor…
      </div>
    ),
  },
);
import { useLayoutStore } from "@/store/layout-store";
import { Clock, FileText } from "lucide-react";
import ApiLoadingBackdrop from "@/components/common/ApiLoadingBackdrop/ApiLoadingBackdrop";
import SelectField from "@/components/common/SelectField/SelectField";
import { useApiLoading } from "@/hooks/useApiLoading";
import {
  createCollectionAction,
  deleteCollectionAction,
  deleteDocumentItemAction,
  ensureDocumentTranslationAction,
  getDocumentItemContentAction,
  importAzureUserStoriesAction,
  listChatModelsAction,
  listCollectionsAction,
  listDocumentHistoryAction,
  renameCollectionAction,
  renameDocumentItemAction,
  saveDocumentContentAction,
  saveDocumentTranslationAction,
  syncCollectionDirectoriesAction,
  uploadDocumentImageAction,
} from "@/server/actions";
import Drawer from "@/components/common/Drawer/Drawer";
import Modal from "@/components/common/Modal/Modal";
import DiffViewer from "@/components/common/DiffViewer/DiffViewer";
import AzureImportModal from "@/components/container/document/AzureImportModal";
import { useSnackbar } from "@/components/common/Snackbar/Snackbar";
import type { History } from "@/server/db/repository/history.repository";

type ViewLang = "en" | "th";

type ChatModelOption = { id: string; name: string; isDefault: boolean };

function subscribeToColorScheme(callback: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

function getPrefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function getDefaultContent(fileName: string): string {
  const title = fileName.replace(/\.md$/i, "");
  return `# ${title}\n\nStart writing your document here.`;
}

function unwrapAction<T>(result: { success: true; data: T } | { success: false; error: string }): T {
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.data;
}

export interface DocumentPageContentProps {
  initialCollections: TreeViewGroup[];
  loadError?: string | null;
}

export default function DocumentPageContent({
  initialCollections,
  loadError = null,
}: DocumentPageContentProps) {
  const [collections, setCollections] = useState<TreeViewGroup[]>(initialCollections);
  const [collapsed, setCollapsed] = useState(false);
  const [width, setWidth] = useState(280);
  const [selectedFile, setSelectedFile] = useState<TreeNode | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const [editorContent, setEditorContent] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyRows, setHistoryRows] = useState<History[]>([]);
  const [selectedHistory, setSelectedHistory] = useState<History | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [azureOpen, setAzureOpen] = useState(false);
  const [azureCollectionId, setAzureCollectionId] = useState<string | null>(null);
  const [azureFolderId, setAzureFolderId] = useState<string | null>(null);
  const [viewLang, setViewLang] = useState<ViewLang>("en");
  const [thContents, setThContents] = useState<Record<string, string>>({});
  const [thSeed, setThSeed] = useState("");
  const [chatModels, setChatModels] = useState<ChatModelOption[]>([]);
  const [translationModelId, setTranslationModelId] = useState<string | null>(null);
  const { isLoading, withLoading } = useApiLoading();
  const { showSnackbar } = useSnackbar();

  const theme = useLayoutStore((s) => s.theme);
  const prefersDark = useSyncExternalStore(
    subscribeToColorScheme,
    getPrefersDark,
    () => false,
  );
  const resolvedTheme = theme === "system" ? (prefersDark ? "dark" : "light") : theme;

  const currentEditorText = useMemo(() => {
    if (!selectedFile) return "";
    if (viewLang === "th") {
      return thContents[selectedFile.id] ?? thSeed ?? "";
    }
    return fileContents[selectedFile.id] ?? editorContent ?? "";
  }, [editorContent, fileContents, selectedFile, thContents, thSeed, viewLang]);

  // Content the editor is (re)seeded with on mount; keyed by file + language so
  // a language flip remounts the editor with the right text.
  const editorSeed = viewLang === "th" ? thSeed : editorContent;

  const refreshCollections = useCallback(async () => {
    await withLoading(async () => {
      const result = await listCollectionsAction();
      if (result.success) {
        setCollections(result.data);
      }
    });
  }, [withLoading]);

  // Open a file: content is no longer shipped with the tree, so fetch it on
  // demand (using any locally cached/unsaved buffer first).
  const handleSelectFile = useCallback(
    (file: TreeNode, path: string) => {
      setSelectedFile(file);
      setSelectedPath(path);
      // A new file always opens in English; its Thai is loaded on demand.
      setViewLang("en");
      setThSeed("");

      const cached = fileContents[file.id];
      if (cached !== undefined) {
        setEditorContent(cached);
        return;
      }

      setEditorContent("");
      void withLoading(async () => {
        const result = await getDocumentItemContentAction(file.id);
        const content = result.success
          ? result.data.content || getDefaultContent(file.name)
          : getDefaultContent(file.name);
        setFileContents((prev) => ({ ...prev, [file.id]: content }));
        setEditorContent(content);
      });
    },
    [fileContents, withLoading],
  );

  const handleCreateCollection = useCallback(
    async (name: string): Promise<TreeViewGroup> =>
      withLoading(async () => unwrapAction(await createCollectionAction(name))),
    [withLoading],
  );

  const handleUpdateDirectories = useCallback(
    async (groupId: string, directories: TreeNode[]) => {
      await withLoading(async () => {
        unwrapAction(await syncCollectionDirectoriesAction(groupId, directories));
        const result = await listCollectionsAction();
        if (result.success) {
          setCollections(result.data);
        }
      });
    },
    [withLoading],
  );

  const handleDeleteFile = useCallback(
    async (fileId: string) => {
      await withLoading(async () => {
        unwrapAction(await deleteDocumentItemAction(fileId));
      });
    },
    [withLoading],
  );

  const handleUploadImage = useCallback(async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    const { path } = unwrapAction(await uploadDocumentImageAction(formData));
    return path;
  }, []);

  const handleDeleteCollection = useCallback(
    async (collectionId: string) => {
      await withLoading(async () => {
        unwrapAction(await deleteCollectionAction(collectionId));
      });
    },
    [withLoading],
  );

  const handleRenameItem = useCallback(
    async (itemId: string, newName: string) => {
      await withLoading(async () => {
        unwrapAction(await renameDocumentItemAction(itemId, newName));
      });
    },
    [withLoading],
  );

  const handleRenameCollection = useCallback(
    async (collectionId: string, newName: string) => {
      await withLoading(async () => {
        unwrapAction(await renameCollectionAction(collectionId, newName));
      });
    },
    [withLoading],
  );

  // The sidebar drives the optimistic rename; here we only realign the open
  // editor's title/path when the renamed node was (or contained) the open file.
  const handleRenamedSelection = useCallback(
    (updatedFile: TreeNode, newNodePath: string) => {
      setSelectedFile(updatedFile);
      setSelectedPath(newNodePath);
    },
    [],
  );

  const handleContentChange = useCallback(
    (content: string) => {
      if (!selectedFile) return;
      if (viewLang === "th") {
        setThContents((prev) => ({ ...prev, [selectedFile.id]: content }));
      } else {
        setFileContents((prev) => ({ ...prev, [selectedFile.id]: content }));
      }
    },
    [selectedFile, viewLang],
  );

  const handleSave = useCallback(
    async ({
      id,
      name,
      content,
      collectionId,
    }: {
      id: string | null;
      name: string;
      content: string;
      collectionId: string;
    }) =>
      withLoading(async () => {
        // In Thai view the Save button persists the translation (content_th)
        // only; the English document stays canonical.
        if (viewLang === "th") {
          if (!id) {
            throw new Error("Save the document in English before translating.");
          }
          unwrapAction(await saveDocumentTranslationAction(id, content));
          setThContents((prev) => ({ ...prev, [id]: content }));
          return { id };
        }

        const result = unwrapAction(
          await saveDocumentContentAction({ id, name, content, collectionId }),
        );
        const fileId = result.id;
        setFileContents((prev) => ({ ...prev, [fileId]: content }));
        if (!id) {
          const listResult = await listCollectionsAction();
          if (listResult.success) {
            setCollections(listResult.data);
          }
        }
        return result;
      }),
    [viewLang, withLoading],
  );

  const loadHistory = useCallback(async () => {
    if (!selectedFile) return;
    await withLoading(async () => {
      // Show only revisions for the language currently being viewed.
      const result = await listDocumentHistoryAction(selectedFile.id, viewLang);
      if (result.success) {
        // Newest first for UX.
        setHistoryRows([...result.data].sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1)));
      } else {
        setHistoryRows([]);
      }
    });
  }, [selectedFile, viewLang, withLoading]);

  useEffect(() => {
    if (historyOpen) {
      void loadHistory();
    }
  }, [historyOpen, loadHistory]);

  // Load the chat models available for translation; preselect the default one.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await listChatModelsAction();
      if (cancelled || !result.success) return;
      const options: ChatModelOption[] = result.data
        .filter((m) => m.status === "active")
        .map((m) => ({ id: m.id, name: m.name, isDefault: m.isDefault }));
      setChatModels(options);
      setTranslationModelId(
        (cur) => cur ?? options.find((o) => o.isDefault)?.id ?? options[0]?.id ?? null,
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Flip between the English document and its Thai translation. Persists the
  // current language's buffer first, then (for Thai) fetches/generates the
  // translation server-side before switching the view.
  const handleToggleLang = useCallback(
    async (next: ViewLang) => {
      if (!selectedFile || next === viewLang) return;
      const fileId = selectedFile.id;

      if (next === "th") {
        if (!translationModelId) {
          showSnackbar({
            variant: "warning",
            message: "Add an active chat model in Settings → AI Model first.",
          });
          return;
        }
        await withLoading(async () => {
          // Persist any unsaved English edits so we translate the saved content.
          const enContent = fileContents[fileId] ?? editorContent ?? "";
          unwrapAction(
            await saveDocumentContentAction({
              id: fileId,
              name: selectedFile.name || "untitled.md",
              content: enContent,
              collectionId: selectedFile.collectionId,
            }),
          );
          setFileContents((prev) => ({ ...prev, [fileId]: enContent }));
          // Keep the English seed fresh so flipping back remounts with the edits.
          setEditorContent(enContent);

          const { content, retranslated } = unwrapAction(
            await ensureDocumentTranslationAction(fileId, translationModelId),
          );
          setThSeed(content);
          setThContents((prev) => ({ ...prev, [fileId]: content }));
          setViewLang("th");
          if (retranslated) {
            showSnackbar({ variant: "success", message: "Translated to Thai." });
          }
        });
        return;
      }

      // Switching back to English: persist any unsaved Thai edits first.
      await withLoading(async () => {
        const thContent = thContents[fileId];
        if (thContent != null) {
          unwrapAction(await saveDocumentTranslationAction(fileId, thContent));
        }
        setViewLang("en");
      });
    },
    [
      editorContent,
      fileContents,
      selectedFile,
      showSnackbar,
      thContents,
      translationModelId,
      viewLang,
      withLoading,
    ],
  );

  const handleOpenAzureImport = useCallback(
    (collectionId: string, folderId: string | null) => {
      setAzureCollectionId(collectionId);
      setAzureFolderId(folderId);
      setAzureOpen(true);
    },
    [],
  );

  const handleImportUserStories = useCallback(
    async (project: string, workItemIds: number[]) => {
      if (!azureCollectionId) return;
      await withLoading(async () => {
        const result = unwrapAction(
          await importAzureUserStoriesAction(
            azureCollectionId,
            project,
            workItemIds,
            azureFolderId,
          ),
        );
        const listResult = await listCollectionsAction();
        if (listResult.success) {
          setCollections(listResult.data);
        }
        setAzureOpen(false);
        showSnackbar({
          variant: result.imported > 0 ? "success" : "info",
          message:
            `Imported ${result.imported} user ${result.imported === 1 ? "story" : "stories"}` +
            (result.skipped > 0 ? `, skipped ${result.skipped} already present` : "") +
            ".",
        });
      });
    },
    [azureCollectionId, azureFolderId, withLoading, showSnackbar],
  );

  return (
    <div className="relative flex h-[calc(100dvh-3.5rem)] min-h-0 flex-col overflow-hidden">
      <ApiLoadingBackdrop show={isLoading} />
      {loadError ? (
        <div
          className="shrink-0 border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive"
          role="alert"
        >
          Failed to load collections: {loadError}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <FileSidebar
          collections={collections}
          onCollectionsChange={setCollections}
          onCreateCollection={handleCreateCollection}
          onUpdateDirectories={handleUpdateDirectories}
          onDeleteFile={handleDeleteFile}
          onDeleteCollection={handleDeleteCollection}
          onRenameItem={handleRenameItem}
          onRenameCollection={handleRenameCollection}
          onRenamedSelection={handleRenamedSelection}
          onImportFromAzure={handleOpenAzureImport}
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((c) => !c)}
          width={width}
          onWidthChange={setWidth}
          onSelectFile={handleSelectFile}
          onClearSelection={() => {
            setSelectedFile(null);
            setSelectedPath(null);
            setEditorContent("");
            setViewLang("en");
            setThSeed("");
          }}
          selectedNodePath={selectedPath}
          selectedNodeId={selectedFile?.id ?? null}
          title="Documents"
          className="h-full! shrink-0"
        />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
          {selectedFile && selectedPath ? (
            <>
              <div className="shrink-0 border-b border-border px-6 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h1 className="truncate text-lg font-semibold text-foreground">
                      {selectedFile.name}
                    </h1>
                    <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                      {selectedPath}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {viewLang === "th" && chatModels.length > 1 ? (
                      <SelectField
                        size="small"
                        aria-label="Translation model"
                        placeholder="Model"
                        options={chatModels.map((m) => ({ value: m.id, label: m.name }))}
                        value={translationModelId}
                        onChange={(v) => setTranslationModelId(v == null ? null : String(v))}
                        className="w-44"
                      />
                    ) : null}
                    <div
                      className="inline-flex overflow-hidden rounded-md border border-border"
                      role="group"
                      aria-label="Document language"
                    >
                      <button
                        type="button"
                        className={`px-3 py-1.5 text-xs transition-colors ${
                          viewLang === "en"
                            ? "bg-primary font-semibold text-primary-foreground shadow-sm"
                            : "bg-surface font-medium text-muted-foreground hover:bg-surface/70 hover:text-foreground"
                        }`}
                        onClick={() => void handleToggleLang("en")}
                        aria-pressed={viewLang === "en"}
                      >
                        EN
                      </button>
                      <button
                        type="button"
                        className={`border-l border-border px-3 py-1.5 text-xs transition-colors ${
                          viewLang === "th"
                            ? "bg-primary font-semibold text-primary-foreground shadow-sm"
                            : "bg-surface font-medium text-muted-foreground hover:bg-surface/70 hover:text-foreground"
                        }`}
                        onClick={() => void handleToggleLang("th")}
                        aria-pressed={viewLang === "th"}
                        title="Translate to Thai with AI"
                      >
                        TH
                      </button>
                    </div>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-md border border-border bg-surface p-2 text-sm text-foreground hover:bg-surface/70"
                      onClick={() => setHistoryOpen(true)}
                      aria-label="Open history"
                      title="History"
                    >
                      <Clock className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
                <MarkdownEditor
                  key={`${selectedFile.id}:${viewLang}`}
                  selectedFile={selectedFile}
                  theme={resolvedTheme}
                  initialContent={editorSeed}
                  fullHeight
                  onChange={handleContentChange}
                  onSave={handleSave}
                  onUploadImage={handleUploadImage}
                />
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  No document selected
                </p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Choose a file from the sidebar to view or edit it.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <Drawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        anchor="right"
        size="md"
        title={<span>History</span>}
      >
        {!selectedFile ? (
          <div className="text-sm text-muted-foreground">Select a document to view its history.</div>
        ) : historyRows.length ? (
          <div className="flex flex-col gap-2">
            {historyRows.map((h) => {
              const ts = typeof h.createdAt === "string" ? new Date(h.createdAt) : new Date(h.createdAt);
              return (
                <button
                  key={h.id}
                  type="button"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-left hover:bg-surface"
                  onClick={() => {
                    setSelectedHistory(h);
                    setCompareOpen(true);
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">Revision</span>
                      <span className="rounded bg-surface-strong px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {h.lang === "th" ? "TH" : "EN"}
                      </span>
                    </div>
                    <div className="font-mono text-[11px] text-muted-foreground">
                      {Number.isNaN(ts.getTime()) ? String(h.createdAt) : ts.toLocaleString()}
                    </div>
                  </div>
                  <div className="mt-1 line-clamp-2 font-mono text-[11px] text-muted-foreground">
                    {(h.content ?? "").slice(0, 200) || "(empty)"}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            No history yet. Save the document to create revisions.
          </div>
        )}
      </Drawer>

      <Modal
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        size="xl"
        title={<span>Compare changes</span>}
      >
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            Showing diff: <span className="font-mono">history</span> →{" "}
            <span className="font-mono">current</span>
          </div>
          <DiffViewer oldText={selectedHistory?.content ?? ""} newText={currentEditorText} />
        </div>
      </Modal>

      <AzureImportModal
        open={azureOpen}
        onClose={() => setAzureOpen(false)}
        onImport={handleImportUserStories}
      />
    </div>
  );
}
