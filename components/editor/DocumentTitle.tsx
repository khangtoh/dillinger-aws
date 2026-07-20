"use client";

import { useState, useEffect, useCallback } from "react";
import { useStore } from "@/stores/store";
import { Edit2, Check, FileText } from "lucide-react";
import { DEFAULT_DOCUMENT_TITLE } from "@/lib/document";

export function DocumentTitle() {
  const currentDocument = useStore((state) => state.currentDocument);
  const updateDocumentTitle = useStore((state) => state.updateDocumentTitle);
  const isDirty = useStore((state) => state.isDirty);

  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState("");

  useEffect(() => {
    setTitle(currentDocument?.title || "");
  }, [currentDocument?.title]);

  const inputRef = useCallback((node: HTMLInputElement | null) => {
    if (node) {
      node.focus();
      node.select();
    }
  }, []);

  const handleSave = () => {
    if (title.trim()) {
      updateDocumentTitle(title.trim());
    } else {
      setTitle(currentDocument?.title || DEFAULT_DOCUMENT_TITLE);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setTitle(currentDocument?.title || "");
      setIsEditing(false);
    }
  };

  if (!currentDocument) return null;

  return (
    <header className="flex min-h-16 items-center gap-3 border-b border-border-subtle bg-surface px-3 py-2.5 sm:px-5">
      <div
        aria-hidden="true"
        className="hidden size-9 shrink-0 items-center justify-center rounded-control border border-border-subtle bg-surface-subtle text-content-muted sm:flex"
      >
        <FileText size={17} />
      </div>

      {isEditing ? (
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="min-w-0 flex-1">
            <label
              htmlFor="document-title"
              className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-content-muted"
            >
              Document title
            </label>
            <input
              ref={inputRef}
              id="document-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              className="h-9 w-full rounded-control border border-border-control bg-surface px-3 text-sm font-medium text-content-strong shadow-low
                         focus:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            />
          </div>
          <button
            onMouseDown={(event) => event.preventDefault()}
            onClick={handleSave}
            aria-label="Save title"
            className="mt-5 flex size-9 shrink-0 items-center justify-center rounded-control bg-accent text-on-accent transition-colors hover:opacity-90
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            <Check size={17} />
          </button>
        </div>
      ) : (
        <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-content-muted">
              Document
            </p>
            <div className="mt-0.5 flex min-w-0 items-center gap-2">
              <h2 className="truncate text-[15px] font-semibold tracking-[-0.01em] text-content-strong">
                {currentDocument.title || DEFAULT_DOCUMENT_TITLE}
              </h2>
              <button
                onClick={() => setIsEditing(true)}
                aria-label="Edit title"
                title="Rename document"
                className="flex size-7 shrink-0 items-center justify-center rounded-control text-content-muted transition-colors
                           hover:bg-surface-subtle hover:text-content-strong
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                <Edit2 size={14} />
              </button>
            </div>
          </div>
          <span
            aria-live="polite"
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
              isDirty
                ? "bg-warning-soft text-warning"
                : "bg-success-soft text-success"
            }`}
          >
            <span
              aria-hidden="true"
              className={`size-1.5 rounded-full ${isDirty ? "bg-warning" : "bg-success"}`}
            />
            {isDirty ? "Unsaved" : "Saved"}
          </span>
        </div>
      )}
    </header>
  );
}
