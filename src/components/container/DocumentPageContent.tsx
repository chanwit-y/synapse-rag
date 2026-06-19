"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { FileSidebar, findNodeById, findNodeByPath, flattenFileNodes } from "@/components/common/FileTree";
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
// The Sigma graph pulls in sigma + graphology (WebGL); keep it out of the
// route's initial JS and off the server (no DOM/WebGL during SSR).
const DocumentGraphView = dynamic(
  () => import("@/components/container/document/DocumentGraphView"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full flex-1 items-center justify-center text-sm text-muted-foreground">
        Loading graph…
      </div>
    ),
  },
);
// The canvas pulls in @xyflow/react (a large bundle) and renders to the DOM
// only, so keep it out of the route's initial JS and off the server.
const CanvasDocumentView = dynamic(
  () => import("@/components/container/canvas").then((m) => m.CanvasDocumentView),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full flex-1 items-center justify-center text-sm text-muted-foreground">
        Loading canvas…
      </div>
    ),
  },
);
import { useLayoutStore } from "@/store/layout-store";
import { ArrowLeft, ChevronRight, Clock, FileText, Network } from "lucide-react";
import ApiLoadingBackdrop from "@/components/common/ApiLoadingBackdrop/ApiLoadingBackdrop";
import SelectField from "@/components/common/SelectField/SelectField";
import { useApiLoading } from "@/hooks/useApiLoading";
import {
  createCanvasAction,
  createCollectionAction,
  deleteCollectionAction,
  deleteDocumentItemAction,
  duplicateDocumentItemAction,
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
  // Docs you can step back to — only links push here; sidebar selection clears it.
  const [backStack, setBackStack] = useState<{ id: string; name: string }[]>([]);
  // Drives a breadcrumb-triggered reveal in the sidebar; tick re-fires repeats.
  const [reveal, setReveal] = useState<{ id: string; collectionId: string; tick: number } | null>(null);
  const revealTickRef = useRef(0);
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
  const documentViewMode = useLayoutStore((s) => s.documentViewMode);
  const setDocumentViewMode = useLayoutStore((s) => s.setDocumentViewMode);
  const toggleDocumentViewMode = useLayoutStore((s) => s.toggleDocumentViewMode);
  // The persisted view mode isn't known during SSR. Render the editor on the
  // first client paint (matching the server) and only honor the persisted graph
  // mode after mount — this both avoids a hydration mismatch and forces the
  // re-render that reads the rehydrated store value.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const isGraphMode = mounted && documentViewMode === "graph";
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
        // Canvas content is a JSON graph; never substitute the markdown default.
        const fallback = file.type === "canvas" ? "" : getDefaultContent(file.name);
        const content = result.success
          ? result.data.content || fallback
          : fallback;
        setFileContents((prev) => ({ ...prev, [file.id]: content }));
        setEditorContent(content);
      });
    },
    [fileContents, withLoading],
  );

  // Flat list of every file across all collections — the candidate set for
  // `[[` cross-document links in the editor.
  const documents = useMemo(
    () => collections.flatMap((group) => flattenFileNodes(group.directories)),
    [collections],
  );

  // Open a document by its item id (from a clicked `?item=` link or a direct
  // URL). Resolves the node + path across all collections, selects it, and
  // syncs the URL so the link is shareable. Missing targets surface a notice.
  // Following a link pushes the current doc onto the back stack; navigating
  // "back" passes `push: false` so it doesn't grow the stack again.
  const openItemById = useCallback(
    (id: string, options?: { push?: boolean }) => {
      for (const group of collections) {
        const found = findNodeById(group.directories, id);
        if (found && (found.node.type === "file" || found.node.type === "canvas")) {
          if ((options?.push ?? true) && selectedFile && selectedFile.id !== id) {
            setBackStack((stack) => [...stack, { id: selectedFile.id, name: selectedFile.name }]);
          }
          handleSelectFile(found.node, found.path);
          window.history.replaceState(null, "", `?item=${id}`);
          return;
        }
      }
      showSnackbar({
        variant: "error",
        message: "Document not found — it may have been deleted.",
      });
    },
    [collections, handleSelectFile, selectedFile, showSnackbar],
  );

  // Step back to the previous document in the link trail (multi-hop).
  const goBack = useCallback(() => {
    if (backStack.length === 0) return;
    const prev = backStack[backStack.length - 1];
    setBackStack((stack) => stack.slice(0, -1));
    openItemById(prev.id, { push: false });
  }, [backStack, openItemById]);

  // Clicking a file node in the graph opens it in the editor and flips the
  // main pane back to editor mode. (Folder/collection nodes toggle in-graph.)
  const handleOpenFromGraph = useCallback(
    (fileId: string) => {
      setDocumentViewMode("editor");
      openItemById(fileId);
    },
    [openItemById, setDocumentViewMode],
  );

  // Sidebar selection is a fresh navigation context, so it clears the trail.
  const handleSidebarSelect = useCallback(
    (file: TreeNode, path: string) => {
      setBackStack([]);
      handleSelectFile(file, path);
    },
    [handleSelectFile],
  );

  // Reveal a breadcrumb segment in the sidebar (expand + scroll + highlight),
  // opening the sidebar first if it's collapsed.
  const revealInSidebar = useCallback((id: string, collectionId: string) => {
    setCollapsed(false);
    revealTickRef.current += 1;
    setReveal({ id, collectionId, tick: revealTickRef.current });
  }, []);

  // Clickable trail for the open doc: Collection › Folder › … › File.md.
  const breadcrumb = useMemo(() => {
    if (!selectedFile || !selectedPath) return [];
    const group = collections.find((g) => g.id === selectedFile.collectionId);
    const parts = selectedPath.split("/").filter(Boolean);
    const crumbs: { id: string; label: string }[] = [];
    if (group) crumbs.push({ id: group.id, label: group.name });
    const acc: string[] = [];
    for (const part of parts) {
      acc.push(part);
      const node = group ? findNodeByPath(group.directories, [...acc]) : null;
      crumbs.push({ id: node?.id ?? `${selectedFile.collectionId}:${acc.join("/")}`, label: part });
    }
    return crumbs;
  }, [collections, selectedFile, selectedPath]);

  // On first load, honor a `?item=<id>` deep link by opening that document.
  // Wait until the document set is actually populated so we don't give up
  // before the tree has hydrated.
  const deepLinkHandled = useRef(false);
  useEffect(() => {
    if (deepLinkHandled.current) return;
    const id = new URLSearchParams(window.location.search).get("item");
    if (!id) {
      deepLinkHandled.current = true;
      return;
    }
    if (documents.length === 0) return;
    deepLinkHandled.current = true;
    openItemById(id);
  }, [documents, openItemById]);

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

  const handleDuplicateFile = useCallback(
    async (fileId: string): Promise<TreeNode> =>
      withLoading(async () =>
        unwrapAction(await duplicateDocumentItemAction(fileId)),
      ),
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

  // Create a persisted canvas document, refresh the tree, and open it in the
  // main pane so the user can start editing immediately. We open from the
  // freshly fetched tree (not openItemById, which closes over stale collections).
  const handleCreateCanvas = useCallback(
    async (params: {
      collectionId: string;
      folderId: string | null;
      name: string;
    }) =>
      withLoading(async () => {
        const created = unwrapAction(await createCanvasAction(params));
        const listResult = await listCollectionsAction();
        if (listResult.success) {
          setCollections(listResult.data);
          for (const group of listResult.data) {
            const found = findNodeById(group.directories, created.id);
            if (found) {
              setBackStack([]);
              handleSelectFile(found.node, found.path);
              window.history.replaceState(null, "", `?item=${created.id}`);
              break;
            }
          }
        }
        return created;
      }),
    [handleSelectFile, withLoading],
  );

  // Persist a canvas's serialized graph (reuses the document save path, which
  // also snapshots history).
  const handleSaveCanvas = useCallback(
    async (content: string) => {
      if (!selectedFile) return;
      await withLoading(async () => {
        unwrapAction(
          await saveDocumentContentAction({
            id: selectedFile.id,
            name: selectedFile.name,
            content,
            collectionId: selectedFile.collectionId,
          }),
        );
        setFileContents((prev) => ({ ...prev, [selectedFile.id]: content }));
        showSnackbar({ variant: "success", message: "Canvas saved." });
      });
    },
    [selectedFile, showSnackbar, withLoading],
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
          onDuplicateFile={handleDuplicateFile}
          onDeleteCollection={handleDeleteCollection}
          onRenameItem={handleRenameItem}
          onRenameCollection={handleRenameCollection}
          onRenamedSelection={handleRenamedSelection}
          onImportFromAzure={handleOpenAzureImport}
          onCreateCanvas={handleCreateCanvas}
          onToggleCollapsed={() => setCollapsed((c) => !c)}
          width={width}
          onWidthChange={setWidth}
          onSelectFile={handleSidebarSelect}
          onClearSelection={() => {
            setSelectedFile(null);
            setSelectedPath(null);
            setEditorContent("");
            setViewLang("en");
            setThSeed("");
            setBackStack([]);
          }}
          selectedNodePath={selectedPath}
          selectedNodeId={selectedFile?.id ?? null}
          revealTarget={reveal}
          title="Documents"
          className="h-full! shrink-0"
          collapsed={collapsed}
          headerAction={
            <button
              type="button"
              onClick={toggleDocumentViewMode}
              aria-label={isGraphMode ? "Show document editor" : "Show document graph"}
              aria-pressed={isGraphMode}
              title={isGraphMode ? "Document view" : "Graph view"}
              className={`p-1.5 rounded-md transition-colors ${
                isGraphMode
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-surface-strong hover:text-foreground"
              }`}
            >
              {isGraphMode ? <FileText className="h-4 w-4" /> : <Network className="h-4 w-4" />}
            </button>
          }
        />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
          {isGraphMode ? (
            <DocumentGraphView
              collections={collections}
              theme={resolvedTheme}
              onOpenFile={handleOpenFromGraph}
            />
          ) : selectedFile && selectedPath ? (
            <>
              <div className="shrink-0 border-b border-border px-6 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    {backStack.length > 0 ? (
                      <button
                        type="button"
                        onClick={goBack}
                        className="mt-0.5 inline-flex shrink-0 items-center justify-center rounded-md border border-border bg-surface p-2 text-foreground hover:bg-surface/70"
                        aria-label="Back"
                        title={`Back to ${backStack[backStack.length - 1].name}`}
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                    ) : null}
                    <div className="min-w-0">
                      <h1 className="truncate text-lg font-semibold text-foreground">
                        {selectedFile.name}
                      </h1>
                      <nav
                        aria-label="Document path"
                        className="mt-0.5 flex items-center overflow-x-auto font-mono text-xs text-muted-foreground"
                      >
                        {breadcrumb.map((crumb, i) => (
                          <span key={crumb.id} className="flex shrink-0 items-center">
                            {i > 0 ? (
                              <ChevronRight className="mx-0.5 h-3 w-3 shrink-0 opacity-50" />
                            ) : null}
                            <button
                              type="button"
                              onClick={() => revealInSidebar(crumb.id, selectedFile.collectionId)}
                              className="max-w-[14rem] truncate rounded px-1 py-0.5 transition-colors hover:bg-surface-strong hover:text-foreground"
                              title={`Reveal "${crumb.label}" in the sidebar`}
                            >
                              {crumb.label}
                            </button>
                          </span>
                        ))}
                      </nav>
                    </div>
                  </div>
                  {selectedFile.type !== "canvas" ? (
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
                  ) : null}
                </div>
              </div>
              {selectedFile.type === "canvas" ? (
                // Mount only once the saved graph is loaded so the store hydrates
                // from real content (the view seeds the store on mount).
                fileContents[selectedFile.id] !== undefined ? (
                  <CanvasDocumentView
                    key={selectedFile.id}
                    itemId={selectedFile.id}
                    content={fileContents[selectedFile.id]}
                    onSave={handleSaveCanvas}
                  />
                ) : (
                  <div className="flex h-full flex-1 items-center justify-center text-sm text-muted-foreground">
                    Loading canvas…
                  </div>
                )
              ) : (
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
                  documents={documents}
                  onOpenItem={openItemById}
                />
              </div>
              )}
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
