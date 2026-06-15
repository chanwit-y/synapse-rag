"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
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
  readOnlyTree?: boolean;
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
  readOnlyTree,
}: TreeNodeItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = node.children && node.children.length > 0;
  const isFolder = node.type === "folder";
  const isFile = node.type === "file";
  const indentLevel = level > 0 ? level * 20 + 8 : 8;
  const isSelected = selectedNodePath === nodePath;

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

  return (
    <div>
      <div
        ref={setRowRef}
        {...attributes}
        {...listeners}
        className={`flex items-center gap-1 px-2 py-1.5 rounded-l cursor-pointer transition-colors group ${
          showDropTarget
            ? "bg-accent/20 ring-1 ring-accent/50"
            : isSelected
              ? "bg-accent/10 text-accent dark:bg-accent/20 dark:text-brand-100"
              : "hover:bg-surface-strong text-foreground"
        } ${isDragging ? "opacity-40" : ""}`}
        style={{ paddingLeft: `${indentLevel}px` }}
        onClick={handleClick}
        data-tree-interactive="true"
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
        {!isFolder && !hasChildren && <span className="w-4 h-4" />}
        {isFolder ? (
          isExpanded ? (
            <FolderOpen className="w-4 h-4 text-brand-500 dark:text-brand-400 shrink-0" />
          ) : (
            <Folder className="w-4 h-4 text-brand-500 dark:text-brand-400 shrink-0" />
          )
        ) : (
          <File className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
        <span className="text-sm truncate flex-1 min-w-0" title={node.name}>
          {node.name}
        </span>
        {!readOnlyTree && (
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
            className={`transform transition-all duration-300 ease-in-out ml-3 border-l border-dotted border-border ${
              isExpanded
                ? "translate-y-0 opacity-100"
                : "-translate-y-4 opacity-0"
            }`}
          >
            {node.children!.map((child) => (
              <TreeNodeItem
                key={child.id}
                node={child}
                level={level + 1}
                onNodeClick={onNodeClick}
                selectedNodePath={selectedNodePath}
                setSelectedNodePath={setSelectedNodePath}
                nodePath={`${nodePath}/${child.name}`}
                parentFolderId={node.id}
                selectedNode={selectedNode}
                setSelectedNode={setSelectedNode}
                groupIndex={groupIndex}
                onRequestDeleteNode={onRequestDeleteNode}
                readOnlyTree={readOnlyTree}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
