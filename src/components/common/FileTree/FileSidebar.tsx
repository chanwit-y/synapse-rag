"use client";

import { useCallback, useRef, useState } from "react";
import { PanelLeftClose, PanelLeftOpen, PlusIcon } from "lucide-react";
import TreeView from "./TreeView";
import type { FileType, TreeNode, TreeViewGroup } from "./types";
import FileSidebarModals from "./FileSidebarModals";
import { useSnackbar } from "@/components/common/Snackbar/Snackbar";
import {
  countFiles,
  findNodeByPath,
  removeNodeByIdInPlace,
} from "./treeUtils";

const SIDEBAR_MIN_WIDTH = 200;
const SIDEBAR_MAX_WIDTH = 600;
const SIDEBAR_COLLAPSED_WIDTH = 48;

const generateId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export interface FileSidebarProps {
  /** Externally-managed collections data. */
  collections: TreeViewGroup[];
  /** Called whenever the tree changes so the parent can persist. */
  onCollectionsChange: (collections: TreeViewGroup[]) => void;
  /** Called when creating a new collection. Return the created collection. */
  onCreateCollection?: (name: string) => Promise<TreeViewGroup>;
  /** Called after directories change within a group. */
  onUpdateDirectories?: (groupId: string, directories: TreeNode[]) => Promise<void>;
  /** Called to delete a file node from the backend. */
  onDeleteFile?: (fileId: string) => Promise<void>;
  /** Called to delete an entire collection from the backend. */
  onDeleteCollection?: (collectionId: string) => Promise<void>;
  /** Called when the user clicks "Import from Azure DevOps" for a collection. */
  onImportFromAzure?: (collectionId: string, folderId: string | null) => void;

  collapsed?: boolean;
  onToggleCollapsed: () => void;
  width?: number;
  onWidthChange?: (width: number) => void;
  onSelectFile?: (file: TreeNode, nodePath: string) => void;
  onClearSelection?: () => void;
  selectedNodePath?: string | null;
  selectedNodeId?: string | null;
  isLoading?: boolean;
  readOnlyTree?: boolean;
  title?: string;
  className?: string;
}

