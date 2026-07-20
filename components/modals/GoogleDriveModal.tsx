"use client";

import { useState, useEffect } from "react";
import { useGoogleDrive } from "@/hooks/useGoogleDrive";
import { useStore } from "@/stores/store";
import { useToast } from "@/components/ui/Toast";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { Button } from "@astryxdesign/core/Button";
import {
  HardDrive,
  ArrowLeft,
  Folder,
  FileText,
  Save,
} from "lucide-react";

type Mode = "import" | "save";

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: Mode;
}

export function GoogleDriveModal({ isOpen, onClose, mode }: GoogleDriveModalProps) {
  const googleDrive = useGoogleDrive();
  const { notify } = useToast();
  const currentDocument = useStore((state) => state.currentDocument);
  const createImportedDocument = useStore((state) => state.createImportedDocument);

  const [newFileName, setNewFileName] = useState("");
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  useEffect(() => {
    if (isOpen && googleDrive.isConnected) {
      googleDrive.fetchFiles("root");
      setNewFileName(currentDocument?.title || "document");
      setSelectedFileId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, googleDrive.isConnected]);

  if (!isOpen) return null;

  const handleItemClick = async (item: { id: string; name: string; isFolder: boolean }) => {
    if (item.isFolder) {
      googleDrive.navigateToFolder(item.id);
    } else if (mode === "import") {
      const file = await googleDrive.fetchFileContent(item.id);
      if (file) {
        createImportedDocument(file.name, file.content);
        notify("File imported from Google Drive");
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
    const success = await googleDrive.saveFile(
      fileName,
      currentDocument.body,
      googleDrive.currentFolderId !== "root" ? googleDrive.currentFolderId : undefined,
      selectedFileId || undefined
    );

    if (success) {
      onClose();
    }
  };

  // Not connected state
  if (!googleDrive.isConnected) {
    return (
      <Dialog isOpen onOpenChange={handleOpenChange} width={448} aria-label="Connect to Google Drive">
        <Layout
          header={<DialogHeader title="Connect to Google Drive" onOpenChange={handleOpenChange} />}
          content={
            <LayoutContent>
              <div className="rounded-panel border border-border-subtle bg-surface-subtle px-6 py-8 text-center">
                <HardDrive size={48} className="mx-auto mb-4 rounded-panel bg-accent-soft p-3 text-accent" aria-hidden="true" />
                <p className="text-content-muted mb-6">
                  Connect your Google Drive account to import and save markdown files.
                </p>
                <Button
                  label="Connect Google Drive"
                  variant="primary"
                  onClick={googleDrive.connect}
                  className="bg-accent text-on-accent hover:opacity-90"
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
      aria-label={mode === "import" ? "Import from Google Drive" : "Save to Google Drive"}
    >
      <Layout
        header={
          <DialogHeader
            title={mode === "import" ? "Import from Google Drive" : "Save to Google Drive"}
            onOpenChange={handleOpenChange}
            startContent={
              googleDrive.pathHistory.length > 0 && (
                <Button
                  label="Go back"
                  icon={<ArrowLeft size={20} />}
                  variant="ghost"
                  isIconOnly
                  onClick={googleDrive.navigateBack}
                />
              )
            }
          />
        }
        content={
          <LayoutContent>
          {mode === "save" && (
            <div className="mb-4 p-3 bg-surface-subtle rounded-control">
              <label htmlFor="google-drive-filename" className="block text-sm text-content-muted mb-1">
                File name
              </label>
              <input
                id="google-drive-filename"
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="document.md"
                className="w-full bg-surface text-content-strong px-3 py-2 rounded-control
                           border border-border-control
                           focus:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              />
            </div>
          )}

          {googleDrive.files.length === 0 ? (
            <p className="text-content-muted text-center py-4">
              No files found
            </p>
          ) : (
            <div className="space-y-1">
              {googleDrive.files.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`w-full text-left px-3 py-2 rounded-control text-content-strong
                             hover:bg-surface-subtle flex items-center gap-2
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
                             ${selectedFileId === item.id ? "bg-surface-subtle" : ""}`}
                >
                  {item.isFolder ? (
                    <Folder size={16} className="text-content-muted" aria-hidden="true" />
                  ) : (
                    <FileText size={16} className="text-content-muted" aria-hidden="true" />
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
                label="Save to Google Drive"
                icon={<Save size={18} />}
                variant="primary"
                onClick={handleSave}
                className="w-full bg-accent text-on-accent hover:opacity-90"
              />
            </LayoutFooter>
          )
        }
      />
    </Dialog>
  );
}
