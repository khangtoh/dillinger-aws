"use client";

import { useState, useEffect, useRef } from "react";
import { useOneDrive } from "@/hooks/useOneDrive";
import { useStore } from "@/stores/store";
import { useToast } from "@/components/ui/Toast";
import {
  X,
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
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const [newFileName, setNewFileName] = useState("");
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

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
      <div
        className="fixed inset-0 z-modal flex items-center justify-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onedrive-connect-title"
      >
        <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
        <div className="relative bg-bg-chrome rounded-lg shadow-xl w-full max-w-md p-6">
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 text-text-inverse hover:text-accent rounded
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            <X size={20} />
          </button>

          <div className="text-center">
            <CloudCog size={48} className="mx-auto text-text-inverse mb-4" aria-hidden="true" />
            <h2 id="onedrive-connect-title" className="text-xl font-semibold text-text-inverse mb-2 text-balance">
              Connect to OneDrive
            </h2>
            <p className="text-text-secondary mb-6">
              Connect your OneDrive account to import and save markdown files.
            </p>
            <button
              onClick={oneDrive.connect}
              className="bg-accent text-text-on-accent px-6 py-2 rounded font-medium
                         hover:opacity-90 transition-opacity
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-bg-chrome"
            >
              Connect OneDrive
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-modal flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onedrive-modal-title"
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-bg-chrome rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            {oneDrive.pathHistory.length > 0 && (
              <button
                onClick={oneDrive.navigateBack}
                aria-label="Go back"
                className="text-text-inverse hover:text-accent rounded
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <CloudCog size={24} className="text-text-inverse" aria-hidden="true" />
            <h2 id="onedrive-modal-title" className="text-lg font-semibold text-text-inverse text-balance">
              {mode === "import" ? "Import from OneDrive" : "Save to OneDrive"}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close"
            className="text-text-inverse hover:text-accent rounded
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {mode === "save" && (
            <div className="mb-4 p-3 bg-bg-surface-hover rounded">
              <label htmlFor="onedrive-filename" className="block text-sm text-text-secondary mb-1">
                File name
              </label>
              <input
                id="onedrive-filename"
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="document.md"
                className="w-full bg-bg-chrome text-text-inverse px-3 py-2 rounded
                           border border-border-subtle
                           focus:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              />
            </div>
          )}

          {oneDrive.files.length === 0 ? (
            <p className="text-text-secondary text-center py-4">
              No files found
            </p>
          ) : (
            <div className="space-y-1">
              {oneDrive.files.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`w-full text-left px-3 py-2 rounded text-text-inverse
                             hover:bg-bg-surface-hover flex items-center gap-2
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring
                             ${selectedFileId === item.id ? "bg-bg-selected" : ""}`}
                >
                  {item.isFolder ? (
                    <Folder size={16} className="text-text-secondary" aria-hidden="true" />
                  ) : (
                    <FileText size={16} className="text-text-secondary" aria-hidden="true" />
                  )}
                  <span>{item.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {mode === "save" && (
          <div className="p-4 border-t border-border-subtle">
            <button
              onClick={handleSave}
              className="w-full bg-accent text-text-on-accent py-2 px-4 rounded font-medium
                         hover:opacity-90 transition-opacity flex items-center justify-center gap-2
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-bg-chrome"
            >
              <Save size={18} />
              Save to OneDrive
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
