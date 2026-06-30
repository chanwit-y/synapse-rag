"use client";

import { useEffect, useRef, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  ChevronRight,
  ChevronDown,
  CloudDownload,
  Folder,
  FileText,
  FolderInput,
  Frame,
  Import,
  Trash2,
} from "lucide-react";
import type { TreeNode, TreeViewGroup, FileType } from "./types";
import TreeNodeItem from "./TreeNodeItem";
import InlineEditInput from "./InlineEditInput";
import { Popover } from "../Popover";

export interface TreeViewGroupItemProps {
  group: TreeViewGroup;
  groupIndex: number;
  onNodeClick?: (node: TreeNode, nodePath: string) => void;
  selectedNodePath: string | null;
  setSelectedNodePath: (path: string | null) => void;
  selectedNode: TreeNode | null;
  setSelectedNode: (node: TreeNode | null) => void;
  onAddFile?: (
    selectedNode: TreeNode | null,
    selectedNodePath: string | null,
    groupIndex: number,
    fileType: FileType,
  ) => void;
  onAddFolder?: (
    selectedNode: TreeNode | null,
    selectedNodePath: string | null,
    groupIndex: number,
  ) => void;
  onRequestDeleteNode?: (
    node: TreeNode,
    nodePath: string,
    groupIndex: number,
  ) => void;
  onDuplicateNode?: (
    node: TreeNode,
    nodePath: string,
    groupIndex: number,
  ) => void;
  onMoveNode?: (node: TreeNode, parentFolderId: string | null) => void;
  onConvertToCanvas?: (node: TreeNode, parentFolderId: string | null) => void;
  onToggleFavorite?: (node: TreeNode) => void;
  onImportFromAzure?: (
    collectionId: string,
    selectedNode: TreeNode | null,
    selectedNodePath: string | null,
  ) => void;
  onImportFromSharePoint?: (
    collectionId: string,
    selectedNode: TreeNode | null,
    selectedNodePath: string | null,
  ) => void;
  onAddCanvas?: (
    selectedNode: TreeNode | null,
    selectedNodePath: string | null,
    groupIndex: number,
  ) => void;
  onRequestDeleteGroup?: (group: TreeViewGroup, groupIndex: number) => void;
  editingNodeId?: string | null;
  onStartRenameNode?: (nodeId: string) => void;
  onSubmitRenameNode?: (
    node: TreeNode,
    nodePath: string,
    groupIndex: number,
    value: string,
  ) => void;
  onCancelRename?: () => void;
  editingCollectionId?: string | null;
  onStartRenameGroup?: (collectionId: string) => void;
  onSubmitRenameGroup?: (
    group: TreeViewGroup,
    groupIndex: number,
    value: string,
  ) => void;
  readOnlyTree?: boolean;
  /** Id of a node/collection to highlight briefly when revealed. */
  highlightNodeId?: string | null;
  /** When this matches the group id, force the group open (breadcrumb reveal). */
  forceExpandGroupId?: string | null;
  /** Bumped on each reveal so a repeat reveal of the same group re-expands it. */
  revealTick?: number;
}

