"use client";

import { useMemo } from "react";
import { useStore } from "@/stores/store";
import { useExport } from "@/hooks/useExport";
import { TOOLBAR_ACTIONS } from "@/lib/toolbar-actions";
import { CommandPalette } from "@astryxdesign/core/CommandPalette";
import { createStaticSource, type SearchableItem } from "@astryxdesign/core/Typeahead";

interface Command extends SearchableItem {
  action: () => void;
}

// This palette is also the integration point Phase 17's AI-3 in-editor AI
// actions extend (agent-native command surface, not just a human shortcut)
// — no AI-3 implementation happens here, this phase only builds the palette.
export function CommandPaletteRoot() {
  const isOpen = useStore((state) => state.commandPaletteOpen);
  const toggleCommandPalette = useStore((state) => state.toggleCommandPalette);
  const documents = useStore((state) => state.documents);
  const currentDocument = useStore((state) => state.currentDocument);
  const selectDocument = useStore((state) => state.selectDocument);
  const togglePreview = useStore((state) => state.togglePreview);
  const zenMode = useStore((state) => state.zenMode);
  const setZenMode = useStore((state) => state.setZenMode);
  const toggleSettings = useStore((state) => state.toggleSettings);
  const insertMarkdownAtCursor = useStore((state) => state.insertMarkdownAtCursor);
  const { handleExport } = useExport();

  const commands = useMemo<Command[]>(() => {
    const documentCommands: Command[] = documents
      .filter((doc) => doc.id !== currentDocument?.id)
      .map((doc) => ({
        id: `switch-document-${doc.id}`,
        label: `Switch to ${doc.title}`,
        auxiliaryData: { group: "Documents" },
        action: () => selectDocument(doc.id),
      }));

    const viewCommands: Command[] = [
      {
        id: "toggle-preview",
        label: "Toggle preview",
        auxiliaryData: { group: "View" },
        action: () => togglePreview(),
      },
      {
        id: "toggle-zen-mode",
        label: zenMode ? "Exit zen mode" : "Enter zen mode",
        auxiliaryData: { group: "View" },
        action: () => setZenMode(!zenMode),
      },
    ];

    const exportCommands: Command[] = [
      {
        id: "export-markdown",
        label: "Export as Markdown",
        auxiliaryData: { group: "Export" },
        action: () => handleExport("markdown"),
      },
      {
        id: "export-html",
        label: "Export as HTML",
        auxiliaryData: { group: "Export" },
        action: () => handleExport("html", { styled: false }),
      },
      {
        id: "export-html-styled",
        label: "Export as styled HTML",
        auxiliaryData: { group: "Export" },
        action: () => handleExport("html", { styled: true }),
      },
      {
        id: "export-pdf",
        label: "Export as PDF",
        auxiliaryData: { group: "Export" },
        action: () => handleExport("pdf"),
      },
    ];

    const formattingCommands: Command[] = TOOLBAR_ACTIONS.map((toolbarAction) => ({
      id: `format-${toolbarAction.id}`,
      label: `Insert ${toolbarAction.label}`,
      auxiliaryData: { group: "Format" },
      action: () => insertMarkdownAtCursor(toolbarAction.markdown),
    }));

    const generalCommands: Command[] = [
      {
        id: "open-settings",
        label: "Open settings",
        auxiliaryData: { group: "General" },
        action: () => toggleSettings(),
      },
    ];

    return [
      ...documentCommands,
      ...viewCommands,
      ...exportCommands,
      ...formattingCommands,
      ...generalCommands,
    ];
  }, [
    documents,
    currentDocument?.id,
    selectDocument,
    togglePreview,
    zenMode,
    setZenMode,
    toggleSettings,
    handleExport,
    insertMarkdownAtCursor,
  ]);

  const searchSource = useMemo(() => createStaticSource(commands), [commands]);

  return (
    <CommandPalette
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) toggleCommandPalette();
      }}
      searchSource={searchSource}
      onValueChange={(value) => {
        commands.find((command) => command.id === value)?.action();
      }}
      label="Command palette"
    />
  );
}
