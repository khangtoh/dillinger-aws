"use client";

import { useState, useEffect } from "react";
import { useBitbucket } from "@/hooks/useBitbucket";
import { useStore } from "@/stores/store";
import { useToast } from "@/components/ui/Toast";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { Button } from "@astryxdesign/core/Button";
import {
  GitBranch,
  ArrowLeft,
  Folder,
  FileText,
  Save,
  ChevronDown,
} from "lucide-react";

type Mode = "import" | "save";

interface BitbucketModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: Mode;
}

export function BitbucketModal({ isOpen, onClose, mode }: BitbucketModalProps) {
  const bitbucket = useBitbucket();
  const { notify } = useToast();
  const currentDocument = useStore((state) => state.currentDocument);
  const createImportedDocument = useStore((state) => state.createImportedDocument);

  const [formState, setFormState] = useState({
    newFileName: "",
    commitMessage: "",
    selectedFilePath: null as string | null,
  });

  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  useEffect(() => {
    if (isOpen && bitbucket.isConnected) {
      bitbucket.fetchWorkspaces();
      setFormState({
        newFileName: currentDocument?.title || "document",
        commitMessage: "",
        selectedFilePath: null,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, bitbucket.isConnected]);

  if (!isOpen) return null;

  const handleItemClick = async (item: { path: string; name: string; isFolder: boolean }) => {
    if (item.isFolder) {
      bitbucket.navigateToFolder(item.path);
    } else if (mode === "import") {
      const file = await bitbucket.fetchFileContent(item.path);
      if (file) {
        createImportedDocument(file.name, file.content);
        notify("File imported from Bitbucket");
        onClose();
      }
    } else {
      // Save mode - select file to overwrite
      setFormState((prev) => ({
        ...prev,
        selectedFilePath: item.path,
        newFileName: item.name.replace(/\.md$/, ""),
      }));
    }
  };

  const handleSave = async () => {
    if (!currentDocument) return;

    const fileName = formState.newFileName.endsWith(".md") ? formState.newFileName : `${formState.newFileName}.md`;
    const filePath = formState.selectedFilePath || (bitbucket.currentPath ? `${bitbucket.currentPath}/${fileName}` : fileName);

    const success = await bitbucket.saveFile(
      filePath,
      currentDocument.body,
      formState.commitMessage || `Update ${fileName}`
    );

    if (success) {
      onClose();
    }
  };

  // Not connected state
  if (!bitbucket.isConnected) {
    return (
      <Dialog isOpen onOpenChange={handleOpenChange} width={448} aria-label="Connect to Bitbucket">
        <Layout
          header={<DialogHeader title="Connect to Bitbucket" onOpenChange={handleOpenChange} />}
          content={
            <LayoutContent>
              <div className="rounded-panel border border-border-subtle bg-surface-subtle px-6 py-8 text-center">
                <GitBranch size={48} className="mx-auto mb-4 rounded-panel bg-accent-soft p-3 text-accent" aria-hidden="true" />
                <p className="text-content-muted mb-6">
                  Connect your Bitbucket account to import and save markdown files.
                </p>
                <Button
                  label="Connect Bitbucket"
                  variant="primary"
                  onClick={bitbucket.connect}
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
      aria-label={mode === "import" ? "Import from Bitbucket" : "Save to Bitbucket"}
    >
      <Layout
        header={
          <DialogHeader
            title={mode === "import" ? "Import from Bitbucket" : "Save to Bitbucket"}
            onOpenChange={handleOpenChange}
            startContent={
              bitbucket.pathHistory.length > 0 && (
                <Button
                  label="Go back"
                  icon={<ArrowLeft size={20} />}
                  variant="ghost"
                  isIconOnly
                  onClick={bitbucket.navigateBack}
                />
              )
            }
          />
        }
        content={
          <LayoutContent>
          {/* Selectors */}
          <div className="space-y-3 mb-4">
            {/* Workspace selector */}
            <div className="relative">
              <label htmlFor="workspace" className="block text-sm text-content-muted mb-1">
                Workspace
              </label>
              <div className="relative">
                <select
                  id="workspace"
                  value={bitbucket.selectedWorkspace || ""}
                  onChange={(e) => bitbucket.selectWorkspace(e.target.value)}
                  className="w-full bg-surface-subtle text-content-strong px-3 py-2 rounded-control
                             border border-border-control appearance-none
                             focus:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <option value="">Select workspace</option>
                  {bitbucket.workspaces.map((ws) => (
                    <option key={ws.slug} value={ws.slug}>{ws.name}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-content-muted pointer-events-none" />
              </div>
            </div>

            {/* Repo selector */}
            {bitbucket.selectedWorkspace && (
              <div className="relative">
                <label htmlFor="repo" className="block text-sm text-content-muted mb-1">
                  Repository
                </label>
                <div className="relative">
                  <select
                    id="repo"
                    value={bitbucket.selectedRepo || ""}
                    onChange={(e) => bitbucket.selectRepo(e.target.value)}
                    className="w-full bg-surface-subtle text-content-strong px-3 py-2 rounded-control
                               border border-border-control appearance-none
                               focus:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <option value="">Select repository</option>
                    {bitbucket.repos.map((repo) => (
                      <option key={repo.slug} value={repo.slug}>{repo.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-content-muted pointer-events-none" />
                </div>
              </div>
            )}

            {/* Branch selector */}
            {bitbucket.selectedRepo && (
              <div className="relative">
                <label htmlFor="branch" className="block text-sm text-content-muted mb-1">
                  Branch
                </label>
                <div className="relative">
                  <select
                    id="branch"
                    value={bitbucket.selectedBranch || ""}
                    onChange={(e) => bitbucket.selectBranch(e.target.value)}
                    className="w-full bg-surface-subtle text-content-strong px-3 py-2 rounded-control
                               border border-border-control appearance-none
                               focus:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <option value="">Select branch</option>
                    {bitbucket.branches.map((branch) => (
                      <option key={branch.name} value={branch.name}>{branch.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-content-muted pointer-events-none" />
                </div>
              </div>
            )}
          </div>

          {/* Save mode inputs */}
          {mode === "save" && bitbucket.selectedBranch && (
            <div className="space-y-3 mb-4 p-3 bg-surface-subtle rounded-control">
              <div>
                <label htmlFor="bitbucket-filename" className="block text-sm text-content-muted mb-1">
                  File name
                </label>
                <input
                  id="bitbucket-filename"
                  type="text"
                  value={formState.newFileName}
                  onChange={(e) => setFormState((prev) => ({ ...prev, newFileName: e.target.value }))}
                  placeholder="document.md"
                  className="w-full bg-surface text-content-strong px-3 py-2 rounded-control
                             border border-border-control
                             focus:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                />
              </div>
              <div>
                <label htmlFor="commit-message" className="block text-sm text-content-muted mb-1">
                  Commit message
                </label>
                <input
                  id="commit-message"
                  type="text"
                  value={formState.commitMessage}
                  onChange={(e) => setFormState((prev) => ({ ...prev, commitMessage: e.target.value }))}
                  placeholder="Update document"
                  className="w-full bg-surface text-content-strong px-3 py-2 rounded-control
                             border border-border-control
                             focus:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                />
              </div>
            </div>
          )}

          {/* File list */}
          {bitbucket.selectedBranch && (
            <>
              {bitbucket.files.length === 0 ? (
                <p className="text-content-muted text-center py-4">
                  No files found
                </p>
              ) : (
                <div className="space-y-1">
                  {bitbucket.files.map((item) => (
                    <button
                      key={item.path}
                      onClick={() => handleItemClick(item)}
                      className={`w-full text-left px-3 py-2 rounded-control text-content-strong
                                 hover:bg-surface-subtle flex items-center gap-2
                                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
                                 ${formState.selectedFilePath === item.path ? "bg-surface-subtle" : ""}`}
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
            </>
          )}
          </LayoutContent>
        }
        footer={
          mode === "save" && bitbucket.selectedBranch && (
            <LayoutFooter hasDivider>
              <Button
                label="Save to Bitbucket"
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
