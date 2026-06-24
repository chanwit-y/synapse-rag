"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { File as FileIcon, Folder as FolderIcon } from "lucide-react";
import { PanelLeftClose, PanelLeftOpen, PlusIcon } from "lucide-react";
import TreeView from "./TreeView";
import type { FileType, TreeNode, TreeViewGroup } from "./types";
import { fileTypeExtension, isRichTextFileName } from "./types";
import FileSidebarModals from "./FileSidebarModals";
import MoveItemModal from "./MoveItemModal";
import { useSnackbar } from "@/components/common/Snackbar/Snackbar";
import {
  countFiles,
  findNodeById,
  findNodeByPath,
  insertNodeAfterId,
  moveNodeInTree,
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
  /**
   * Duplicate a file/canvas node on the backend, resolving to the created
   * item's tree node so the sidebar can place it next to the original.
   */
  onDuplicateFile?: (fileId: string) => Promise<TreeNode>;
  /**
   * Move a file/canvas/folder into another collection (and optionally a folder
   * within it). `destFolderId` null = the destination collection's root. The
   * caller refetches the tree and re-syncs the open editor. When omitted, the
   * Move action is hidden.
   */
  onMoveItem?: (
    itemId: string,
    destCollectionId: string,
    destFolderId: string | null,
  ) => Promise<void>;
  /** Called to delete an entire collection from the backend. */
  onDeleteCollection?: (collectionId: string) => Promise<void>;
  /** Called when the user clicks "Import from Azure DevOps" for a collection. */
  onImportFromAzure?: (collectionId: string, folderId: string | null) => void;
  /**
   * Create a new canvas document. Resolves to the created item's id so the
   * caller can open it. `folderId` is the target folder (null = collection root).
   */
  onCreateCanvas?: (params: {
    collectionId: string;
    folderId: string | null;
    name: string;
  }) => Promise<{ id: string }>;
  /** Convert a markdown/rich-text file into a new canvas in the same folder. */
  onConvertToCanvas?: (node: TreeNode, parentFolderId: string | null) => void;
  /** Persist a renamed file/folder. Throws on failure (caller reverts). */
  onRenameItem?: (
    itemId: string,
    newName: string,
    collectionId: string,
  ) => Promise<void>;
  /** Persist a renamed collection. Throws on failure (caller reverts). */
  onRenameCollection?: (collectionId: string, newName: string) => Promise<void>;
  /**
   * Sync the open editor after a rename that moved the currently-selected file —
   * either it was the renamed file or one of its ancestor folders was renamed.
   */
  onRenamedSelection?: (updatedFile: TreeNode, newNodePath: string) => void;

  collapsed?: boolean;
  onToggleCollapsed: () => void;
  width?: number;
  onWidthChange?: (width: number) => void;
  onSelectFile?: (file: TreeNode, nodePath: string) => void;
  onClearSelection?: () => void;
  selectedNodePath?: string | null;
  selectedNodeId?: string | null;
  /**
   * Reveal a node/collection in the tree (e.g. from a breadcrumb click):
   * expands its collection, scrolls it into view and briefly highlights it.
   * `id` is a node id or a collection id; `tick` re-triggers a repeat reveal.
   */
  revealTarget?: { id: string; collectionId: string; tick: number } | null;
  isLoading?: boolean;
  readOnlyTree?: boolean;
  title?: string;
  className?: string;
  /**
   * Optional control rendered in the header, just before the add-collection (+)
   * button (e.g. a view-mode toggle). Hidden when the sidebar is collapsed, like
   * the + button. Only the Document page supplies this; other usages are unaffected.
   */
  headerAction?: React.ReactNode;
  /**
   * Star/unstar a node. When provided, every tree node shows a star toggle and
   * (with {@link favoritesGroup}) a pinned Favorites group renders on top.
   */
  onToggleFavorite?: (node: TreeNode) => void;
  /**
   * A read-only "Favorites" group pinned above the collections, built by the
   * caller from the starred nodes across all collections. Omitted/empty → no
   * Favorites section is shown.
   */
  favoritesGroup?: TreeViewGroup | null;
}

