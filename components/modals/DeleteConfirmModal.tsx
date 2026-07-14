"use client";

import { AlertDialog } from "@astryxdesign/core/AlertDialog";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  documentTitle: string;
}

export function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  documentTitle,
}: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <AlertDialog
      isOpen
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Delete Document"
      description={`Are you sure you want to delete "${documentTitle}"? This action cannot be undone.`}
      actionLabel="Delete"
      onAction={onConfirm}
    />
  );
}
