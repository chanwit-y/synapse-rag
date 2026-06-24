"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import InlineEditInput from "./InlineEditInput";
import {
  ChevronRight,
  ChevronDown,
  Copy,
  Folder,
  FolderInput,
  FolderOpen,
  File,
  Frame,
  MoreHorizontal,
  Star,
  Trash2,
} from "lucide-react";
import { Popover } from "../Popover";
import type { TreeNode } from "./types";

export interface TreeNodeItemProps {
  node: TreeNode;
  level: number;
  onNodeClick?: (node: TreeNode, nodePath: string) => void;
  selectedNodePath: string | null;
  setSelectedNodePath: (path: string | null) => void;
  nodePath: string;
  /** Id of the folder this node lives in, or null at the collection root. */
  parentFolderId: string | null;
  selectedNode: TreeNode | null;
  setSelectedNode: (node: TreeNode | null) => void;
  groupIndex: number;
  onRequestDeleteNode?: (
    node: TreeNode,
    nodePath: string,
    groupIndex: number,
  ) => void;
  /** Duplicate a file/canvas node (folders are not duplicable). */
  onDuplicateNode?: (
    node: TreeNode,
    nodePath: string,
    groupIndex: number,
  ) => void;
  /** Move a node (file/canvas/folder) to another collection/folder. */
  onMoveNode?: (node: TreeNode, parentFolderId: string | null) => void;
  /** Convert a markdown/rich-text file into a new canvas in the same folder. */
  onConvertToCanvas?: (node: TreeNode, parentFolderId: string | null) => void;
  /** Star/unstar a node. Available even in read-only trees (the favorites list). */
  onToggleFavorite?: (node: TreeNode) => void;
  editingNodeId?: string | null;
  onStartRenameNode?: (nodeId: string) => void;
  onSubmitRenameNode?: (
    node: TreeNode,
    nodePath: string,
    groupIndex: number,
    value: string,
  ) => void;
  onCancelRename?: () => void;
  readOnlyTree?: boolean;
  /** Id of a node to highlight briefly (e.g. revealed from a breadcrumb click). */
  highlightNodeId?: string | null;
  /** Whether this node is the last among its siblings (drives the └ terminator). */
  isLast?: boolean;
}