export default function FileSidebar({
  collections,
  onCollectionsChange,
  onCreateCollection,
  onUpdateDirectories,
  onDeleteFile,
  onDuplicateFile,
  onMoveItem,
  onDeleteCollection,
  onImportFromAzure,
  onCreateCanvas,
  onConvertToCanvas,
  onRenameItem,
  onRenameCollection,
  onRenamedSelection,
  collapsed = false,
  onToggleCollapsed,
  width = 256,
  onWidthChange,
  onSelectFile,
  onClearSelection,
  selectedNodePath,
  selectedNodeId,
  revealTarget,
  isLoading = false,
  readOnlyTree,
  title = "Collection",
  className,
  headerAction,
  onToggleFavorite,
  favoritesGroup,
}: FileSidebarProps) {
  const { showSnackbar } = useSnackbar();

  const asideRef = useRef<HTMLElement | null>(null);
  // Force a collection open / highlight a row while a breadcrumb reveal is active.
  const [forceExpandGroupId, setForceExpandGroupId] = useState<string | null>(null);
  const [highlightNodeId, setHighlightNodeId] = useState<string | null>(null);

  useEffect(() => {
    if (!revealTarget) return;
    setForceExpandGroupId(revealTarget.collectionId);
    setHighlightNodeId(revealTarget.id);
    // Expansion may animate, so scroll on the next frame once the row exists.
    const raf = requestAnimationFrame(() => {
      const root = asideRef.current;
      if (!root) return;
      const sel = `[data-node-id="${CSS.escape(revealTarget.id)}"]`;
      const groupSel = `[data-group-id="${CSS.escape(revealTarget.id)}"]`;
      const el = root.querySelector(sel) ?? root.querySelector(groupSel);
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
    const clear = setTimeout(() => setHighlightNodeId(null), 1500);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(clear);
    };
  }, [revealTarget]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [collectionName, setCollectionName] = useState("");
  const [isSavingCollection, setIsSavingCollection] = useState(false);

  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [itemName, setItemName] = useState("");
  const [itemType, setItemType] = useState<"file" | "folder" | "canvas">("file");
  // Editor for a new file, chosen in the create-file popover. Only meaningful
  // when itemType === "file"; selects the extension (`.md` vs `.rt`).
  const [fileEditorType, setFileEditorType] = useState<FileType>("md");
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

  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isMovingItem, setIsMovingItem] = useState(false);
  const [selectedNodeForMove, setSelectedNodeForMove] = useState<{
    node: TreeNode;
    parentFolderId: string | null;
  } | null>(null);

  const [activeDrag, setActiveDrag] = useState<{
    name: string;
    type: "folder" | "file";
  } | null>(null);

  // Inline rename: at most one node OR one collection is being edited at a time.
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(
    null,
  );

  // Require a 5px move before a drag starts so plain clicks still select/open.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as
      | { name?: string; type?: "folder" | "file" }
      | undefined;
    if (data?.name && data.type) {
      setActiveDrag({ name: data.name, type: data.type });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDrag(null);
    const { active, over } = event;
    if (!over) return;

    const a = active.data.current as
      | { draggedId?: string; collectionId?: string }
      | undefined;
    const o = over.data.current as
      | { targetFolderId?: string | null; collectionId?: string }
      | undefined;
    if (!a?.draggedId || !a.collectionId || !o) return;

    // Moves stay within a single collection.
    if (a.collectionId !== o.collectionId) return;

    const groupIndex = collections.findIndex((g) => g.id === a.collectionId);
    if (groupIndex === -1) return;
    const group = collections[groupIndex];

    const moved = moveNodeInTree(
      group.directories,
      a.draggedId,
      o.targetFolderId ?? null,
    );
    if (!moved) return;

    const previous = collections;
    const updated = collections.map((g, i) =>
      i === groupIndex ? { ...g, directories: moved } : g,
    );
    onCollectionsChange(updated);

    try {
      await onUpdateDirectories?.(group.id, moved);
    } catch (err) {
      console.error("Failed to move item:", err);
      onCollectionsChange(previous);
      showSnackbar({
        variant: "error",
        message: "Failed to move item. Please try again.",
      });
    }
  };

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
    if (node.type === "file" || node.type === "canvas") {
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
    fileType: FileType,
  ) => {
    setSelectedNodeForAdd({
      node: selectedNode,
      path: selectedNodePath,
      groupIndex,
    });
    setItemType("file");
    setFileEditorType(fileType);
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

  const handleAddCanvas = (
    selectedNode: TreeNode | null,
    selectedNodePath: string | null,
    groupIndex: number,
  ) => {
    setSelectedNodeForAdd({
      node: selectedNode,
      path: selectedNodePath,
      groupIndex,
    });
    setItemType("canvas");
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

  // From the current tree selection, resolve which folder a new item should
  // land in: a selected folder is the target; a selected file targets its
  // parent folder; anything else falls back to the collection root (null).
  const resolveTargetFolderId = (
    group: TreeViewGroup,
    selected: { node: TreeNode | null; path: string | null },
  ): string | null => {
    if (!selected.node || !selected.path) return null;
    const segments = selected.path.split("/");
    const node = findNodeByPath(group.directories, segments);
    if (!node || node.id !== selected.node.id) return null;
    if (node.type === "folder") return node.id;
    if (segments.length > 1) {
      const parent = findNodeByPath(group.directories, segments.slice(0, -1));
      if (parent && parent.type === "folder") return parent.id;
    }
    return null;
  };

  const handleAddItem = async () => {
    const name = itemName.trim();
    if (!name || isSavingItem || !selectedNodeForAdd) return;

    // Canvas creation is persisted server-side (it owns its JSON content), so it
    // bypasses the optimistic structure sync used by files/folders. The caller
    // refreshes the tree and opens the new canvas.
    if (itemType === "canvas") {
      const group = collections[selectedNodeForAdd.groupIndex ?? 0];
      if (!group || !onCreateCanvas) return;
      const folderId = resolveTargetFolderId(group, selectedNodeForAdd);

      setIsSavingItem(true);
      try {
        await onCreateCanvas({ collectionId: group.id, folderId, name });
        handleCloseAddItemModal();
        showSnackbar({ variant: "success", message: `Canvas "${name}" added.` });
      } catch (err) {
        console.error("Failed to create canvas:", err);
        showSnackbar({
          variant: "error",
          message: "Failed to add canvas. Please try again.",
        });
      } finally {
        setIsSavingItem(false);
      }
      return;
    }

    const resolvedName =
      itemType === "file" && !name.includes(".")
        ? `${name}.${fileTypeExtension(fileEditorType)}`
        : name;

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
      if (target.node.type === "file" || target.node.type === "canvas") {
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

  // Duplicate a file/canvas: the backend clones it (content, translation,
  // history, and — for canvases — chat transcripts) and returns the new node,
  // which we drop into the tree right after the original. A backdrop covers the
  // in-flight call (parent's withLoading), so this needs no optimistic state.
  const handleDuplicateNode = async (
    node: TreeNode,
    _nodePath: string,
    groupIndex: number,
  ) => {
    if (!onDuplicateFile) return;

    try {
      const created = await onDuplicateFile(node.id);

      const updatedCollections: TreeViewGroup[] = JSON.parse(
        JSON.stringify(collections),
      );
      const group = updatedCollections[groupIndex];
      if (group) {
        if (!insertNodeAfterId(group.directories, node.id, created)) {
          group.directories.push(created);
        }
        onCollectionsChange(updatedCollections);
      }

      showSnackbar({
        variant: "success",
        message: `${node.type === "canvas" ? "Canvas" : "File"} "${created.name}" created.`,
      });
    } catch (err) {
      console.error("Failed to duplicate item:", err);
      showSnackbar({
        variant: "error",
        message: `Failed to duplicate ${node.type}. Please try again.`,
      });
    }
  };

  const handleRequestMoveNode = (
    node: TreeNode,
    parentFolderId: string | null,
  ) => {
    setSelectedNodeForMove({ node, parentFolderId });
    setIsMoveModalOpen(true);
  };

  const handleCloseMoveModal = () => {
    if (isMovingItem) return;
    setIsMoveModalOpen(false);
    setSelectedNodeForMove(null);
  };

  // Move a node to another collection/folder. The backend reassigns the item
  // (and, for a folder, its whole subtree) preserving ids; the caller then
  // refetches the tree and re-syncs the open editor. A backdrop (parent's
  // withLoading) covers the call, so no optimistic tree edit is needed here.
  const handleConfirmMove = async (
    destCollectionId: string,
    destFolderId: string | null,
  ) => {
    if (!selectedNodeForMove || !onMoveItem || isMovingItem) return;

    const { node } = selectedNodeForMove;
    setIsMovingItem(true);
    try {
      await onMoveItem(node.id, destCollectionId, destFolderId);
      setIsMoveModalOpen(false);
      setSelectedNodeForMove(null);
      showSnackbar({
        variant: "success",
        message: `${node.type === "folder" ? "Folder" : node.type === "canvas" ? "Canvas" : "File"} "${node.name}" moved.`,
      });
    } catch (err) {
      console.error("Failed to move item:", err);
      showSnackbar({
        variant: "error",
        message: `Failed to move ${node.type}. Please try again.`,
      });
    } finally {
      setIsMovingItem(false);
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

  const handleStartRenameNode = (nodeId: string) => {
    setEditingCollectionId(null);
    setEditingNodeId(nodeId);
  };

  const handleStartRenameGroup = (collectionId: string) => {
    setEditingNodeId(null);
    setEditingCollectionId(collectionId);
  };

  const handleCancelRename = () => {
    setEditingNodeId(null);
    setEditingCollectionId(null);
  };

  const handleSubmitRenameNode = async (
    node: TreeNode,
    nodePath: string,
    groupIndex: number,
    value: string,
  ) => {
    setEditingNodeId(null);

    const group = collections[groupIndex];
    if (!group) return;

    const trimmed = value.trim();
    if (!trimmed) return; // empty → treat as cancel

    // Mirror the add flow: extensionless files get a suffix preserving their
    // editor (`.rt` for rich-text, else `.md`) and canvases a `.canvas` suffix.
    const renameExt =
      node.type === "canvas"
        ? "canvas"
        : isRichTextFileName(node.name)
          ? "rt"
          : "md";
    const normalized =
      !trimmed.includes(".") && (node.type === "file" || node.type === "canvas")
        ? `${trimmed}.${renameExt}`
        : trimmed;

    if (normalized === node.name) return; // unchanged → silent no-op

    // Block a collision with a sibling (case-insensitive, excluding self).
    const segments = nodePath.split("/");
    const parentSegments = segments.slice(0, -1);
    const siblings =
      parentSegments.length === 0
        ? group.directories
        : (findNodeByPath(group.directories, parentSegments)?.children ?? []);
    const clash = siblings.some(
      (sibling) =>
        sibling.id !== node.id &&
        sibling.name.toLowerCase() === normalized.toLowerCase(),
    );
    if (clash) {
      showSnackbar({
        variant: "error",
        message: `A ${node.type} named "${normalized}" already exists here.`,
      });
      return;
    }

    const previous = collections;
    const updated: TreeViewGroup[] = JSON.parse(JSON.stringify(collections));
    const target = findNodeById(updated[groupIndex].directories, node.id);
    if (!target) return;
    target.node.name = normalized;
    onCollectionsChange(updated);

    try {
      await onRenameItem?.(node.id, normalized, group.id);

      // Keep the open editor in sync when the rename moved the selected file —
      // either it was renamed directly or one of its ancestor folders was.
      if (selectedNodeId) {
        const match = findNodeById(
          updated[groupIndex].directories,
          selectedNodeId,
        );
        if (
          match &&
          (selectedNodeId === node.id || match.path !== selectedNodePath)
        ) {
          onRenamedSelection?.(match.node, match.path);
        }
      }

      showSnackbar({ variant: "success", message: `Renamed to "${normalized}".` });
    } catch (err) {
      console.error("Failed to rename item:", err);
      onCollectionsChange(previous);
      showSnackbar({
        variant: "error",
        message: `Failed to rename ${node.type}. Please try again.`,
      });
    }
  };

  const handleSubmitRenameGroup = async (
    group: TreeViewGroup,
    groupIndex: number,
    value: string,
  ) => {
    setEditingCollectionId(null);

    const trimmed = value.trim();
    // Duplicate collection names are allowed; only block empty / unchanged.
    if (!trimmed || trimmed === group.name) return;

    const previous = collections;
    const updated = collections.map((g, i) =>
      i === groupIndex ? { ...g, name: trimmed } : g,
    );
    onCollectionsChange(updated);

    try {
      await onRenameCollection?.(group.id, trimmed);
      showSnackbar({
        variant: "success",
        message: `Collection renamed to "${trimmed}".`,
      });
    } catch (err) {
      console.error("Failed to rename collection:", err);
      onCollectionsChange(previous);
      showSnackbar({
        variant: "error",
        message: "Failed to rename collection. Please try again.",
      });
    }
  };

  const footerButtonLabel = collapsed ? "Show sidebar" : "Hide sidebar";

  return (
    <>
      <aside
        ref={asideRef}
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

          <div className="flex shrink-0 items-center gap-1">
            {headerAction ? (
              <span className={collapsed ? "sr-only" : ""}>{headerAction}</span>
            ) : null}
            <button
              onClick={() => setIsModalOpen(true)}
              aria-label="Add collection"
              title="Add collection"
              className={`p-1.5 rounded-md transition-colors text-muted-foreground hover:bg-surface-strong hover:text-foreground ${
                collapsed ? "sr-only" : ""
              }`}
            >
              <PlusIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tree */}
        <div
          className={`flex flex-col flex-1 min-h-0 ${
            collapsed ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          {!isLoading &&
            favoritesGroup &&
            favoritesGroup.directories.length > 0 && (
              <div className="shrink-0 max-h-[45%] overflow-y-auto border-b border-border">
                <TreeView
                  data={[favoritesGroup]}
                  onNodeClick={handleNodeClick}
                  onToggleFavorite={onToggleFavorite}
                  readOnlyTree
                />
              </div>
            )}
          <div className="flex-1 overflow-hidden">
            {isLoading ? (
              <SkeletonTree />
            ) : readOnlyTree ? (
              <TreeView
                data={collections}
                onNodeClick={handleNodeClick}
                onToggleFavorite={onToggleFavorite}
                onAddFile={handleAddFile}
                onAddFolder={handleAddFolder}
                onRequestDeleteNode={handleRequestDeleteNode}
                onDuplicateNode={onDuplicateFile ? handleDuplicateNode : undefined}
                onMoveNode={onMoveItem ? handleRequestMoveNode : undefined}
                onConvertToCanvas={onConvertToCanvas}
                onImportFromAzure={onImportFromAzure ? handleImportFromAzure : undefined}
                onAddCanvas={onCreateCanvas ? handleAddCanvas : undefined}
                onRequestDeleteGroup={
                  onDeleteCollection ? handleRequestDeleteGroup : undefined
                }
                selectedNodePath={selectedNodePath}
                selectedNodeId={selectedNodeId}
                readOnlyTree={readOnlyTree}
                highlightNodeId={highlightNodeId}
                forceExpandGroupId={forceExpandGroupId}
                revealTick={revealTarget?.tick}
              />
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={pointerWithin}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <TreeView
                  data={collections}
                  onNodeClick={handleNodeClick}
                  onAddFile={handleAddFile}
                  onAddFolder={handleAddFolder}
                  onRequestDeleteNode={handleRequestDeleteNode}
                  onDuplicateNode={onDuplicateFile ? handleDuplicateNode : undefined}
                  onMoveNode={onMoveItem ? handleRequestMoveNode : undefined}
                  onConvertToCanvas={onConvertToCanvas}
                  onToggleFavorite={onToggleFavorite}
                  onImportFromAzure={onImportFromAzure ? handleImportFromAzure : undefined}
                  onAddCanvas={onCreateCanvas ? handleAddCanvas : undefined}
                  onRequestDeleteGroup={
                    onDeleteCollection ? handleRequestDeleteGroup : undefined
                  }
                  editingNodeId={editingNodeId}
                  onStartRenameNode={
                    onRenameItem ? handleStartRenameNode : undefined
                  }
                  onSubmitRenameNode={handleSubmitRenameNode}
                  onCancelRename={handleCancelRename}
                  editingCollectionId={editingCollectionId}
                  onStartRenameGroup={
                    onRenameCollection ? handleStartRenameGroup : undefined
                  }
                  onSubmitRenameGroup={handleSubmitRenameGroup}
                  selectedNodePath={selectedNodePath}
                  selectedNodeId={selectedNodeId}
                  readOnlyTree={readOnlyTree}
                  highlightNodeId={highlightNodeId}
                  forceExpandGroupId={forceExpandGroupId}
                  revealTick={revealTarget?.tick}
                />
                <DragOverlay dropAnimation={null}>
                  {activeDrag ? (
                    <div className="flex items-center gap-1.5 rounded-md border border-accent/50 bg-surface px-2 py-1 text-sm text-foreground shadow-md">
                      {activeDrag.type === "folder" ? (
                        <FolderIcon className="w-4 h-4 text-brand-500 dark:text-brand-400 shrink-0" />
                      ) : (
                        <FileIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                      <span className="truncate max-w-[200px]">
                        {activeDrag.name}
                      </span>
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
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

      <MoveItemModal
        open={isMoveModalOpen}
        onClose={handleCloseMoveModal}
        node={selectedNodeForMove?.node ?? null}
        currentFolderId={selectedNodeForMove?.parentFolderId ?? null}
        collections={collections}
        onConfirm={handleConfirmMove}
        isMoving={isMovingItem}
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
