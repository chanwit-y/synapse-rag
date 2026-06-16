"use client";

import { useEffect, useState, type KeyboardEvent, type MouseEvent } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import InlineEditInput from "./InlineEditInput";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  File,
  Trash2,
} from "lucide-react";
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
  const hasChildren = node.children && node.children.length > 0;
  const isFolder = node.type === "folder";
  const isFile = node.type === "file";
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
        {!readOnlyTree && !isEditing && (
          <button
            type="button"
            className="ml-2 p-1 rounded transition-colors opacity-0 group-hover:opacity-100
              text-muted-foreground hover:text-red-600 hover:bg-red-50
              dark:hover:text-red-400 dark:hover:bg-red-900/20"
            onClick={(event) => {
              event.stopPropagation();
              onRequestDeleteNode?.(node, nodePath, groupIndex);
            }}
            aria-label={`Delete ${node.type}`}
            title={`Delete ${node.type}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
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