export default function FileSidebar({
  collections,
  onCollectionsChange,
  onCreateCollection,
  onUpdateDirectories,
  onDeleteFile,
  onDeleteCollection,
  onImportFromAzure,
  collapsed = false,
  onToggleCollapsed,
  width = 256,
  onWidthChange,
  onSelectFile,
  onClearSelection,
  selectedNodePath,
  selectedNodeId,
  isLoading = false,
  readOnlyTree,
  title = "Collection",
  className,
}: FileSidebarProps) {
  const { showSnackbar } = useSnackbar();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [collectionName, setCollectionName] = useState("");
  const [isSavingCollection, setIsSavingCollection] = useState(false);

  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [itemName, setItemName] = useState("");
  const [itemType, setItemType] = useState<"file" | "folder">("file");
  const [isSavingItem, setIsSavingItem] = useState(false);
  const [selectedNodeForAdd, setSelectedNodeForAdd] = useState<{
    node: TreeNode | null;
    path: string | null;
    groupIndex: number;
  } | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingItem, setIsDeletingItem] = useState(false);
  const [selectedNodeForDelete, setSelectedNodeForDelete] = useState<{
    node: TreeNode;
    path: string;
    groupIndex: number;
  } | null>(null);

  const [isCollectionDeleteModalOpen, setIsCollectionDeleteModalOpen] =
    useState(false);
  const [isDeletingCollection, setIsDeletingCollection] = useState(false);
  const [selectedGroupForDelete, setSelectedGroupForDelete] = useState<{
    group: TreeViewGroup;
    groupIndex: number;
  } | null>(null);

  const isResizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(width);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      if (collapsed) return;
      e.preventDefault();
      isResizingRef.current = true;
      startXRef.current = e.clientX;
      startWidthRef.current = width;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!isResizingRef.current) return;
        const delta = moveEvent.clientX - startXRef.current;
        const newWidth = Math.max(
          SIDEBAR_MIN_WIDTH,
          Math.min(SIDEBAR_MAX_WIDTH, startWidthRef.current + delta),
        );
        onWidthChange?.(newWidth);
      };

      const handleMouseUp = () => {
        isResizingRef.current = false;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [collapsed, width, onWidthChange],
  );

  const handleNodeClick = (node: TreeNode, nodePath: string) => {
    if (node.type === "file") {
      onSelectFile?.(node, nodePath);
    }
  };

  const handleAddCollection = async () => {
    const name = collectionName.trim();
    if (!name || isSavingCollection) return;

    setIsSavingCollection(true);
    try {
      if (onCreateCollection) {
        const created = await onCreateCollection(name);
        onCollectionsChange([...collections, created]);
      } else {
        const newCollection: TreeViewGroup = {
          id: generateId(),
          name,
          directories: [],
        };
        onCollectionsChange([...collections, newCollection]);
      }
      setCollectionName("");
      setIsModalOpen(false);
      showSnackbar({
        variant: "success",
        message: `Collection "${name}" added.`,
      });
    } catch (error) {
      console.error("Failed to create collection:", error);
      showSnackbar({
        variant: "error",
        message: "Failed to add collection. Please try again.",
      });
    } finally {
      setIsSavingCollection(false);
    }
  };

  const handleAddFile = (
    selectedNode: TreeNode | null,
    selectedNodePath: string | null,
    groupIndex: number,
    _fileType: FileType,
  ) => {
    setSelectedNodeForAdd({
      node: selectedNode,
      path: selectedNodePath,
      groupIndex,
    });
    setItemType("file");
    setItemName("");
    setIsAddItemModalOpen(true);
  };

  const handleAddFolder = (
    selectedNode: TreeNode | null,
    selectedNodePath: string | null,
    groupIndex: number,
  ) => {
    setSelectedNodeForAdd({
      node: selectedNode,
      path: selectedNodePath,
      groupIndex,
    });
    setItemType("folder");
    setItemName("");
    setIsAddItemModalOpen(true);
  };

  // Resolve which folder an Azure import should land in, from the current tree
  // selection (mirrors handleAddItem): a selected folder is the target, a
  // selected file targets its parent folder, and a selection outside this
  // collection (or none) falls back to the collection root (null).
  const handleImportFromAzure = (
    collectionId: string,
    selectedNode: TreeNode | null,
    selectedNodePath: string | null,
  ) => {
    let folderId: string | null = null;

    const group = collections.find((g) => g.id === collectionId);
    if (group && selectedNode && selectedNodePath) {
      const segments = selectedNodePath.split("/");
      const node = findNodeByPath(group.directories, segments);
      // Only honour the selection if it actually belongs to this collection.
      if (node && node.id === selectedNode.id) {
        if (node.type === "folder") {
          folderId = node.id;
        } else if (segments.length > 1) {
          const parent = findNodeByPath(group.directories, segments.slice(0, -1));
          if (parent && parent.type === "folder") folderId = parent.id;
        }
      }
    }

    onImportFromAzure?.(collectionId, folderId);
  };

  const handleCloseAddItemModal = () => {
    setIsAddItemModalOpen(false);
    setItemName("");
    setSelectedNodeForAdd(null);
  };

  const handleAddItem = async () => {
    const name = itemName.trim();
    if (!name || isSavingItem || !selectedNodeForAdd) return;

    const resolvedName =
      itemType === "file" && !name.includes(".") ? `${name}.md` : name;

    const newItem: TreeNode = {
      id: generateId(),
      name: resolvedName,
      type: itemType,
      collectionId: "",
      ...(itemType === "folder" ? { children: [] } : {}),
    };

    const targetGroupIndex = selectedNodeForAdd.groupIndex ?? 0;
    const existingGroup = collections[targetGroupIndex];
    if (!existingGroup) return;

    const updatedCollections: TreeViewGroup[] = JSON.parse(
      JSON.stringify(collections),
    );
    const group = updatedCollections[targetGroupIndex];
    newItem.collectionId = group.id;

    if (!selectedNodeForAdd.node || !selectedNodeForAdd.path) {
      group.directories.push(newItem);
    } else {
      const sel = selectedNodeForAdd.node;
      const pathSegments = selectedNodeForAdd.path.split("/");

      if (sel.type === "folder") {
        const folder = findNodeByPath(group.directories, pathSegments);
        if (folder && folder.type === "folder") {
          folder.children = folder.children ?? [];
          folder.children.push(newItem);
        } else {
          group.directories.push(newItem);
        }
      } else {
        if (pathSegments.length > 1) {
          const parentPath = pathSegments.slice(0, -1);
          const parent = findNodeByPath(group.directories, parentPath);
          if (parent && parent.type === "folder") {
            parent.children = parent.children ?? [];
            parent.children.push(newItem);
          } else {
            group.directories.push(newItem);
          }
        } else {
          group.directories.push(newItem);
        }
      }
    }

    onCollectionsChange(updatedCollections);
    handleCloseAddItemModal();

    setIsSavingItem(true);
    try {
      await onUpdateDirectories?.(group.id, group.directories);
      showSnackbar({
        variant: "success",
        message: `${itemType === "file" ? "File" : "Folder"} "${name}" added.`,
      });
    } catch (err) {
      console.error("Failed to update collection directories:", err);
      onCollectionsChange(collections);
      showSnackbar({
        variant: "error",
        message: `Failed to add ${itemType}. Please try again.`,
      });
    } finally {
      setIsSavingItem(false);
    }
  };

  const handleRequestDeleteNode = (
    node: TreeNode,
    nodePath: string,
    groupIndex: number,
  ) => {
    setSelectedNodeForDelete({ node, path: nodePath, groupIndex });
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    if (isDeletingItem) return;
    setIsDeleteModalOpen(false);
    setSelectedNodeForDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!selectedNodeForDelete || isDeletingItem) return;

    const target = selectedNodeForDelete;
    if (
      target.node.type === "folder" &&
      (target.node.children?.length ?? 0) > 0
    ) {
      showSnackbar({
        variant: "error",
        message: "Folder is not empty. Remove items before deleting.",
      });
      return;
    }

    const targetGroupIndex = selectedNodeForDelete.groupIndex ?? 0;
    const existingGroup = collections[targetGroupIndex];
    if (!existingGroup) return;

    const previousCollections = collections;
    const updatedCollections: TreeViewGroup[] = JSON.parse(
      JSON.stringify(collections),
    );
    const group = updatedCollections[targetGroupIndex];
    const removed = removeNodeByIdInPlace(
      group.directories,
      selectedNodeForDelete.node.id,
    );

    if (!removed) {
      handleCloseDeleteModal();
      return;
    }

    onCollectionsChange(updatedCollections);
    setIsDeleteModalOpen(false);
    setSelectedNodeForDelete(null);

    setIsDeletingItem(true);
    try {
      if (target.node.type === "file") {
        await onDeleteFile?.(target.node.id);
      }
      await onUpdateDirectories?.(group.id, group.directories);

      const deletedPath = target.path;
      if (
        selectedNodePath &&
        (selectedNodePath === deletedPath ||
          selectedNodePath.startsWith(`${deletedPath}/`))
      ) {
        onClearSelection?.();
      }

      showSnackbar({
        variant: "success",
        message: `${target.node.type === "file" ? "File" : "Folder"} "${target.node.name}" deleted.`,
      });
    } catch (err) {
      console.error("Failed to delete item:", err);
      onCollectionsChange(previousCollections);
      showSnackbar({
        variant: "error",
        message: `Failed to delete ${target.node.type}. Please try again.`,
      });
    } finally {
      setIsDeletingItem(false);
    }
  };

  const handleRequestDeleteGroup = (
    group: TreeViewGroup,
    groupIndex: number,
  ) => {
    setSelectedGroupForDelete({ group, groupIndex });
    setIsCollectionDeleteModalOpen(true);
  };

  const handleCloseCollectionDeleteModal = () => {
    if (isDeletingCollection) return;
    setIsCollectionDeleteModalOpen(false);
    setSelectedGroupForDelete(null);
  };

  const handleConfirmDeleteCollection = async () => {
    if (!selectedGroupForDelete || isDeletingCollection) return;

    const target = selectedGroupForDelete;
    const previousCollections = collections;
    const updatedCollections = collections.filter(
      (group) => group.id !== target.group.id,
    );

    onCollectionsChange(updatedCollections);
    setIsCollectionDeleteModalOpen(false);
    setSelectedGroupForDelete(null);

    setIsDeletingCollection(true);
    try {
      await onDeleteCollection?.(target.group.id);

      // If the open document lives in this collection, clear the editor.
      if (selectedNodeId) {
        const containsOpenFile = (nodes: TreeNode[]): boolean =>
          nodes.some(
            (node) =>
              node.id === selectedNodeId ||
              (node.type === "folder" &&
                !!node.children?.length &&
                containsOpenFile(node.children)),
          );
        if (containsOpenFile(target.group.directories)) {
          onClearSelection?.();
        }
      }

      showSnackbar({
        variant: "success",
        message: `Collection "${target.group.name}" deleted.`,
      });
    } catch (err) {
      console.error("Failed to delete collection:", err);
      onCollectionsChange(previousCollections);
      showSnackbar({
        variant: "error",
        message: "Failed to delete collection. Please try again.",
      });
    } finally {
      setIsDeletingCollection(false);
    }
  };

  const footerButtonLabel = collapsed ? "Show sidebar" : "Hide sidebar";

  return (
    <>
      <aside
        className={`relative flex flex-col h-[calc(100vh-4rem)] overflow-hidden
          border-r border-border bg-background ${className ?? ""}`}
        style={{
          width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : width,
          transition: isResizingRef.current ? "none" : "width 200ms",
        }}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between border-b border-border bg-surface/50 ${
            collapsed ? "px-2 py-3" : "px-4 py-3"
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={onToggleCollapsed}
              aria-label={footerButtonLabel}
              className="flex h-8 w-8 items-center justify-center rounded-md transition-colors
                text-foreground hover:bg-surface-strong"
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>

            <h2
              className={`text-sm font-semibold uppercase tracking-wide truncate text-foreground ${
                collapsed ? "sr-only" : ""
              }`}
            >
              {title}
            </h2>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className={`p-1.5 rounded-md transition-colors text-muted-foreground hover:bg-surface-strong hover:text-foreground ${
              collapsed ? "sr-only" : ""
            }`}
          >
            <PlusIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Tree */}
        <div
          className={`flex flex-col flex-1 min-h-0 ${
            collapsed ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          <div className="flex-1 overflow-hidden">
            {isLoading ? (
              <SkeletonTree />
            ) : (
              <TreeView
                data={collections}
                onNodeClick={handleNodeClick}
                onAddFile={handleAddFile}
                onAddFolder={handleAddFolder}
                onRequestDeleteNode={handleRequestDeleteNode}
                onImportFromAzure={onImportFromAzure ? handleImportFromAzure : undefined}
                onRequestDeleteGroup={
                  onDeleteCollection ? handleRequestDeleteGroup : undefined
                }
                selectedNodePath={selectedNodePath}
                selectedNodeId={selectedNodeId}
                readOnlyTree={readOnlyTree}
              />
            )}
          </div>
        </div>

        {/* Resize handle */}
        {!collapsed && (
          <div
            onMouseDown={handleResizeStart}
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize z-10 transition-colors
              hover:bg-brand-500/40 active:bg-brand-500/60"
          />
        )}
      </aside>

      <FileSidebarModals
        isCollectionModalOpen={isModalOpen}
        onCloseCollectionModal={() => {
          setIsModalOpen(false);
          setCollectionName("");
        }}
        collectionName={collectionName}
        onChangeCollectionName={setCollectionName}
        onSubmitCollection={handleAddCollection}
        isSavingCollection={isSavingCollection}
        isAddItemModalOpen={isAddItemModalOpen}
        onCloseAddItemModal={handleCloseAddItemModal}
        itemType={itemType}
        itemName={itemName}
        onChangeItemName={setItemName}
        onSubmitItem={handleAddItem}
        isSavingItem={isSavingItem}
        selectedNodeForAdd={selectedNodeForAdd}
        isDeleteModalOpen={isDeleteModalOpen}
        onCloseDeleteModal={handleCloseDeleteModal}
        onConfirmDelete={handleConfirmDelete}
        isDeletingItem={isDeletingItem}
        selectedNodeForDelete={selectedNodeForDelete}
        isCollectionDeleteModalOpen={isCollectionDeleteModalOpen}
        onCloseCollectionDeleteModal={handleCloseCollectionDeleteModal}
        onConfirmDeleteCollection={handleConfirmDeleteCollection}
        isDeletingCollection={isDeletingCollection}
        collectionForDelete={
          selectedGroupForDelete
            ? {
                name: selectedGroupForDelete.group.name,
                fileCount: countFiles(selectedGroupForDelete.group.directories),
              }
            : null
        }
      />
    </>
  );
}

function SkeletonTree({ rows = 10 }: { rows?: number }) {
  return (
    <div className="px-3 py-3 space-y-3">
      <div className="space-y-2">
        <div className="h-4 w-32 rounded animate-pulse bg-surface-strong" />
        <div className="h-3 w-24 rounded animate-pulse bg-surface-strong" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm animate-pulse bg-surface-strong" />
            <div
              className="h-3 rounded animate-pulse bg-surface-strong"
              style={{ width: `${Math.max(90, 160 - idx * 6)}px` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
