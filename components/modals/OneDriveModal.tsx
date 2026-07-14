"use client";

import { useState, useEffect } from "react";
import { useOneDrive } from "@/hooks/useOneDrive";
import { useStore } from "@/stores/store";
import { useToast } from "@/components/ui/Toast";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { Button } from "@astryxdesign/core/Button";
import {
  CloudCog,
  ArrowLeft,
  Folder,
  FileText,
  Save,
} from "lucide-react";

type Mode = "import" | "save";

interface OneDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: Mode;
}

export function OneDriveModal({ isOpen, onClose, mode }: OneDriveModalProps) {
  const oneDrive = useOneDrive();
  const { notify } = useToast();
  const currentDocument = useStore((state) => state.currentDocument);
  const createImportedDocument = useStore((state) => state.createImportedDocument);

  const [newFileName, setNewFileName] = useState("");
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  useEffect(() => {
    if (isOpen && oneDrive.isConnected) {
      oneDrive.fetchFiles("root");
      setNewFileName(currentDocument?.title || "document");
      setSelectedFileId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, oneDrive.isConnected]);

  if (!isOpen) return null;

  const handleItemClick = async (item: { id: string; name: string; isFolder: boolean }) => {
    if (item.isFolder) {
      oneDrive.navigateToFolder(item.id);
    } else if (mode === "import") {
      const file = await oneDrive.fetchFileContent(item.id);
      if (file) {
        createImportedDocument(file.name, file.content);
        notify("File imported from OneDrive");
        onClose();
      }
    } else {
      // Save mode - select file to overwrite
      setSelectedFileId(item.id);
      setNewFileName(item.name.replace(/\.md$/, ""));
    }
  };

  const handleSave = async () => {
    if (!currentDocument) return;

    const fileName = newFileName.endsWith(".md") ? newFileName : `${newFileName}.md`;
    const success = await oneDrive.saveFile(
      fileName,
      currentDocument.body,
      oneDrive.currentFolderId !== "root" ? oneDrive.currentFolderId : undefined,
      selectedFileId || undefined
    );

    if (success) {
      onClose();
    }
  };

  // Not connected state
  if (!oneDrive.isConnected) {
    return (
      <Dialog isOpen onOpenChange={handleOpenChange} width={448} aria-label="Connect to OneDrive">
        <Layout
          header={<DialogHeader title="Connect to OneDrive" onOpenChange={handleOpenChange} />}
          content={
            <LayoutContent>
              <div className="text-center">
                <CloudCog size={48} className="mx-auto text-text-primary mb-4" aria-hidden="true" />
                <p className="text-text-secondary mb-6">
                  Connect your OneDrive account to import and save markdown files.
                </p>
                <Button
                  label="Connect OneDrive"
                  variant="primary"
                  onClick={oneDrive.connect}
                  className="bg-plum text-bg-sidebar hover:opacity-90"
                />
              </div>
            </LayoutContent>
          }
        />
      </Dialog>
    );
  }

  return (
    <Dialog
      isOpen
      onOpenChange={handleOpenChange}
      width={512}
      maxHeight="80vh"
      aria-label={mode === "import" ? "Import from OneDrive" : "Save to OneDrive"}
    >
      <Layout
        header={
          <DialogHeader
            title={mode === "import" ? "Import from OneDrive" : "Save to OneDrive"}
            onOpenChange={handleOpenChange}
            startContent={
              oneDrive.pathHistory.length > 0 && (
                <Button
                  label="Go back"
                  icon={<ArrowLeft size={20} />}
                  variant="ghost"
                  isIconOnly
                  onClick={oneDrive.navigateBack}
                />
              )
            }
          />
        }
        content={
          <LayoutContent>
          {mode === "save" && (
            <div className="mb-4 p-3 bg-bg-highlight rounded">
              <label htmlFor="onedrive-filename" className="block text-sm text-text-muted mb-1">
                File name
              </label>
              <input
                id="onedrive-filename"
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="document.md"
                className="w-full bg-bg-navbar text-text-invert px-3 py-2 rounded
                           border border-border-settings
                           focus:border-plum focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum"
              />
            </div>
          )}

          {oneDrive.files.length === 0 ? (
            <p className="text-text-muted text-center py-4">
              No files found
            </p>
          ) : (
            <div className="space-y-1">
              {oneDrive.files.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`w-full text-left px-3 py-2 rounded text-text-primary
                             hover:bg-bg-highlight flex items-center gap-2
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum
                             ${selectedFileId === item.id ? "bg-bg-highlight" : ""}`}
                >
                  {item.isFolder ? (
                    <Folder size={16} className="text-text-muted" aria-hidden="true" />
                  ) : (
                    <FileText size={16} className="text-text-muted" aria-hidden="true" />
                  )}
                  <span>{item.name}</span>
                </button>
              ))}
            </div>
          )}
          </LayoutContent>
        }
        footer={
          mode === "save" && (
            <LayoutFooter hasDivider>
              <Button
                label="Save to OneDrive"
                icon={<Save size={18} />}
                variant="primary"
                onClick={handleSave}
                className="w-full bg-plum text-bg-sidebar hover:opacity-90"
              />
            </LayoutFooter>
          )
        }
      />
    </Dialog>
  );
}
