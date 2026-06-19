"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/common/Modal/Modal";
import Button from "@/components/common/Button/Button";
import SelectField from "@/components/common/SelectField/SelectField";
import type { TreeNode, TreeViewGroup } from "./types";
import { collectNodeAndDescendantIds, flattenFolderNodes } from "./treeUtils";

/** Sentinel value for the "(Collection root)" option (maps to a null folder). */
const ROOT_VALUE = "__root__";

export interface MoveItemModalProps {
  open: boolean;
  onClose: () => void;
  /** The file/canvas/folder being moved (null while the modal is closed). */
  node: TreeNode | null;
  /** The folder the node currently lives in, or null at the collection root. */
  currentFolderId: string | null;
  /** All collections — destination candidates. */
  collections: TreeViewGroup[];
  /** Perform the move; `destFolderId` null = the destination collection's root. */
  onConfirm: (destCollectionId: string, destFolderId: string | null) => void;
  isMoving?: boolean;
}

export default function MoveItemModal({
  open,
  onClose,
  node,
  currentFolderId,
  collections,
  onConfirm,
  isMoving = false,
}: MoveItemModalProps) {
  const [destCollectionId, setDestCollectionId] = useState<string | null>(null);
  const [destFolderValue, setDestFolderValue] = useState<string>(ROOT_VALUE);

  // Each time the modal opens for a node, seed the dropdowns at its current
  // location so the only way to enable Confirm is to actually pick a new spot.
  useEffect(() => {
    if (!open || !node) return;
    setDestCollectionId(node.collectionId);
    setDestFolderValue(currentFolderId ?? ROOT_VALUE);
  }, [open, node, currentFolderId]);

  const itemLabel =
    node?.type === "folder" ? "Folder" : node?.type === "canvas" ? "Canvas" : "File";

  // Folders in the chosen collection, as indented paths. When moving a folder
  // within its own collection, exclude that folder and its descendants — a
  // folder can't become its own (grand)child.
  const folderOptions = useMemo(() => {
    const group = collections.find((g) => g.id === destCollectionId);
    if (!group) return [{ value: ROOT_VALUE, label: "(Collection root)" }];

    const exclude =
      node && node.type === "folder" && node.collectionId === destCollectionId
        ? collectNodeAndDescendantIds(node)
        : new Set<string>();

    const folders = flattenFolderNodes(group.directories, exclude);
    return [
      { value: ROOT_VALUE, label: "(Collection root)" },
      ...folders.map((f) => ({ value: f.id, label: f.path })),
    ];
  }, [collections, destCollectionId, node]);

  // The effective folder value, derived so a selection that no longer exists
  // (e.g. after switching collections) gracefully falls back to the root rather
  // than showing a stale option — no extra state/effect needed.
  const effectiveFolderValue = folderOptions.some(
    (o) => o.value === destFolderValue,
  )
    ? destFolderValue
    : ROOT_VALUE;

  const destFolderId =
    effectiveFolderValue === ROOT_VALUE ? null : effectiveFolderValue;

  // No-op when the destination is exactly where the item already lives.
  const isSameLocation =
    !!node &&
    destCollectionId === node.collectionId &&
    destFolderId === (currentFolderId ?? null);

  const handleConfirm = () => {
    if (!node || !destCollectionId || isSameLocation || isMoving) return;
    onConfirm(destCollectionId, destFolderId);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={`Move ${itemLabel}`}
      footer={
        <div className="flex justify-end gap-2">
          <Button
            variant="outlined"
            color="inherit"
            size="small"
            onClick={onClose}
            disabled={isMoving}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={handleConfirm}
            disabled={!destCollectionId || isSameLocation || isMoving}
            loading={isMoving}
          >
            Move
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        {node && (
          <p className="text-sm text-muted-foreground">
            Move{" "}
            <span className="font-semibold text-foreground">
              &quot;{node.name}&quot;
            </span>{" "}
            to:
          </p>
        )}
        <SelectField
          label="Collection"
          fullWidth
          options={collections.map((c) => ({ value: c.id, label: c.name }))}
          value={destCollectionId}
          onChange={(v) => setDestCollectionId(v == null ? null : String(v))}
        />
        <SelectField
          label="Folder"
          fullWidth
          options={folderOptions}
          value={effectiveFolderValue}
          onChange={(v) => setDestFolderValue(v == null ? ROOT_VALUE : String(v))}
        />
      </div>
    </Modal>
  );
}
