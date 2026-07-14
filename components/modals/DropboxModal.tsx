"use client";

import { useState, useEffect } from "react";
import { useDropbox } from "@/hooks/useDropbox";
import { useStore } from "@/stores/store";
import { useToast } from "@/components/ui/Toast";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { Button } from "@astryxdesign/core/Button";
import {
  Cloud,
  ArrowLeft,
  Folder,
  FileText,
  Save,
} from "lucide-react";

type Mode = "import" | "save";

interface DropboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: Mode;
}

export function DropboxModal({ isOpen, onClose, mode }: DropboxModalProps) {
  const dropbox = useDropbox();
  const { notify } = useToast();
  const currentDocument = useStore((state) => state.currentDocument);
  const createImportedDocument = useStore((state) => state.createImportedDocument);

  const [newFileName, setNewFileName] = useState("");

  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  useEffect(() => {
    if (isOpen && dropbox.isConnected) {
      dropbox.fetchFiles("");
      setNewFileName(currentDocument?.title || "document");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, dropbox.isConnected]);

  if (!isOpen) return null;

  const handleItemClick = async (item: { name: string; path: string; isFolder: boolean }) => {
    if (item.isFolder) {
      dropbox.navigateToFolder(item.path);
    } else if (mode === "import") {
      const file = await dropbox.fetchFileContent(item.path);
      if (file) {
        createImportedDocument(file.name, file.content);
        notify("File imported from Dropbox");
        onClose();
      }
    }
  };

  const handleSave = async () => {
    if (!currentDocument) return;

    const fileName = newFileName.endsWith(".md") ? newFileName : `${newFileName}.md`;
    const path = dropbox.currentPath ? `${dropbox.currentPath}/${fileName}` : `/${fileName}`;

    const success = await dropbox.saveFile(path, currentDocument.body);
    if (success) {
      onClose();
    }
  };

  // Not connected state
  if (!dropbox.isConnected) {
    return (
      <Dialog isOpen onOpenChange={handleOpenChange} width={448} aria-label="Connect to Dropbox">
        <Layout
          header={<DialogHeader title="Connect to Dropbox" onOpenChange={handleOpenChange} />}
          content={
            <LayoutContent>
              <div className="text-center">
                <Cloud size={48} className="mx-auto text-text-primary mb-4" aria-hidden="true" />
                <p className="text-text-secondary mb-6">
                  Connect your Dropbox account to import and save markdown files.
                </p>
                <Button
                  label="Connect Dropbox"
                  variant="primary"
                  onClick={dropbox.connect}
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
      aria-label={mode === "import" ? "Import from Dropbox" : "Save to Dropbox"}
    >
      <Layout
        header={
          <DialogHeader
            title={mode === "import" ? "Import from Dropbox" : "Save to Dropbox"}
            onOpenChange={handleOpenChange}
            startContent={
              dropbox.pathHistory.length > 0 && (
                <Button
                  label="Go back"
                  icon={<ArrowLeft size={20} />}
                  variant="ghost"
                  isIconOnly
                  onClick={dropbox.navigateBack}
                />
              )
            }
          />
        }
        content={
          <LayoutContent>
        {/* Current path */}
        <div className="px-1 pb-3 text-sm text-text-muted">
          {dropbox.currentPath || "/"}
        </div>

          {mode === "save" && (
            <div className="mb-4 p-3 bg-bg-highlight rounded">
              <label htmlFor="dropbox-filename" className="block text-sm text-text-muted mb-1">
                File name
              </label>
              <input
                id="dropbox-filename"
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

          {dropbox.files.length === 0 ? (
            <p className="text-text-muted text-center py-4">
              No files found
            </p>
          ) : (
            <div className="space-y-1">
              {dropbox.files.map((item) => (
                <button
                  key={item.path}
                  onClick={() => handleItemClick(item)}
                  className="w-full text-left px-3 py-2 rounded text-text-primary
                             hover:bg-bg-highlight flex items-center gap-2
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum"
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
                label="Save to Dropbox"
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