export default function TreeNodeItem({
  node,
  level,
  onNodeClick,
  selectedNodePath,
  setSelectedNodePath,
  nodePath,
  parentFolderId,
  selectedNode,
  setSelectedNode,
  groupIndex,
  onRequestDeleteNode,
  onDuplicateNode,
  onMoveNode,
  onConvertToCanvas,
  onToggleFavorite,
  editingNodeId,
  onStartRenameNode,
  onSubmitRenameNode,
  onCancelRename,
  readOnlyTree,
  highlightNodeId,
  isLast,
}: TreeNodeItemProps) {
  const isEditing = !readOnlyTree && editingNodeId === node.id;
  const [isExpanded, setIsExpanded] = useState(false);
  // Overflow (⋯) menu holding Move / Duplicate / Remove, anchored to the kebab.
  const [menuOpen, setMenuOpen] = useState(false);
  const kebabRef = useRef<HTMLButtonElement>(null);
  const hasChildren = node.children && node.children.length > 0;
  const isFolder = node.type === "folder";
  const isFile = node.type === "file";
  const isCanvas = node.type === "canvas";
  const canDuplicate = !!onDuplicateNode && (isFile || isCanvas);
  // Only markdown (.md) / rich-text (.rt) files convert to a canvas.
  const canConvertToCanvas =
    !!onConvertToCanvas && isFile && /\.(md|rt)$/i.test(node.name);
  const indentLevel = level > 0 ? level * 20 + 8 : 8;
  const isSelected = selectedNodePath === nodePath;
  const isHighlighted = !!highlightNodeId && highlightNodeId === node.id;

  // Tree connector geometry. Each node draws its own elbow joining it to the
  // parent trunk: a vertical stub down to the row centre, a horizontal tick to
  // the row, and (only when this isn't the last sibling) a continuation that
  // carries the trunk past this node's subtree to the next sibling. Omitting
  // the continuation on the last sibling yields the └ terminator.
  const GUIDE_W = 12; // elbow stub width
  const ROW_HALF = 16; // approx vertical centre of a row
  const trunkX = indentLevel - GUIDE_W;

  const { attributes, listeners, setNodeRef: setDragRef, isDragging } =
    useDraggable({
      id: node.id,
      data: {
        draggedId: node.id,
        collectionId: node.collectionId,
        name: node.name,
        type: node.type,
      },
      disabled: readOnlyTree,
    });

  // A folder accepts drops into itself; a file/leaf forwards drops to its
  // parent folder (or the collection root when top-level).
  const { setNodeRef: setDropRef, isOver, active } = useDroppable({
    id: `drop:${node.id}`,
    data: {
      targetFolderId: isFolder ? node.id : parentFolderId,
      collectionId: node.collectionId,
    },
    disabled: readOnlyTree,
  });

  const setRowRef = (el: HTMLDivElement | null) => {
    setDragRef(el);
    setDropRef(el);
  };

  // Highlight a folder only when a *different* node is dragged over it.
  const showDropTarget =
    isFolder && isOver && active?.id !== node.id;

  useEffect(() => {
    if (!isFolder) return;
    if (!selectedNodePath) return;
    if (
      selectedNodePath === nodePath ||
      selectedNodePath.startsWith(`${nodePath}/`)
    ) {
      setIsExpanded(true);
    }
  }, [isFolder, nodePath, selectedNodePath]);

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    if (isFolder && hasChildren) {
      setIsExpanded(!isExpanded);
    }
    setSelectedNodePath(nodePath);
    setSelectedNode(node);
    onNodeClick?.(node, nodePath);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (isEditing || readOnlyTree) return;
    if (e.key === "F2") {
      e.preventDefault();
      onStartRenameNode?.(node.id);
    }
  };

  return (
    <div className="relative">
      {/* vertical stub from the top of this node down to the elbow */}
      <span
        aria-hidden
        className="pointer-events-none absolute border-l border-dotted border-border"
        style={{ left: trunkX, top: 0, height: ROW_HALF }}
      />
      {/* horizontal elbow tick joining the trunk to this row */}
      <span
        aria-hidden
        className="pointer-events-none absolute border-t border-dotted border-border"
        style={{ left: trunkX, top: ROW_HALF, width: GUIDE_W }}
      />
      {/* continuation: carry the trunk past this node to the next sibling */}
      {!isLast && (
        <span
          aria-hidden
          className="pointer-events-none absolute border-l border-dotted border-border"
          style={{ left: trunkX, top: ROW_HALF, bottom: 0 }}
        />
      )}
      <div
        ref={setRowRef}
        {...(isEditing ? {} : attributes)}
        {...(isEditing ? {} : listeners)}
        className={`flex items-center gap-1 px-2 py-1.5 rounded-l cursor-pointer transition-colors group ${
          showDropTarget
            ? "bg-accent/20 ring-1 ring-accent/50"
            : isSelected
              ? "bg-accent/10 text-accent dark:bg-accent/20 dark:text-brand-100"
              : "hover:bg-surface-strong text-foreground"
        } ${isHighlighted ? "ring-2 ring-inset ring-accent/70" : ""} ${isDragging ? "opacity-40" : ""}`}
        style={{ marginLeft: `${indentLevel}px` }}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        data-tree-interactive="true"
        data-node-id={node.id}
      >
        {isFolder && hasChildren && (
          <span className="flex items-center justify-center w-4 h-4">
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </span>
        )}
        {!(isFolder && hasChildren) && <span className="w-4 h-4" />}
        {isFolder ? (
          isExpanded ? (
            <FolderOpen className="w-4 h-4 text-brand-500 dark:text-brand-400 shrink-0" />
          ) : (
            <Folder className="w-4 h-4 text-brand-500 dark:text-brand-400 shrink-0" />
          )
        ) : isCanvas ? (
          <Frame className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <File className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
        {isEditing ? (
          <InlineEditInput
            initialValue={node.name}
            kind={node.type}
            onCommit={(value) =>
              onSubmitRenameNode?.(node, nodePath, groupIndex, value)
            }
            onCancel={() => onCancelRename?.()}
          />
        ) : (
          <span
            className="text-sm truncate flex-1 min-w-0"
            title={node.name}
            onDoubleClick={(event) => {
              event.stopPropagation();
              if (!readOnlyTree) onStartRenameNode?.(node.id);
            }}
          >
            {node.name}
          </span>
        )}
        {!isEditing && onToggleFavorite && (
          <button
            type="button"
            className={`ml-2 p-1 rounded transition-colors hover:bg-amber-100 dark:hover:bg-amber-500/20 ${
              node.isFavorite
                ? "text-amber-500 opacity-100"
                : "text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-amber-500"
            }`}
            onClick={(event) => {
              event.stopPropagation();
              onToggleFavorite(node);
            }}
            aria-label={node.isFavorite ? `Unfavorite ${node.type}` : `Favorite ${node.type}`}
            aria-pressed={!!node.isFavorite}
            title={node.isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <Star
              className="w-3.5 h-3.5"
              fill={node.isFavorite ? "currentColor" : "none"}
            />
          </button>
        )}
        {!readOnlyTree && !isEditing && (
          <>
            <button
              ref={kebabRef}
              type="button"
              className={`${onToggleFavorite ? "ml-0.5" : "ml-2"} p-1 rounded transition-colors
                text-muted-foreground hover:text-accent hover:bg-accent/10 dark:hover:bg-accent/20 ${
                  menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                }`}
              onClick={(event) => {
                event.stopPropagation();
                setMenuOpen((o) => !o);
              }}
              aria-label={`More actions for ${node.name}`}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              title="More actions"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
            <Popover
              open={menuOpen}
              onClose={() => setMenuOpen(false)}
              anchorRef={kebabRef}
              align="end"
            >
              {onMoveNode && (
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-foreground hover:bg-surface-strong"
                  onClick={(event) => {
                    event.stopPropagation();
                    setMenuOpen(false);
                    onMoveNode(node, parentFolderId);
                  }}
                >
                  <FolderInput className="h-3.5 w-3.5 text-muted-foreground" />
                  Move
                </button>
              )}
              {canDuplicate && (
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-foreground hover:bg-surface-strong"
                  onClick={(event) => {
                    event.stopPropagation();
                    setMenuOpen(false);
                    onDuplicateNode?.(node, nodePath, groupIndex);
                  }}
                >
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                  Duplicate
                </button>
              )}
              {canConvertToCanvas && (
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-foreground hover:bg-surface-strong"
                  onClick={(event) => {
                    event.stopPropagation();
                    setMenuOpen(false);
                    onConvertToCanvas?.(node, parentFolderId);
                  }}
                >
                  <Frame className="h-3.5 w-3.5 text-muted-foreground" />
                  Convert to Canvas
                </button>
              )}
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                onClick={(event) => {
                  event.stopPropagation();
                  setMenuOpen(false);
                  onRequestDeleteNode?.(node, nodePath, groupIndex);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            </Popover>
          </>
        )}
      </div>
      {hasChildren && (
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isExpanded
              ? "max-h-[10000px] opacity-100"
              : "max-h-0 opacity-0"
          }`}
          style={{ transitionProperty: "max-height, opacity" }}
        >
          <div
            className={`transform transition-all duration-300 ease-in-out ml-3 ${
              isExpanded
                ? "translate-y-0 opacity-100"
                : "-translate-y-4 opacity-0"
            }`}
          >
            {node.children!.map((child, childIndex) => (
              <TreeNodeItem
                key={child.id}
                node={child}
                level={level + 1}
                isLast={childIndex === node.children!.length - 1}
                onNodeClick={onNodeClick}
                selectedNodePath={selectedNodePath}
                setSelectedNodePath={setSelectedNodePath}
                nodePath={`${nodePath}/${child.name}`}
                parentFolderId={node.id}
                selectedNode={selectedNode}
                setSelectedNode={setSelectedNode}
                groupIndex={groupIndex}
                onRequestDeleteNode={onRequestDeleteNode}
                onDuplicateNode={onDuplicateNode}
                onMoveNode={onMoveNode}
                onConvertToCanvas={onConvertToCanvas}
                onToggleFavorite={onToggleFavorite}
                editingNodeId={editingNodeId}
                onStartRenameNode={onStartRenameNode}
                onSubmitRenameNode={onSubmitRenameNode}
                onCancelRename={onCancelRename}
                readOnlyTree={readOnlyTree}
                highlightNodeId={highlightNodeId}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
