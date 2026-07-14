"use client";

import { useState, useEffect } from "react";
import { useGitHub } from "@/hooks/useGitHub";
import { useStore } from "@/stores/store";
import { useToast } from "@/components/ui/Toast";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { Button } from "@astryxdesign/core/Button";
import {
  Github,
  ChevronRight,
  ArrowLeft,
  Folder,
  FileText,
  Check,
  Save,
} from "lucide-react";

type Step = "orgs" | "repos" | "branches" | "files";
type Mode = "import" | "save";

interface GitHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: Mode;
}

export function GitHubModal({ isOpen, onClose, mode }: GitHubModalProps) {
  const github = useGitHub();
  const { notify } = useToast();
  const currentDocument = useStore((state) => state.currentDocument);
  const createImportedDocument = useStore((state) => state.createImportedDocument);

  const [formState, setFormState] = useState({
    step: "orgs" as Step,
    commitMessage: "",
    newFileName: "",
  });

  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  useEffect(() => {
    if (isOpen && github.isConnected) {
      github.fetchOrgs();
      setFormState({
        step: "orgs",
        commitMessage: "",
        newFileName: currentDocument?.title || "document",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, github.isConnected]);

  if (!isOpen) return null;

  const handleOrgSelect = (org: string) => {
    github.fetchRepos(org);
    setFormState((prev) => ({ ...prev, step: "repos" }));
  };

  const handleRepoSelect = (repo: string) => {
    github.fetchBranches(repo);
    setFormState((prev) => ({ ...prev, step: "branches" }));
  };

  const handleBranchSelect = (branch: string) => {
    github.fetchFiles(branch);
    setFormState((prev) => ({ ...prev, step: "files" }));
  };

  const handleFileSelect = async (path: string) => {
    if (mode === "import") {
      const file = await github.fetchFileContent(path);
      if (file) {
        createImportedDocument(path.split("/").pop() || "Untitled.md", file.content);
        notify("File imported from GitHub");
        onClose();
      }
    } else {
      // For save mode, select the file to overwrite
      github.setCurrent({ path, sha: github.files.find((f) => f.path === path)?.sha });
    }
  };

  const handleSave = async () => {
    if (!currentDocument) return;

    const path = github.current.path || `${formState.newFileName}.md`;
    github.setCurrent({ path });

    const success = await github.saveFile(
      currentDocument.body,
      formState.commitMessage || `Update ${path}`
    );

    if (success) {
      onClose();
    }
  };

  const goBack = () => {
    const backMap: Record<Step, Step> = { repos: "orgs", branches: "repos", files: "branches", orgs: "orgs" };
    setFormState((prev) => ({ ...prev, step: backMap[prev.step] }));
  };

  // Not connected state
  if (!github.isConnected) {
    return (
      <Dialog isOpen onOpenChange={handleOpenChange} width={448} aria-label="Connect to GitHub">
        <Layout
          header={<DialogHeader title="Connect to GitHub" onOpenChange={handleOpenChange} />}
          content={
            <LayoutContent>
              <div className="text-center">
                <Github size={48} className="mx-auto text-text-primary mb-4" aria-hidden="true" />
                <p className="text-text-secondary mb-6">
                  Connect your GitHub account to import and save markdown files.
                </p>
                <Button
                  label="Connect GitHub"
                  variant="primary"
                  onClick={github.connect}
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
      aria-label={mode === "import" ? "Import from GitHub" : "Save to GitHub"}
    >
      <Layout
        header={
          <DialogHeader
            title={mode === "import" ? "Import from GitHub" : "Save to GitHub"}
            onOpenChange={handleOpenChange}
            startContent={
              formState.step !== "orgs" && (
                <Button
                  label="Go back"
                  icon={<ArrowLeft size={20} />}
                  variant="ghost"
                  isIconOnly
                  onClick={goBack}
                />
              )
            }
          />
        }
        content={
          <LayoutContent>
        {/* Breadcrumb */}
        <div className="px-1 pb-3 text-sm text-text-muted flex items-center gap-1">
          {github.current.owner && (
            <>
              <span>{github.current.owner}</span>
              {github.current.repo && (
                <>
                  <ChevronRight size={14} />
                  <span>{github.current.repo}</span>
                </>
              )}
              {github.current.branch && (
                <>
                  <ChevronRight size={14} />
                  <span>{github.current.branch}</span>
                </>
              )}
            </>
          )}
        </div>

          {formState.step === "orgs" && (
            <div className="space-y-1">
              {github.orgs.map((org) => (
                <button
                  key={org.login}
                  onClick={() => handleOrgSelect(org.login)}
                  className="w-full text-left px-3 py-2 rounded text-text-primary
                             hover:bg-bg-highlight flex items-center justify-between"
                >
                  <span>{org.login}</span>
                  <ChevronRight size={16} className="text-text-muted" />
                </button>
              ))}
            </div>
          )}

          {formState.step === "repos" && (
            <div className="space-y-1">
              {github.repos.map((repo) => (
                <button
                  key={repo.name}
                  onClick={() => handleRepoSelect(repo.name)}
                  className="w-full text-left px-3 py-2 rounded text-text-primary
                             hover:bg-bg-highlight flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Folder size={16} className="text-text-muted" />
                    <span>{repo.name}</span>
                    {repo.private && (
                      <span className="text-xs bg-bg-highlight px-1.5 py-0.5 rounded">
                        Private
                      </span>
                    )}
                  </div>
                  <ChevronRight size={16} className="text-text-muted" />
                </button>
              ))}
            </div>
          )}

          {formState.step === "branches" && (
            <div className="space-y-1">
              {github.branches.map((branch) => (
                <button
                  key={branch.name}
                  onClick={() => handleBranchSelect(branch.name)}
                  className="w-full text-left px-3 py-2 rounded text-text-primary
                             hover:bg-bg-highlight flex items-center justify-between"
                >
                  <span>{branch.name}</span>
                  <ChevronRight size={16} className="text-text-muted" />
                </button>
              ))}
            </div>
          )}

          {formState.step === "files" && (
            <div className="space-y-1">
              {mode === "save" && (
                <div className="mb-4 p-3 bg-bg-highlight rounded">
                  <label htmlFor="github-filename" className="block text-sm text-text-muted mb-1">
                    File name
                  </label>
                  <input
                    id="github-filename"
                    type="text"
                    value={formState.newFileName}
                    onChange={(e) => setFormState((prev) => ({ ...prev, newFileName: e.target.value }))}
                    placeholder="document.md"
                    className="w-full bg-bg-navbar text-text-invert px-3 py-2 rounded
                               border border-border-settings
                               focus:border-plum focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum"
                  />
                  <label htmlFor="github-commit-message" className="block text-sm text-text-muted mb-1 mt-3">
                    Commit message
                  </label>
                  <input
                    id="github-commit-message"
                    type="text"
                    value={formState.commitMessage}
                    onChange={(e) => setFormState((prev) => ({ ...prev, commitMessage: e.target.value }))}
                    placeholder="Update document"
                    className="w-full bg-bg-navbar text-text-invert px-3 py-2 rounded
                               border border-border-settings
                               focus:border-plum focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum"
                  />
                </div>
              )}

              {github.files.length === 0 ? (
                <p className="text-text-muted text-center py-4">
                  No markdown files found
                </p>
              ) : (
                github.files.map((file) => (
                  <button
                    key={file.path}
                    onClick={() => handleFileSelect(file.path)}
                    className={`w-full text-left px-3 py-2 rounded text-text-primary
                               hover:bg-bg-highlight flex items-center justify-between
                               ${github.current.path === file.path ? "bg-bg-highlight" : ""}`}
                  >
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-text-muted" />
                      <span>{file.path}</span>
                    </div>
                    {github.current.path === file.path && (
                      <Check size={16} className="text-plum" />
                    )}
                  </button>
                ))
              )}
            </div>
          )}
          </LayoutContent>
        }
        footer={
          mode === "save" && formState.step === "files" && (
            <LayoutFooter hasDivider>
              <Button
                label="Save to GitHub"
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