export default function TreeViewGroupItem({
  group,
  groupIndex,
  onNodeClick,
  selectedNodePath,
  setSelectedNodePath,
  selectedNode,
  setSelectedNode,
  onAddFile,
  onAddFolder,
  onRequestDeleteNode,
  onDuplicateNode,
  onMoveNode,
  onConvertToCanvas,
  onToggleFavorite,
  onImportFromAzure,
  onImportFromSharePoint,
  onAddCanvas,
  onRequestDeleteGroup,
  editingNodeId,
  onStartRenameNode,
  onSubmitRenameNode,
  onCancelRename,
  editingCollectionId,
  onStartRenameGroup,
  onSubmitRenameGroup,
  readOnlyTree,
  highlightNodeId,
  forceExpandGroupId,
  revealTick,
}: TreeViewGroupItemProps) {
  const isEditingGroup = !readOnlyTree && editingCollectionId === group.id;
  const [isExpanded, setIsExpanded] = useState(true);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [contentHeight, setContentHeight] = useState<number>(0);

  // Create-file editor-type popover, anchored to the add-file button.
  const [addFileMenuOpen, setAddFileMenuOpen] = useState(false);
  const addFileButtonRef = useRef<HTMLButtonElement | null>(null);

  // Import-source popover (Azure DevOps / SharePoint), anchored to its button.
  const [importMenuOpen, setImportMenuOpen] = useState(false);
  const importButtonRef = useRef<HTMLButtonElement | null>(null);

  // Adds triggered from the collection header always target the collection
  // root — they belong to the collection, not to whatever node happens to be
  // selected elsewhere in the tree.
  const handlePickFileType = (fileType: FileType) => {
    setAddFileMenuOpen(false);
    onAddFile?.(null, null, groupIndex, fileType);
  };

  // A breadcrumb reveal forces this collection open if it was collapsed.
  useEffect(() => {
    if (revealTick && forceExpandGroupId === group.id) setIsExpanded(true);
  }, [revealTick, forceExpandGroupId, group.id]);

  // Root drop zone: dropping here moves an item to the collection's top level.
  const { setNodeRef: setRootDropRef, isOver: isOverRoot } = useDroppable({
    id: `drop-root:${group.id}`,
    data: { targetFolderId: null, collectionId: group.id },
    disabled: readOnlyTree,
  });

  const setContentRefs = (el: HTMLDivElement | null) => {
    contentRef.current = el;
    setRootDropRef(el);
  };

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const measure = () => setContentHeight(el.scrollHeight);
    measure();

    const ro = new ResizeObserver(() => {
      if (isExpanded) measure();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [isExpanded, group.directories]);

  return (
    <div>
      <div
        className={`flex items-center justify-between px-2 py-2 text-xs font-semibold
          text-muted-foreground uppercase tracking-wide
          hover:bg-surface-strong cursor-pointer transition-colors ${
            highlightNodeId === group.id ? "ring-2 ring-inset ring-accent/70" : ""
          }`}
        data-group-id={group.id}
        onClick={() => {
          if (!isEditingGroup) setIsExpanded(!isExpanded);
        }}
        onKeyDown={(e) => {
          if (isEditingGroup || readOnlyTree) return;
          if (e.key === "F2") {
            e.preventDefault();
            onStartRenameGroup?.(group.id);
          }
        }}
        tabIndex={readOnlyTree ? undefined : 0}
        data-tree-interactive="true"
      >
        <div className="flex items-center gap-1 min-w-0 flex-1 mr-1">
          <span className="shrink-0 flex items-center justify-center w-4 h-4 transition-transform duration-200">
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </span>
          {isEditingGroup ? (
            <InlineEditInput
              initialValue={group.name}
              kind="collection"
              className="min-w-0 flex-1 rounded border border-accent bg-background px-1 py-0.5 text-xs font-semibold uppercase tracking-wide text-foreground outline-none focus:ring-1 focus:ring-accent"
              onCommit={(value) => onSubmitRenameGroup?.(group, groupIndex, value)}
              onCancel={() => onCancelRename?.()}
            />
          ) : (
            <span
              className="truncate"
              title={group.name}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (!readOnlyTree) onStartRenameGroup?.(group.id);
              }}
            >
              {group.name}
            </span>
          )}
        </div>
        {!readOnlyTree && (
          <div className="shrink-0 flex items-center gap-0.5">
            {(onImportFromAzure || onImportFromSharePoint) && (
              <>
                <button
                  ref={importButtonRef}
                  type="button"
                  className="p-1 hover:bg-surface rounded transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setImportMenuOpen((open) => !open);
                  }}
                  aria-haspopup="menu"
                  aria-expanded={importMenuOpen}
                  title="Import"
                >
                  <Import className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <Popover
                  open={importMenuOpen}
                  onClose={() => setImportMenuOpen(false)}
                  anchorRef={importButtonRef}
                >
                  {onImportFromAzure && (
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-foreground hover:bg-surface-strong"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImportMenuOpen(false);
                        onImportFromAzure(group.id, selectedNode, selectedNodePath);
                      }}
                    >
                      <CloudDownload className="h-3.5 w-3.5 text-muted-foreground" />
                      Azure DevOps
                    </button>
                  )}
                  {onImportFromSharePoint && (
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-foreground hover:bg-surface-strong"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImportMenuOpen(false);
                        onImportFromSharePoint(group.id, selectedNode, selectedNodePath);
                      }}
                    >
                      <FolderInput className="h-3.5 w-3.5 text-muted-foreground" />
                      SharePoint
                    </button>
                  )}
                </Popover>
              </>
            )}
            <button
              ref={addFileButtonRef}
              type="button"
              className="p-1 hover:bg-surface rounded transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setAddFileMenuOpen((open) => !open);
              }}
              aria-haspopup="menu"
              aria-expanded={addFileMenuOpen}
              title="Add File"
            >
              <FileText className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            <Popover
              open={addFileMenuOpen}
              onClose={() => setAddFileMenuOpen(false)}
              anchorRef={addFileButtonRef}
            >
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-foreground hover:bg-surface-strong"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePickFileType("md");
                }}
              >
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                Markdown
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-foreground hover:bg-surface-strong"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePickFileType("rt");
                }}
              >
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                Rich Text
              </button>
              {onAddCanvas && (
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-foreground hover:bg-surface-strong"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAddFileMenuOpen(false);
                    onAddCanvas(null, null, groupIndex);
                  }}
                >
                  <Frame className="h-3.5 w-3.5 text-muted-foreground" />
                  Canvas
                </button>
              )}
            </Popover>
            <button
              type="button"
              className="p-1 hover:bg-surface rounded transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onAddFolder?.(null, null, groupIndex);
              }}
              title="Add Folder"
            >
              <Folder className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            {onRequestDeleteGroup && (
              <button
                type="button"
                className="group/del p-1 ml-0.5 rounded transition-colors hover:bg-destructive/10"
                onClick={(e) => {
                  e.stopPropagation();
                  onRequestDeleteGroup(group, groupIndex);
                }}
                aria-label="Delete collection"
                title="Delete collection"
              >
                <Trash2 className="w-3.5 h-3.5 text-muted-foreground transition-colors group-hover/del:text-destructive" />
              </button>
            )}
          </div>
        )}
      </div>
      <div
        className="transition-[height,opacity,transform] duration-300 ease-in-out will-change-[height,opacity,transform]"
        style={{
          height: isExpanded ? contentHeight : 0,
          opacity: isExpanded ? 1 : 0,
          transform: isExpanded ? "translateY(0px)" : "translateY(-8px)",
          overflow: "hidden",
        }}
      >
        <div
          ref={setContentRefs}
          className={`pt-1 pl-4 ml-3 rounded transition-colors ${
            isOverRoot ? "bg-accent/5 ring-1 ring-accent/40" : ""
          }`}
        >
          {group.directories.map((node, nodeIndex) => (
            <TreeNodeItem
              key={node.id}
              node={node}
              level={0}
              isLast={nodeIndex === group.directories.length - 1}
              onNodeClick={onNodeClick}
              selectedNodePath={selectedNodePath}
              setSelectedNodePath={setSelectedNodePath}
              nodePath={node.name}
              parentFolderId={null}
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
    </div>
  );
}
