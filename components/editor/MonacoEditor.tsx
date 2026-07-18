"use client";

import { useRef, useCallback, useEffect, useMemo } from "react";
import Editor, { OnMount, OnChange } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import { useStore } from "@/stores/store";
import { useResolvedTheme } from "@/components/providers/ThemeProvider";
import { countDocumentStats } from "@/lib/document";
import { useImageUpload } from "@/hooks/useImageUpload";

export function MonacoEditor() {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const keybindingRef = useRef<{ dispose: () => void } | null>(null);
  const keybindingStatusRef = useRef<HTMLDivElement>(null);
  const currentDocument = useStore((state) => state.currentDocument);
  const resolvedTheme = useResolvedTheme();
  const isDarkTheme = resolvedTheme === "dark";
  const enableAutoSave = useStore((state) => state.settings.enableAutoSave);
  const tabSize = useStore((state) => state.settings.tabSize);
  const keybindings = useStore((state) => state.settings.keybindings);
  const enableScrollSync = useStore((state) => state.settings.enableScrollSync);
  const enableWordsCount = useStore((state) => state.settings.enableWordsCount);
  const enableCharactersCount = useStore((state) => state.settings.enableCharactersCount);
  const updateDocumentBody = useStore((state) => state.updateDocumentBody);
  const persist = useStore((state) => state.persist);
  const setEditorScrollPercent = useStore((state) => state.setEditorScrollPercent);
  const setEditorTopLine = useStore((state) => state.setEditorTopLine);
  const setEditorInstance = useStore((state) => state.setEditorInstance);
  const { uploadFromClipboard } = useImageUpload();

  const keybindingLabel =
    keybindings === "vim"
      ? "Vim"
      : keybindings === "emacs"
        ? "Emacs"
        : "Default";

  // Debounced persist for auto-save
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    setEditorInstance(editor);

    // Colors mirror the Phase 14 semantic tokens (app/globals.css) — Monaco's
    // defineTheme API needs literal hex, so these are the resolved values of
    // --color-text-primary/-secondary/-bg-canvas/-accent per mode, not a
    // second independent palette. Highlight colors preserve the alpha ratios
    // Phase 13 tuned for visibility (spec/13-editor-selection-highlight-bug.md)
    // against the new accent instead of the retired plum (#35D7BB).
    monaco.editor.defineTheme("dillinger-light", {
      base: "vs",
      inherit: true,
      rules: [
        { token: "keyword.md", foreground: "18181B", fontStyle: "bold" },
        { token: "string.link.md", foreground: "18181B" },
        { token: "variable.md", foreground: "18181B" },
        { token: "markup.heading", foreground: "18181B", fontStyle: "bold" },
        { token: "comment.md", foreground: "236e24" },
      ],
      colors: {
        "editor.background": "#FFFFFF",
        "editor.foreground": "#18181B",
        "editor.selectionHighlightBackground": "#6C5CE733",
        "editor.selectionHighlightBorder": "#6C5CE780",
        "editor.wordHighlightBackground": "#6C5CE726",
        "editor.wordHighlightBorder": "#6C5CE766",
        "editor.wordHighlightStrongBackground": "#6C5CE740",
        "editor.wordHighlightStrongBorder": "#6C5CE799",
      },
    });

    monaco.editor.defineTheme("dillinger-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "keyword.md", foreground: "FAFAFA", fontStyle: "bold" },
        { token: "string.link.md", foreground: "A1A1AA" },
        { token: "variable.md", foreground: "FAFAFA" },
        { token: "markup.heading", foreground: "FAFAFA", fontStyle: "bold" },
        { token: "comment.md", foreground: "6A9955" },
      ],
      colors: {
        "editor.background": "#111113",
        "editor.foreground": "#FAFAFA",
        "editor.selectionHighlightBackground": "#8174F040",
        "editor.selectionHighlightBorder": "#8174F099",
        "editor.wordHighlightBackground": "#8174F02E",
        "editor.wordHighlightBorder": "#8174F073",
        "editor.wordHighlightStrongBackground": "#8174F04D",
        "editor.wordHighlightStrongBorder": "#8174F0B3",
      },
    });

    editor.updateOptions({
      theme: isDarkTheme ? "dillinger-dark" : "dillinger-light",
    });

    editor.focus();
  };

  useEffect(() => {
    return () => {
      keybindingRef.current?.dispose();
      setEditorInstance(null);
    };
  }, [setEditorInstance]);

  useEffect(() => {
    const editor = editorRef.current;
    const statusNode = keybindingStatusRef.current;
    if (!editor || !statusNode) return;

    keybindingRef.current?.dispose();
    keybindingRef.current = null;
    statusNode.textContent = "";

    let cancelled = false;

    const initializeKeybinding = async () => {
      if (keybindings === "vim") {
        const { initVimMode } = await import("monaco-vim");
        if (cancelled) return;
        keybindingRef.current = initVimMode(editor, statusNode);
        return;
      }

      if (keybindings === "emacs") {
        statusNode.textContent = "Unavailable in build";
      }
    };

    void initializeKeybinding();

    return () => {
      cancelled = true;
      keybindingRef.current?.dispose();
      keybindingRef.current = null;
      if (statusNode) {
        statusNode.textContent = "";
      }
    };
  }, [keybindings]);

  // Set up scroll sync listener (recreates when settings change)
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const disposable = editor.onDidScrollChange(() => {
      if (enableScrollSync) {
        const scrollTop = editor.getScrollTop();
        const scrollHeight = editor.getScrollHeight() - editor.getLayoutInfo().height;
        const percent = scrollHeight > 0 ? scrollTop / scrollHeight : 0;
        setEditorScrollPercent(percent);
        setEditorTopLine(editor.getVisibleRanges()[0]?.startLineNumber || 1);
      }
    });

    return () => disposable.dispose();
  }, [enableScrollSync, setEditorScrollPercent, setEditorTopLine]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const domNode = editor.getDomNode();
    if (!domNode) return;

    const handlePaste = async (event: ClipboardEvent) => {
      if (!event.clipboardData?.items) return;

      const result = await uploadFromClipboard(event.clipboardData.items);
      if (!result) return;

      event.preventDefault();

      const selection = editor.getSelection();
      if (!selection) return;

      editor.executeEdits("dillinger-image-paste", [
        {
          range: selection,
          text: `\n${result.markdown}\n`,
          forceMoveMarkers: true,
        },
      ]);
      editor.focus();
    };

    domNode.addEventListener("paste", handlePaste);
    return () => domNode.removeEventListener("paste", handlePaste);
  }, [uploadFromClipboard]);

  const handleChange: OnChange = useCallback(
    (value: string | undefined) => {
      if (value === undefined) return;

      updateDocumentBody(value);

      // Debounced auto-save
      if (enableAutoSave) {
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }
        debounceRef.current = setTimeout(() => {
          persist();
        }, 2000);
      }
    },
    [updateDocumentBody, persist, enableAutoSave]
  );

  const editorOptions = useMemo(
    () => ({
      fontSize: 14,
      fontFamily: '"Ubuntu Mono", Monaco, monospace',
      lineHeight: 24,
      wordWrap: "on" as const,
      minimap: { enabled: false },
      lineNumbers: "off" as const,
      folding: false,
      tabSize: tabSize,
      scrollBeyondLastLine: false,
      automaticLayout: true,
      padding: { top: 16, bottom: 16 },
      renderLineHighlight: "none" as const,
      overviewRulerLanes: 0,
      hideCursorInOverviewRuler: true,
      selectionHighlight: true,
      occurrencesHighlight: "singleFile" as const,
      scrollbar: {
        vertical: "auto" as const,
        horizontal: "auto" as const,
      },
    }),
    [tabSize]
  );

  const stats = useMemo(
    () => countDocumentStats(currentDocument?.body ?? ""),
    [currentDocument?.body]
  );

  if (!currentDocument) {
    return (
      <div className="flex items-center justify-center h-full bg-bg-canvas text-text-secondary">
        No document selected
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1" data-testid="editor-pane">
        <Editor
          height="100%"
          language="markdown"
          theme={isDarkTheme ? "dillinger-dark" : "dillinger-light"}
          value={currentDocument.body}
          onChange={handleChange}
          onMount={handleMount}
          options={editorOptions}
        />
      </div>
      <div className="flex min-h-10 items-center justify-between border-t border-border-subtle/60 bg-bg-canvas px-4 py-2 text-xs text-text-secondary">
        <div className="flex items-center gap-3">
          {enableWordsCount && (
            <span data-testid="word-count">{stats.wordCount} words</span>
          )}
          {enableWordsCount && enableCharactersCount && (
            <span aria-hidden="true">·</span>
          )}
          {enableCharactersCount && (
            <span data-testid="character-count">{stats.characterCount} characters</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span data-testid="keybinding-mode">{keybindingLabel}</span>
          <div
            ref={keybindingStatusRef}
            className="min-h-4 min-w-12 text-right text-accent"
          />
        </div>
      </div>
    </div>
  );
}
