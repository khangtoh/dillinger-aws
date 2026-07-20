"use client";

import { useReducer, memo, useCallback } from "react";
import { useStore } from "@/stores/store";
import { useToast } from "@/components/ui/Toast";
import { useGitHub } from "@/hooks/useGitHub";
import { useDropbox } from "@/hooks/useDropbox";
import { useGoogleDrive } from "@/hooks/useGoogleDrive";
import { useOneDrive } from "@/hooks/useOneDrive";
import { useBitbucket } from "@/hooks/useBitbucket";
import { DocumentList } from "./DocumentList";
import { GitHubModal } from "@/components/modals/GitHubModal";
import { DropboxModal } from "@/components/modals/DropboxModal";
import { GoogleDriveModal } from "@/components/modals/GoogleDriveModal";
import { OneDriveModal } from "@/components/modals/OneDriveModal";
import { BitbucketModal } from "@/components/modals/BitbucketModal";
import { DeleteConfirmModal } from "@/components/modals/DeleteConfirmModal";
import { Collapsible } from "@astryxdesign/core/Collapsible";
import {
  Plus,
  Save,
  Trash2,
  Github,
  Cloud,
  HardDrive,
  CloudCog,
  GitBranch,
  Plug,
  CloudDownload,
  CloudUpload,
  FileText,
  X,
} from "lucide-react";

type ModalMode = "import" | "save";
type ModalTarget = "github" | "dropbox" | "googleDrive" | "oneDrive" | "bitbucket";

interface SidebarUIState {
  servicesOpen: boolean;
  importOpen: boolean;
  saveOpen: boolean;
  documentsOpen: boolean;
  activeModal: { target: ModalTarget; mode: ModalMode } | null;
  deleteModalOpen: boolean;
}

type SidebarAction =
  | { type: "toggle"; section: "servicesOpen" | "importOpen" | "saveOpen" | "documentsOpen" }
  | { type: "openModal"; target: ModalTarget; mode: ModalMode }
  | { type: "closeModal" }
  | { type: "openDeleteModal" }
  | { type: "closeDeleteModal" };

const initialUIState: SidebarUIState = {
  servicesOpen: false,
  importOpen: false,
  saveOpen: false,
  documentsOpen: true,
  activeModal: null,
  deleteModalOpen: false,
};

function uiReducer(state: SidebarUIState, action: SidebarAction): SidebarUIState {
  switch (action.type) {
    case "toggle":
      return { ...state, [action.section]: !state[action.section] };
    case "openModal":
      return { ...state, activeModal: { target: action.target, mode: action.mode } };
    case "closeModal":
      return { ...state, activeModal: null };
    case "openDeleteModal":
      return { ...state, deleteModalOpen: true };
    case "closeDeleteModal":
      return { ...state, deleteModalOpen: false };
  }
}

