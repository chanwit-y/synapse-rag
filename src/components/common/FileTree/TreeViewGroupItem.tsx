"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  CloudDownload,
  Folder,
  FileText,
  Trash2,
} from "lucide-react";
import type { TreeNode, TreeViewGroup, FileType } from "./types";
import TreeNodeItem from "./TreeNodeItem";

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
  onImportFromAzure?: (
    collectionId: string,
    selectedNode: TreeNode | null,
    selectedNodePath: string | null,
  ) => void;
  onRequestDeleteGroup?: (group: TreeViewGroup, groupIndex: number) => void;
  readOnlyTree?: boolean;
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
  onImportFromAzure,
  onRequestDeleteGroup,
  readOnlyTree,
}: TreeViewGroupItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [contentHeight, setContentHeight] = useState<number>(0);

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
        className="flex items-center justify-between px-2 py-2 text-xs font-semibold
          text-muted-foreground uppercase tracking-wide
          hover:bg-surface-strong cursor-pointer transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
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
          <span className="truncate" title={group.name}>
            {group.name}
          </span>
        </div>
        {!readOnlyTree && (
          <div className="shrink-0 flex items-center gap-0.5">
            {onImportFromAzure && (
              <button
                type="button"
                className="p-1 hover:bg-surface rounded transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onImportFromAzure(group.id, selectedNode, selectedNodePath);
                }}
                title="Import user stories from Azure DevOps"
              >
                <CloudDownload className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
            <div className="flex items-center gap-0.5 rounded-md px-0.5 bg-surface-strong">
              <button
                type="button"
                className="p-1 hover:bg-surface rounded transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddFile?.(selectedNode, selectedNodePath, groupIndex, "md");
                }}
                title="Add File"
              >
                <FileText className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
            <button
              type="button"
              className="p-1 hover:bg-surface rounded transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onAddFolder?.(selectedNode, selectedNodePath, groupIndex);
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
          ref={contentRef}
          className="pt-1 pl-4 ml-3 border-l border-dotted border-border"
        >
          {group.directories.map((node) => (
            <TreeNodeItem
              key={node.id}
              node={node}
              level={0}
              onNodeClick={onNodeClick}
              selectedNodePath={selectedNodePath}
              setSelectedNodePath={setSelectedNodePath}
              nodePath={node.name}
              selectedNode={selectedNode}
              setSelectedNode={setSelectedNode}
              groupIndex={groupIndex}
              onRequestDeleteNode={onRequestDeleteNode}
              readOnlyTree={readOnlyTree}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
