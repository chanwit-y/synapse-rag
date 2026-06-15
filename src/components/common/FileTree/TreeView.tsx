"use client";

import { useEffect, useState } from "react";
import type { MouseEvent } from "react";
import TreeViewGroupItem from "./TreeViewGroupItem";
import type { TreeNode, TreeViewGroup, FileType } from "./types";
import { findNodeByPath, findNodeById } from "./treeUtils";

export interface TreeViewProps {
  data: TreeViewGroup[];
  onNodeClick?: (node: TreeNode, nodePath: string) => void;
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
  onImportFromAzure?: (collectionId: string) => void;
  onRequestDeleteGroup?: (group: TreeViewGroup, groupIndex: number) => void;
  selectedNodePath?: string | null;
  selectedNodeId?: string | null;
  readOnlyTree?: boolean;
}

export default function TreeView({
  data,
  onNodeClick,
  onAddFile,
  onAddFolder,
  onRequestDeleteNode,
  onImportFromAzure,
  onRequestDeleteGroup,
  selectedNodePath: externalSelectedNodePath,
  selectedNodeId: externalSelectedNodeId,
  readOnlyTree,
}: TreeViewProps) {
  const [selectedNodePath, setSelectedNodePath] = useState<string | null>(
    externalSelectedNodePath ?? null,
  );
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);

  useEffect(() => {
    if (externalSelectedNodePath === undefined) return;
    setSelectedNodePath(externalSelectedNodePath);
    if (!externalSelectedNodePath) {
      setSelectedNode(null);
      return;
    }
    const segments = externalSelectedNodePath.split("/").filter(Boolean);
    for (const group of data) {
      const found = findNodeByPath(group.directories, segments);
      if (found) {
        setSelectedNode(found);
        return;
      }
    }

    if (externalSelectedNodeId) {
      for (const group of data) {
        const match = findNodeById(group.directories, externalSelectedNodeId);
        if (match) {
          setSelectedNodePath(match.path);
          setSelectedNode(match.node);
          return;
        }
      }
    }
  }, [externalSelectedNodePath, externalSelectedNodeId, data]);

  const handleBackgroundClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('[data-tree-interactive="true"]')) return;
    setSelectedNode(null);
    setSelectedNodePath(null);
  };

  return (
    <div className="h-full overflow-y-auto" onClick={handleBackgroundClick}>
      <div className="py-2">
        {data.map((group, groupIndex) => (
          <TreeViewGroupItem
            key={group.id}
            group={group}
            groupIndex={groupIndex}
            onNodeClick={onNodeClick}
            selectedNodePath={selectedNodePath}
            setSelectedNodePath={setSelectedNodePath}
            selectedNode={selectedNode}
            setSelectedNode={setSelectedNode}
            onAddFile={onAddFile}
            onAddFolder={onAddFolder}
            onRequestDeleteNode={onRequestDeleteNode}
            onImportFromAzure={onImportFromAzure}
            onRequestDeleteGroup={onRequestDeleteGroup}
            readOnlyTree={readOnlyTree}
          />
        ))}
      </div>
    </div>
  );
}