export function Sidebar() {
  const sidebarOpen = useStore((state) => state.sidebarOpen);
  const documents = useStore((state) => state.documents);
  const currentDocument = useStore((state) => state.currentDocument);
  const createDocument = useStore((state) => state.createDocument);
  const deleteDocument = useStore((state) => state.deleteDocument);
  const persist = useStore((state) => state.persist);
  const toggleSidebar = useStore((state) => state.toggleSidebar);
  const { notify } = useToast();

  const [ui, dispatch] = useReducer(uiReducer, initialUIState);

  const handleSave = useCallback(() => {
    persist();
    notify("Documents saved");
  }, [persist, notify]);

  const handleDeleteClick = useCallback(() => {
    if (!currentDocument) return;
    if (documents.length <= 1) {
      notify("Cannot delete the last document");
      return;
    }
    dispatch({ type: "openDeleteModal" });
  }, [currentDocument, documents.length, notify]);

  const handleDeleteConfirm = useCallback(() => {
    if (!currentDocument) return;
    deleteDocument(currentDocument.id);
    notify("Document deleted");
    dispatch({ type: "closeDeleteModal" });
  }, [currentDocument, deleteDocument, notify]);

  const closeModal = () => dispatch({ type: "closeModal" });

  return (
    <>
      <div
        className={`fixed inset-0 z-settings bg-overlay backdrop-blur-[1px] transition-opacity duration-250 ease-out-quart sm:hidden
                    ${sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={toggleSidebar}
        aria-hidden="true"
      />
      <aside
        aria-label="Document library"
        aria-hidden={!sidebarOpen}
        inert={!sidebarOpen}
        className={`fixed z-modal flex h-dvh w-sidebar shrink-0 flex-col border-r border-border-subtle bg-surface shadow-high
                    transition-all duration-250 ease-out-quart sm:relative sm:z-sidebar sm:shadow-none
                    ${sidebarOpen ? "translate-x-0" : "-translate-x-full sm:-ml-sidebar sm:translate-x-0"}`}
      >
        <header className="flex min-h-16 items-center gap-3 border-b border-border-subtle px-4">
          <span
            aria-hidden="true"
            className="flex size-9 items-center justify-center rounded-control bg-accent text-sm font-semibold text-on-accent shadow-low"
          >
            D
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-content-muted">
              Workspace
            </p>
            <h2 className="truncate text-[15px] font-semibold tracking-[-0.01em] text-content-strong">
              Library
            </h2>
          </div>
          <button
            onClick={toggleSidebar}
            aria-label="Close sidebar"
            className="flex size-8 items-center justify-center rounded-control text-content-muted transition-colors hover:bg-surface-subtle hover:text-content-strong
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring sm:hidden"
          >
            <X size={17} />
          </button>
        </header>

        <div className="flex items-center justify-between px-4 pb-2 pt-4">
          <p className="text-xs font-medium text-content-strong">Your workspace</p>
          <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-[10px] font-medium text-content-muted">
            {documents.length} {documents.length === 1 ? "document" : "documents"}
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          <CollapsibleSection
            label="Documents"
            panelId="documents-panel"
            icon={<FileText size={14} />}
            isOpen={ui.documentsOpen}
            onToggle={() => dispatch({ type: "toggle", section: "documentsOpen" })}
          >
            <DocumentList />
          </CollapsibleSection>

          <CloudServiceMenu
            label="Import from"
            panelId="import-panel"
            icon={<CloudDownload size={14} />}
            isOpen={ui.importOpen}
            onToggle={() => dispatch({ type: "toggle", section: "importOpen" })}
            onSelect={(target) => dispatch({ type: "openModal", target, mode: "import" })}
          />

          <CloudServiceMenu
            label="Save to"
            panelId="save-panel"
            icon={<CloudUpload size={14} />}
            isOpen={ui.saveOpen}
            onToggle={() => dispatch({ type: "toggle", section: "saveOpen" })}
            onSelect={(target) => dispatch({ type: "openModal", target, mode: "save" })}
          />

          <CollapsibleSection
            label="Services"
            panelId="services-panel"
            icon={<Plug size={14} />}
            isOpen={ui.servicesOpen}
            onToggle={() => dispatch({ type: "toggle", section: "servicesOpen" })}
          >
            <CloudServicesList />
          </CollapsibleSection>
        </nav>

        <div className="border-t border-border-subtle bg-surface px-3 py-3">
          <button
            onClick={createDocument}
            className="flex min-h-10 w-full items-center justify-center gap-2 rounded-control bg-accent px-4 py-2 text-sm font-semibold text-on-accent shadow-low
                       transition-all hover:opacity-90 active:scale-[0.98]
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            <Plus size={17} />
            New Document
          </button>
          <div className="mt-2 flex gap-2">
            <button
              onClick={handleSave}
              className="flex min-h-9 flex-1 items-center justify-center gap-2 rounded-control border border-border-subtle bg-surface px-3 py-2 text-xs font-medium text-content-strong
                         transition-colors hover:border-border-control hover:bg-surface-subtle
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              <Save size={15} />
              Save Session
            </button>
            <button
              onClick={handleDeleteClick}
              disabled={documents.length <= 1}
              aria-label="Delete Document"
              title="Delete document"
              className={`flex size-9 shrink-0 items-center justify-center rounded-control border border-border-subtle text-danger
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring
                         ${
                           documents.length <= 1
                             ? "cursor-not-allowed bg-surface text-content-disabled"
                             : "bg-surface transition-colors hover:border-danger hover:bg-danger-soft"
                         }`}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </aside>

      <GitHubModal
        isOpen={ui.activeModal?.target === "github"}
        onClose={closeModal}
        mode={ui.activeModal?.mode ?? "import"}
      />
      <DropboxModal
        isOpen={ui.activeModal?.target === "dropbox"}
        onClose={closeModal}
        mode={ui.activeModal?.mode ?? "import"}
      />
      <GoogleDriveModal
        isOpen={ui.activeModal?.target === "googleDrive"}
        onClose={closeModal}
        mode={ui.activeModal?.mode ?? "import"}
      />
      <OneDriveModal
        isOpen={ui.activeModal?.target === "oneDrive"}
        onClose={closeModal}
        mode={ui.activeModal?.mode ?? "import"}
      />
      <BitbucketModal
        isOpen={ui.activeModal?.target === "bitbucket"}
        onClose={closeModal}
        mode={ui.activeModal?.mode ?? "import"}
      />
      <DeleteConfirmModal
        isOpen={ui.deleteModalOpen}
        onClose={() => dispatch({ type: "closeDeleteModal" })}
        onConfirm={handleDeleteConfirm}
        documentTitle={currentDocument?.title || ""}
      />
    </>
  );
}

function CollapsibleSection({
  label,
  panelId,
  isOpen,
  onToggle,
  icon,
  children,
}: {
  label: string;
  panelId: string;
  isOpen: boolean;
  onToggle: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-2 rounded-panel border border-border-subtle bg-surface px-1.5 py-1 shadow-low">
      <Collapsible
        trigger={
          <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-content-muted">
            {icon}
            {label}
          </span>
        }
        isOpen={isOpen}
        onOpenChange={() => onToggle()}
      >
        {isOpen && (
          <div id={panelId} className="mt-1.5 space-y-1 border-t border-border-subtle px-0.5 pb-1 pt-2">
            {children}
          </div>
        )}
      </Collapsible>
    </section>
  );
}

const CLOUD_SERVICES: { target: ModalTarget; icon: React.ReactNode; label: string }[] = [
  { target: "github", icon: <Github size={16} />, label: "GitHub" },
  { target: "dropbox", icon: <Cloud size={16} />, label: "Dropbox" },
  { target: "googleDrive", icon: <HardDrive size={16} />, label: "Google Drive" },
  { target: "oneDrive", icon: <CloudCog size={16} />, label: "OneDrive" },
  { target: "bitbucket", icon: <GitBranch size={16} />, label: "Bitbucket" },
];

function CloudServiceMenu({
  label,
  panelId,
  isOpen,
  onToggle,
  onSelect,
  icon,
}: {
  label: string;
  panelId: string;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (target: ModalTarget) => void;
  icon?: React.ReactNode;
}) {
  return (
    <CollapsibleSection label={label} panelId={panelId} isOpen={isOpen} onToggle={onToggle} icon={icon}>
      {CLOUD_SERVICES.map((service) => (
        <button
          key={service.target}
          onClick={() => onSelect(service.target)}
          className="flex w-full items-center gap-2 rounded-control px-2.5 py-2 text-sm text-content-muted transition-colors
                     hover:bg-surface-subtle hover:text-content-strong
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          {service.icon}
          <span>{service.label}</span>
        </button>
      ))}
    </CollapsibleSection>
  );
}

function CloudServicesList() {
  const github = useGitHub();
  const dropbox = useDropbox();
  const googleDrive = useGoogleDrive();
  const oneDrive = useOneDrive();
  const bitbucket = useBitbucket();

  return (
    <>
      <ServiceButton
        icon={<Github size={16} />}
        label="GitHub"
        connected={github.isConnected}
        onConnect={github.connect}
        onDisconnect={github.disconnect}
      />
      <ServiceButton
        icon={<Cloud size={16} />}
        label="Dropbox"
        connected={dropbox.isConnected}
        onConnect={dropbox.connect}
        onDisconnect={dropbox.disconnect}
      />
      <ServiceButton
        icon={<HardDrive size={16} />}
        label="Google Drive"
        connected={googleDrive.isConnected}
        onConnect={googleDrive.connect}
        onDisconnect={googleDrive.disconnect}
      />
      <ServiceButton
        icon={<CloudCog size={16} />}
        label="OneDrive"
        connected={oneDrive.isConnected}
        onConnect={oneDrive.connect}
        onDisconnect={oneDrive.disconnect}
      />
      <ServiceButton
        icon={<GitBranch size={16} />}
        label="Bitbucket"
        connected={bitbucket.isConnected}
        onConnect={bitbucket.connect}
        onDisconnect={bitbucket.disconnect}
      />
    </>
  );
}

const ServiceButton = memo(function ServiceButton({
  icon,
  label,
  connected,
  onConnect,
  onDisconnect,
}: {
  icon: React.ReactNode;
  label: string;
  connected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-control px-2 py-2 text-sm hover:bg-surface-subtle">
      <div className="flex min-w-0 items-center gap-2 text-content-muted">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      {connected ? (
        <button
          onClick={onDisconnect}
          aria-label={`Unlink ${label}`}
          className="rounded-full bg-danger-soft px-2 py-1 text-[10px] font-medium text-danger
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          Unlink
        </button>
      ) : (
        <button
          onClick={onConnect}
          aria-label={`Link ${label}`}
          className="rounded-full bg-accent-soft px-2 py-1 text-[10px] font-medium text-content-accent
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          Link
        </button>
      )}
    </div>
  );
});
