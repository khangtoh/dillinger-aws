"use client";

import { useRef, useCallback, useMemo } from "react";
import { useStore } from "@/stores/store";
import { useToast } from "@/components/ui/Toast";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useExport } from "@/hooks/useExport";
import { importDocumentFile } from "@/lib/import";
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
  Type,
  MoreHorizontal,
} from "lucide-react";

export function Navbar() {
  const toggleSidebar = useStore((state) => state.toggleSidebar);
  const toggleSettings = useStore((state) => state.toggleSettings);
  const togglePreview = useStore((state) => state.togglePreview);
  const previewVisible = useStore((state) => state.previewVisible);
  const toggleToolbar = useStore((state) => state.toggleToolbar);
  const toolbarVisible = useStore((state) => state.toolbarVisible);
  const createImportedDocument = useStore((state) => state.createImportedDocument);
  const insertMarkdownAtCursor = useStore((state) => state.insertMarkdownAtCursor);
  const setZenMode = useStore((state) => state.setZenMode);
  const toggleShortcuts = useStore((state) => state.toggleShortcuts);
  const { notify } = useToast();
  const { upload } = useImageUpload();
  const { handleExport } = useExport();

  const importInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const exportItems = useMemo<DropdownMenuOption[]>(() => [
    { label: "Markdown", icon: FileText, onClick: () => handleExport("markdown") },
    { label: "HTML", icon: FileCode, onClick: () => handleExport("html", { styled: false }) },
    { label: "Styled HTML", icon: FileCode, onClick: () => handleExport("html", { styled: true }) },
    { label: "PDF", icon: FileType, onClick: () => handleExport("pdf") },
  ], [handleExport]);

  const workspaceItems: DropdownMenuOption[] = [
    {
      label: "Import file",
      icon: Upload,
      onClick: () => importInputRef.current?.click(),
    },
    { label: "Export Markdown", icon: FileText, onClick: () => handleExport("markdown") },
    { label: "Export HTML", icon: FileCode, onClick: () => handleExport("html", { styled: false }) },
    { label: "Export Styled HTML", icon: FileCode, onClick: () => handleExport("html", { styled: true }) },
    { label: "Export PDF", icon: FileType, onClick: () => handleExport("pdf") },
    {
      label: previewVisible ? "Hide preview" : "Show preview",
      icon: previewVisible ? EyeOff : Eye,
      onClick: () => togglePreview(),
    },
    { label: "Open settings", icon: Settings, onClick: toggleSettings },
    {
      label: "Insert image",
      icon: ImagePlus,
      onClick: () => imageInputRef.current?.click(),
    },
    {
      label: toolbarVisible ? "Hide formatting toolbar" : "Show formatting toolbar",
      icon: Type,
      onClick: () => toggleToolbar(),
    },
    {
      label: "Enter zen mode",
      icon: Maximize2,
      onClick: () => setZenMode(true),
    },
    {
      label: "Keyboard shortcuts",
      icon: HelpCircle,
      onClick: toggleShortcuts,
    },
  ];

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
    <nav
      aria-label="Editor controls"
      className="relative z-navbar flex min-h-16 items-center justify-between gap-3 border-b border-border-subtle bg-surface px-2.5 sm:px-4"
    >
      <div className="flex min-w-0 shrink items-center gap-2.5">
        <button
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
          className="flex size-9 shrink-0 items-center justify-center rounded-control border border-transparent bg-surface-subtle text-content-muted transition-colors
                     hover:border-border-subtle hover:text-content-strong active:bg-accent-soft
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          <Menu size={19} />
        </button>
        <span
          aria-hidden="true"
          className="flex size-8 shrink-0 items-center justify-center rounded-control bg-accent text-sm font-semibold text-on-accent shadow-low max-[240px]:hidden"
        >
          D
        </span>
        <span className="hidden min-w-0 sm:block">
          <span className="block truncate text-[15px] font-semibold tracking-[-0.02em] text-content-strong">
            Dillinger
          </span>
          <span className="hidden text-[10px] font-medium uppercase tracking-[0.16em] text-content-muted lg:block">
            Writing workspace
          </span>
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
        <Button
          label="Import file"
          icon={<Upload size={18} />}
          variant="ghost"
          onClick={() => importInputRef.current?.click()}
          isIconOnly
          tooltip="Import file"
          className="text-content-muted hover:text-content-strong max-[240px]:hidden"
        />

        <DropdownMenu
          items={exportItems}
          menuLabel="Export as"
          hasChevron={false}
          button={{
            label: "Export document",
            icon: <Download size={18} />,
            variant: "ghost",
            "aria-label": "Export document",
            className: "text-content-muted hover:text-content-strong max-[240px]:hidden",
            isIconOnly: true,
          }}
        />

        <ToggleButton
          label={previewVisible ? "Hide preview" : "Show preview"}
          icon={<EyeOff size={20} />}
          pressedIcon={<Eye size={20} />}
          isPressed={previewVisible}
          onPressedChange={() => togglePreview()}
          isIconOnly
          tooltip={previewVisible ? "Hide preview" : "Show preview"}
          className="text-content-muted hover:text-content-strong max-[240px]:hidden"
        />

        <Button
          label="Open settings"
          icon={<Settings size={20} />}
          variant="ghost"
          isIconOnly
          onClick={toggleSettings}
          tooltip="Settings"
          className="text-content-muted hover:text-content-strong max-[240px]:hidden"
        />

        <DropdownMenu
          items={workspaceItems}
          hasChevron={false}
          button={{
            label: "More editor actions",
            icon: <MoreHorizontal size={20} />,
            variant: "ghost",
            "aria-label": "More editor actions",
            className: "text-content-muted hover:text-content-strong",
            isIconOnly: true,
          }}
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
