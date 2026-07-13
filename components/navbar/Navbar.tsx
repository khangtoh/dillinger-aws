"use client";

import { useRef, useCallback, useMemo } from "react";
import { useStore } from "@/stores/store";
import { useToast } from "@/components/ui/Toast";
import { useImageUpload } from "@/hooks/useImageUpload";
import { importDocumentFile } from "@/lib/import";
import { SAME_ORIGIN_JSON_HEADERS } from "@/lib/client-request";
import { DropdownMenu, type DropdownMenuOption } from "@/components/astryx/DropdownMenu";
import { Button } from "@astryxdesign/core/Button";
import { ToggleButton } from "@astryxdesign/core/ToggleButton";
import {
  Menu,
  Eye,
  EyeOff,
  Settings,
  Download,
  FileText,
  FileCode,
  FileType,
  Maximize2,
  Upload,
  ImagePlus,
  HelpCircle,
} from "lucide-react";

type ExportFormat = "markdown" | "html" | "pdf";

function getDownloadFilename(response: Response, fallback: string): string {
  const contentDisposition = response.headers.get("Content-Disposition");
  const match = contentDisposition?.match(/filename="?([^"]+)"?/i);
  return match?.[1] || fallback;
}

export function Navbar() {
  const toggleSidebar = useStore((state) => state.toggleSidebar);
  const toggleSettings = useStore((state) => state.toggleSettings);
  const togglePreview = useStore((state) => state.togglePreview);
  const previewVisible = useStore((state) => state.previewVisible);
  const currentDocument = useStore((state) => state.currentDocument);
  const createImportedDocument = useStore((state) => state.createImportedDocument);
  const insertMarkdownAtCursor = useStore((state) => state.insertMarkdownAtCursor);
  const setZenMode = useStore((state) => state.setZenMode);
  const toggleShortcuts = useStore((state) => state.toggleShortcuts);
  const { notify } = useToast();
  const { upload } = useImageUpload();

  const importInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleExport = useCallback(async (
    format: ExportFormat,
    options?: { styled?: boolean }
  ) => {
    if (!currentDocument) return;

    const formatLabel = format === "html" && options?.styled
      ? "styled HTML"
      : format.toUpperCase();

    try {
      notify(`Preparing ${formatLabel}...`);

      const response = await fetch(`/api/export/${format}`, {
        method: "POST",
        headers: SAME_ORIGIN_JSON_HEADERS,
        body: JSON.stringify({
          markdown: currentDocument.body,
          title: currentDocument.title,
          styled: options?.styled,
        }),
      });

      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = getDownloadFilename(
        response,
        `${currentDocument.title}.${format === "markdown" ? "md" : format}`
      );
      a.click();
      URL.revokeObjectURL(url);

      notify(
        format === "html" && options?.styled === true
          ? "Exported as styled HTML"
          : `Exported as ${format.toUpperCase()}`
      );
    } catch (error) {
      if (error instanceof TypeError) {
        notify(`${formatLabel} export failed — check your connection`);
      } else {
        notify(`${formatLabel} export failed — please try again`);
      }
    }
  }, [currentDocument, notify]);

  const exportItems = useMemo<DropdownMenuOption[]>(() => [
    { label: "Markdown", icon: FileText, onClick: () => handleExport("markdown") },
    { label: "HTML", icon: FileCode, onClick: () => handleExport("html", { styled: false }) },
    { label: "Styled HTML", icon: FileCode, onClick: () => handleExport("html", { styled: true }) },
    { label: "PDF", icon: FileType, onClick: () => handleExport("pdf") },
  ], [handleExport]);

  const handleImportSelection = useCallback(async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
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
  }, [createImportedDocument, notify]);

  const handleImageSelection = useCallback(async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    const result = await upload(file);
    if (!result) {
      return;
    }

    insertMarkdownAtCursor(`\n${result.markdown}\n`);
  }, [upload, insertMarkdownAtCursor]);

  return (
    <nav className="h-14 bg-bg-navbar flex items-center justify-between px-4 z-navbar">
      {/* Left side */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
          className="text-text-invert hover:text-plum transition-all active:scale-[0.97]
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum focus-visible:ring-offset-2 focus-visible:ring-offset-bg-navbar rounded"
        >
          <Menu size={24} />
        </button>
        <span className="text-plum font-bold text-xl tracking-wide hidden sm:block">
          DILLINGER
        </span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        <Button
          label="Import file"
          icon={<Upload size={18} />}
          variant="ghost"
          onClick={() => importInputRef.current?.click()}
          tooltip="Import file"
          className="text-text-invert hover:text-plum"
        >
          <span className="hidden sm:inline">Import</span>
        </Button>

        <Button
          label="Insert image"
          icon={<ImagePlus size={18} />}
          variant="ghost"
          onClick={() => imageInputRef.current?.click()}
          tooltip="Insert image"
          className="text-text-invert hover:text-plum"
        >
          <span className="hidden sm:inline">Image</span>
        </Button>

        {/* Export dropdown — migrated to Astryx's DropdownMenu
            (components/astryx/DropdownMenu), proven in Phase 14's spike.
            Replaces the hand-rolled useState/useEffect/ref
            dismissible-panel pattern; open state, Escape, click-outside,
            and focus-return are all handled internally by the
            component's usePopover/useListFocus. */}
        <DropdownMenu
          items={exportItems}
          hasChevron={false}
          button={{
            label: "Export as",
            icon: <Download size={18} />,
            variant: "ghost",
            "aria-label": "Export document",
            className: "text-text-invert hover:text-plum",
          }}
        />

        {/* Preview toggle */}
        <ToggleButton
          label={previewVisible ? "Hide preview" : "Show preview"}
          icon={<EyeOff size={20} />}
          pressedIcon={<Eye size={20} />}
          isPressed={previewVisible}
          onPressedChange={() => togglePreview()}
          isIconOnly
          tooltip={previewVisible ? "Hide preview" : "Show preview"}
          className="text-text-invert hover:text-plum"
        />

        {/* Zen mode */}
        <Button
          label="Enter zen mode"
          icon={<Maximize2 size={20} />}
          variant="ghost"
          isIconOnly
          onClick={() => setZenMode(true)}
          tooltip="Zen mode (⌘⇧Z)"
          className="text-text-invert hover:text-plum"
        />

        {/* Settings */}
        <Button
          label="Open settings"
          icon={<Settings size={20} />}
          variant="ghost"
          isIconOnly
          onClick={toggleSettings}
          tooltip="Settings"
          className="text-text-invert hover:text-plum"
        />

        <Button
          label="Keyboard shortcuts"
          icon={<HelpCircle size={20} />}
          variant="ghost"
          isIconOnly
          onClick={toggleShortcuts}
          tooltip="Keyboard shortcuts (?)"
          className="text-text-invert hover:text-plum"
        />
      </div>

      <input
        ref={importInputRef}
        type="file"
        accept=".md,.markdown,.txt,.html,.htm,text/plain,text/markdown,text/html"
        data-testid="document-import-input"
        className="hidden"
        onChange={handleImportSelection}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        data-testid="image-import-input"
        className="hidden"
        onChange={handleImageSelection}
      />
    </nav>
  );
}
