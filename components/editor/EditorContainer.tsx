"use client";

import { useEffect, useState, useCallback, memo } from "react";
import dynamic from "next/dynamic";
import { BookOpen, FilePenLine, GripVertical, Upload, X } from "lucide-react";
import { Navbar } from "@/components/navbar/Navbar";
import { LogoBar } from "@/components/ads/LogoBar";
import { DocumentTitle } from "@/components/editor/DocumentTitle";
import { MonacoEditor } from "@/components/editor/MonacoEditor";
import { FormattingToolbar } from "@/components/editor/FormattingToolbar";
import { MarkdownPreview } from "@/components/preview/MarkdownPreview";
import { SettingsModal } from "@/components/modals/SettingsModal";
import { KeyboardShortcuts } from "@/components/ui/KeyboardShortcuts";
import { CommandPaletteRoot } from "@/components/editor/CommandPaletteRoot";
import { useToast } from "@/components/ui/Toast";
import { useStore } from "@/stores/store";
import { EditorSkeleton } from "@/components/ui/Skeleton";
import { useImageUpload } from "@/hooks/useImageUpload";
import { importDocumentFile } from "@/lib/import";

const Sidebar = dynamic(
  () => import("@/components/sidebar/Sidebar").then((mod) => mod.Sidebar),
  { ssr: false }
);

const DropZoneOverlay = memo(function DropZoneOverlay({
  isDragging,
}: {
  isDragging: boolean;
}) {
  if (!isDragging) return null;

  return (
    <div
      className="absolute inset-0 z-modal flex items-center justify-center bg-overlay p-4 backdrop-blur-sm"
      aria-hidden="true"
    >
      <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-page border border-border-control bg-surface px-6 py-10 text-center shadow-high">
        <div className="flex size-16 items-center justify-center rounded-panel bg-accent-soft text-accent">
          <Upload size={30} />
        </div>
        <div>
          <p className="text-lg font-semibold tracking-[-0.02em] text-content-strong">
            Drop to add to your workspace
          </p>
          <p className="mt-1 text-sm text-content-muted">
            Markdown, HTML, text, and image files are supported.
          </p>
        </div>
      </div>
    </div>
  );
});

