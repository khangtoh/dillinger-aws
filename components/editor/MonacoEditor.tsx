"use client";

import { useRef, useCallback, useEffect, useMemo, useState } from "react";
import Editor, { loader, OnMount, OnChange } from "@monaco-editor/react";
import * as Monaco from "monaco-editor/esm/vs/editor/editor.main.js";
import "monaco-editor/esm/vs/basic-languages/markdown/markdown.contribution";
import { useStore } from "@/stores/store";
import { countDocumentStats } from "@/lib/document";
import { useImageUpload } from "@/hooks/useImageUpload";
import { astryxColorTokens } from "@/lib/theme/tokens";

// Keep Monaco inside the owned application bundle. The default loader reaches
// for a public CDN, which violates the production CSP and can flash unthemed UI.
loader.config({ monaco: Monaco });

export function MonacoEditor() {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const keybindingRef = useRef<{ dispose: () => void } | null>(null);
  const keybindingStatusRef = useRef<HTMLDivElement>(null);
  const currentDocument = useStore((state) => state.currentDocument);
  const enableNightMode = useStore((state) => state.settings.enableNightMode);
  const themeMode = useStore((state) => state.settings.theme);
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);
  const [editorReady, setEditorReady] = useState(false);
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

  useEffect(() => {
    if (themeMode !== "system") {
      setSystemPrefersDark(false);
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = (event: MediaQueryListEvent | MediaQueryList) => {
      setSystemPrefersDark(event.matches);
    };

    update(media);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [themeMode]);

  const useDarkEditor =
    enableNightMode || themeMode === "dark" || systemPrefersDark;

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
    setEditorReady(true);

    const light = 0;
    const dark = 1;
    const monacoToken = (
      name: keyof typeof astryxColorTokens,
      mode: typeof light | typeof dark
    ) => astryxColorTokens[name][mode].replace("#", "");

    monaco.editor.defineTheme("dillinger-workspace-light", {
      base: "vs",
      inherit: true,
      rules: [
        { token: "keyword.md", foreground: monacoToken("--color-text-primary", light), fontStyle: "bold" },
        { token: "string.link.md", foreground: monacoToken("--color-text-accent", light) },
        { token: "variable.md", foreground: monacoToken("--color-text-primary", light) },
        { token: "markup.heading", foreground: monacoToken("--color-text-primary", light), fontStyle: "bold" },
        { token: "comment.md", foreground: monacoToken("--color-success", light) },
      ],
      colors: {
        "editor.background": astryxColorTokens["--color-background-surface"][light],
        "editor.foreground": astryxColorTokens["--color-text-primary"][light],
      },
    });

    monaco.editor.defineTheme("dillinger-workspace-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "keyword.md", foreground: monacoToken("--color-text-primary", dark), fontStyle: "bold" },
        { token: "string.link.md", foreground: monacoToken("--color-text-accent", dark) },
        { token: "variable.md", foreground: monacoToken("--color-text-primary", dark) },
        { token: "markup.heading", foreground: monacoToken("--color-text-primary", dark), fontStyle: "bold" },
        { token: "comment.md", foreground: monacoToken("--color-success", dark) },
      ],
      colors: {
        "editor.background": astryxColorTokens["--color-background-surface"][dark],
        "editor.foreground": astryxColorTokens["--color-text-primary"][dark],
      },
    });

    editor.updateOptions({
      theme: useDarkEditor ? "dillinger-workspace-dark" : "dillinger-workspace-light",
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
  }, [editorReady, keybindings]);

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
  }, [editorReady, enableScrollSync, setEditorScrollPercent, setEditorTopLine]);

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
  }, [editorReady, uploadFromClipboard]);

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
      fontFamily: 'var(--font-geist-mono), Consolas, monospace',
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
      <div className="flex items-center justify-center h-full bg-canvas text-content-muted">
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
          theme={useDarkEditor ? "dillinger-workspace-dark" : "dillinger-workspace-light"}
          value={currentDocument.body}
          onChange={handleChange}
          onMount={handleMount}
          options={editorOptions}
        />
      </div>
      <div className="flex min-h-10 items-center justify-between border-t border-border-subtle bg-canvas px-4 py-2 text-xs text-content-muted">
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
