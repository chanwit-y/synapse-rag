"use client";

import Modal from "@/components/common/Modal/Modal";
import Button from "@/components/common/Button/Button";
import TextField from "@/components/common/TextField/TextField";
import type { TreeNode } from "./types";

type SelectedNodeForAdd = {
  node: TreeNode | null;
  path: string | null;
  groupIndex: number;
} | null;

type SelectedNodeForDelete = {
  node: TreeNode;
  path: string;
  groupIndex: number;
} | null;

export interface FileSidebarModalsProps {
  isCollectionModalOpen: boolean;
  onCloseCollectionModal: () => void;
  collectionName: string;
  onChangeCollectionName: (value: string) => void;
  onSubmitCollection: () => void;
  isSavingCollection: boolean;

  isAddItemModalOpen: boolean;
  onCloseAddItemModal: () => void;
  itemType: "file" | "folder";
  itemName: string;
  onChangeItemName: (value: string) => void;
  onSubmitItem: () => void;
  isSavingItem: boolean;
  selectedNodeForAdd: SelectedNodeForAdd;

  isDeleteModalOpen: boolean;
  onCloseDeleteModal: () => void;
  onConfirmDelete: () => void;
  isDeletingItem: boolean;
  selectedNodeForDelete: SelectedNodeForDelete;
}

export default function FileSidebarModals({
  isCollectionModalOpen,
  onCloseCollectionModal,
  collectionName,
  onChangeCollectionName,
  onSubmitCollection,
  isSavingCollection,

  isAddItemModalOpen,
  onCloseAddItemModal,
  itemType,
  itemName,
  onChangeItemName,
  onSubmitItem,
  isSavingItem,
  selectedNodeForAdd,

  isDeleteModalOpen,
  onCloseDeleteModal,
  onConfirmDelete,
  isDeletingItem,
  selectedNodeForDelete,
}: FileSidebarModalsProps) {
  const isDeleteBlocked =
    selectedNodeForDelete?.node.type === "folder" &&
    (selectedNodeForDelete.node.children?.length ?? 0) > 0;

  return (
    <>
      {/* Add Collection Modal */}
      <Modal
        open={isCollectionModalOpen}
        onClose={onCloseCollectionModal}
        size="sm"
        title="Add Collection"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="outlined"
              color="inherit"
              size="small"
              onClick={onCloseCollectionModal}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              size="small"
              onClick={onSubmitCollection}
              disabled={!collectionName.trim() || isSavingCollection}
              loading={isSavingCollection}
            >
              Add
            </Button>
          </div>
        }
      >
        <TextField
          label="Collection Name"
          value={collectionName}
          onChange={(e) => onChangeCollectionName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSubmitCollection();
          }}
          placeholder="Enter collection name"
          fullWidth
          autoFocus
        />
      </Modal>

      {/* Add File/Folder Modal */}
      <Modal
        open={isAddItemModalOpen}
        onClose={onCloseAddItemModal}
        size="sm"
        title={`Add ${itemType === "file" ? "File" : "Folder"}`}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="outlined"
              color="inherit"
              size="small"
              onClick={onCloseAddItemModal}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              size="small"
              onClick={onSubmitItem}
              disabled={!itemName.trim() || isSavingItem}
              loading={isSavingItem}
            >
              Add
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <TextField
            label={`${itemType === "file" ? "File" : "Folder"} Name`}
            value={itemName}
            onChange={(e) => onChangeItemName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSubmitItem();
            }}
            placeholder={
              itemType === "file"
                ? "Enter file name (e.g., example.md)"
                : "Enter folder name"
            }
            fullWidth
            autoFocus
          />
          {selectedNodeForAdd?.node && (
            <p className="text-xs text-muted-foreground">
              Will be added{" "}
              {selectedNodeForAdd.node.type === "folder" ? "inside" : "next to"}{" "}
              &quot;{selectedNodeForAdd.node.name}&quot;
            </p>
          )}
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={isDeleteModalOpen}
        onClose={onCloseDeleteModal}
        size="sm"
        title={`Delete ${selectedNodeForDelete?.node.type === "folder" ? "Folder" : "File"}`}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="outlined"
              color="inherit"
              size="small"
              onClick={onCloseDeleteModal}
              disabled={isDeletingItem}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="error"
              size="small"
              onClick={onConfirmDelete}
              disabled={isDeletingItem || isDeleteBlocked}
              loading={isDeletingItem}
            >
              Delete
            </Button>
          </div>
        }
      >
        {isDeleteBlocked ? (
          <p className="text-sm text-muted-foreground">
            This folder is not empty. Remove its contents before deleting.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            This will permanently delete{" "}
            <span className="font-semibold text-foreground">
              &quot;{selectedNodeForDelete?.node.name ?? "this item"}&quot;
            </span>
            {selectedNodeForDelete?.node.type === "folder"
              ? " and all of its contents."
              : "."}
          </p>
        )}
      </Modal>
    </>
  );
}