function EditorContent() {
  const previewVisible = useStore((state) => state.previewVisible);
  const currentDocument = useStore((state) => state.currentDocument);
  const createImportedDocument = useStore((state) => state.createImportedDocument);
  const insertMarkdownAtCursor = useStore((state) => state.insertMarkdownAtCursor);
  const zenMode = useStore((state) => state.zenMode);
  const setZenMode = useStore((state) => state.setZenMode);
  const isDirty = useStore((state) => state.isDirty);
  const shortcutsOpen = useStore((state) => state.shortcutsOpen);
  const toggleShortcuts = useStore((state) => state.toggleShortcuts);
  const toggleCommandPalette = useStore((state) => state.toggleCommandPalette);
  const { notify } = useToast();
  const { upload } = useImageUpload();

  const [isDragging, setIsDragging] = useState(false);
  const [, setDragCounter] = useState(0);
  const [mobilePane, setMobilePane] = useState<"write" | "preview">("write");

  useEffect(() => {
    if (!previewVisible && mobilePane === "preview") {
      setMobilePane("write");
    }
  }, [mobilePane, previewVisible]);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      setDragCounter(0);

      const files = e.dataTransfer.files;
      if (files.length === 0) return;

      const file = files[0];
      const isImage = file.type.startsWith("image/");

      if (isImage) {
        const result = await upload(file);
        if (result) {
          insertMarkdownAtCursor(`\n${result.markdown}\n`);
        }
        return;
      }

      try {
        const imported = await importDocumentFile(file);
        createImportedDocument(file.name, imported.body);
        notify(`Imported "${file.name}"`);
      } catch (error) {
        notify(
          error instanceof Error
            ? error.message
            : "Failed to import file"
        );
      }
    },
    [createImportedDocument, insertMarkdownAtCursor, notify, upload]
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((prev) => prev + 1);
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter((prev) => {
      const newCounter = prev - 1;
      if (newCounter === 0) {
        setIsDragging(false);
      }
      return newCounter;
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "z") {
        e.preventDefault();
        setZenMode(!zenMode);
      }
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === "k") {
        e.preventDefault();
        toggleCommandPalette();
      }
      if (e.key === "Escape" && zenMode) {
        setZenMode(false);
      }
      if (
        e.key === "?" &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !document.querySelector(".monaco-editor")?.contains(e.target as Node)
      ) {
        toggleShortcuts();
      }
    };

    document.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => document.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [zenMode, setZenMode, toggleShortcuts, toggleCommandPalette]);

  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  if (!currentDocument) {
    return <EditorSkeleton />;
  }

  if (zenMode) {
    return (
      <div
        className="relative flex h-dvh items-center justify-center bg-canvas animate-fade-in"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <DropZoneOverlay isDragging={isDragging} />

        <div className="flex h-full w-full max-w-5xl flex-col px-3 py-3 sm:px-8 sm:py-6">
          <header className="mb-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-content-muted">
                Focus mode
              </p>
              <h1 className="truncate text-sm font-semibold text-content-strong">
                {currentDocument.title}
              </h1>
            </div>
            <button
              onClick={() => setZenMode(false)}
              className="flex min-h-9 items-center gap-2 rounded-control border border-border-subtle bg-surface px-3 text-xs font-medium text-content-muted shadow-low
                         transition-colors hover:border-border-control hover:text-content-strong
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              aria-label="Exit zen mode"
            >
              <X size={16} />
              <span className="hidden sm:inline">Exit focus</span>
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-hidden rounded-panel border border-border-subtle bg-surface shadow-medium">
            <MonacoEditor />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative flex h-dvh overflow-hidden bg-canvas text-content-strong animate-fade-in"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <DropZoneOverlay isDragging={isDragging} />

      <Sidebar />

      <main className="flex min-w-0 flex-1 flex-col bg-canvas">
        <Navbar />
        <DocumentTitle />

        {previewVisible && (
          <div
            role="tablist"
            aria-label="Workspace panes"
            className="grid grid-cols-2 gap-1 border-b border-border-subtle bg-surface px-3 py-2 sm:hidden"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mobilePane === "write"}
              aria-controls="editor-workspace-pane"
              onClick={() => setMobilePane("write")}
              className={`rounded-control px-3 py-2 text-xs font-semibold transition-colors ${
                mobilePane === "write"
                  ? "bg-accent-soft text-content-accent"
                  : "text-content-muted hover:bg-surface-subtle hover:text-content-strong"
              }`}
            >
              Write
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mobilePane === "preview"}
              aria-controls="preview-workspace-pane"
              onClick={() => setMobilePane("preview")}
              className={`rounded-control px-3 py-2 text-xs font-semibold transition-colors ${
                mobilePane === "preview"
                  ? "bg-accent-soft text-content-accent"
                  : "text-content-muted hover:bg-surface-subtle hover:text-content-strong"
              }`}
            >
              Preview
            </button>
          </div>
        )}

        <div className="min-h-0 flex-1 p-2 sm:p-3 lg:p-4">
          <div className="flex h-full min-h-0 overflow-hidden rounded-panel border border-border-subtle bg-surface shadow-low">
            <section
              id="editor-workspace-pane"
              role="tabpanel"
              aria-label="Markdown editor"
              className={`min-h-0 min-w-0 flex-col bg-surface ${
                previewVisible
                  ? `${mobilePane === "write" ? "flex" : "hidden"} w-full sm:flex sm:w-1/2`
                  : "flex w-full"
              }`}
            >
              <div className="flex min-h-10 items-center justify-between border-b border-border-subtle bg-surface-subtle px-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-content-strong">
                  <FilePenLine aria-hidden="true" size={14} className="text-content-accent" />
                  Markdown
                </div>
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-content-muted">
                  Editor
                </span>
              </div>
              <FormattingToolbar />
              <div className="min-h-0 flex-1">
                <MonacoEditor />
              </div>
            </section>

            {previewVisible && (
              <section
                id="preview-workspace-pane"
                role="tabpanel"
                aria-label="Rendered preview"
                className={`relative min-h-0 w-full min-w-0 flex-col border-border-subtle bg-surface sm:w-1/2 sm:border-l ${
                  mobilePane === "preview" ? "flex" : "hidden sm:flex"
                }`}
              >
                <span
                  aria-hidden="true"
                  className="absolute -left-2 top-1/2 z-editor hidden size-4 -translate-y-1/2 items-center justify-center rounded-full border border-border-subtle bg-surface text-content-muted shadow-low sm:flex"
                >
                  <GripVertical size={10} />
                </span>
                <div className="flex min-h-10 items-center justify-between border-b border-border-subtle bg-surface-subtle px-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-content-strong">
                    <BookOpen aria-hidden="true" size={14} className="text-content-accent" />
                    Preview
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-content-muted">
                    Live
                  </span>
                </div>
                <div className="min-h-0 flex-1">
                  <MarkdownPreview />
                </div>
              </section>
            )}
          </div>
        </div>
        <LogoBar />
      </main>

      <SettingsModal />
      <KeyboardShortcuts isOpen={shortcutsOpen} onClose={toggleShortcuts} />
      <CommandPaletteRoot />
    </div>
  );
}

export function EditorContainer() {
  return <EditorContent />;
}
