"use client";

import { useStore } from "@/stores/store";
import { FileText, Folder } from "lucide-react";

export function DocumentList() {
  const documents = useStore((state) => state.documents);
  const folders = useStore((state) => state.folders);
  const currentDocument = useStore((state) => state.currentDocument);
  const selectDocument = useStore((state) => state.selectDocument);

  const folderNames = new Map(folders.map((folder) => [folder.id, folder.name]));

  return (
    <ul className="max-h-[min(42vh,22rem)] space-y-1 overflow-y-auto pr-1">
      {documents.length === 0 && (
        <li className="rounded-panel border border-dashed border-border-control bg-surface-subtle px-3 py-5 text-center">
          <FileText
            aria-hidden="true"
            size={20}
            className="mx-auto text-content-muted"
          />
          <p className="mt-2 text-xs font-medium text-content-strong">
            No documents yet
          </p>
          <p className="mt-1 text-[11px] leading-4 text-content-muted">
            Create a document to begin writing.
          </p>
        </li>
      )}
      {documents.map((doc) => {
        const isCurrent = currentDocument?.id === doc.id;
        const tags = doc.tags ?? [];
        const folderName = doc.folderId
          ? folderNames.get(doc.folderId)
          : undefined;

        return (
          <li key={doc.id}>
            <button
              onClick={() => selectDocument(doc.id)}
              aria-current={isCurrent ? "page" : undefined}
              className={`group relative flex w-full items-start gap-2.5 overflow-hidden rounded-control px-2.5 py-2.5 text-left text-sm transition-colors ${
                isCurrent
                  ? "bg-surface-subtle text-content-strong"
                  : "text-content-muted hover:bg-surface-subtle hover:text-content-strong"
              }`}
            >
              {isCurrent && (
                <span
                  aria-hidden="true"
                  className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-accent"
                />
              )}
              <span
                aria-hidden="true"
                className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-control border ${
                  isCurrent
                    ? "border-accent bg-accent-soft text-content-accent"
                    : "border-border-subtle bg-surface text-content-muted group-hover:border-border-control"
                }`}
              >
                <FileText size={14} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">
                  {doc.title}
                </span>
                {(folderName || tags.length > 0) && (
                  <span className="mt-1 flex min-w-0 items-center gap-1.5 overflow-hidden text-[10px] text-content-muted">
                    {folderName && (
                      <span className="flex min-w-0 items-center gap-1">
                        <Folder aria-hidden="true" size={10} />
                        <span className="truncate">{folderName}</span>
                      </span>
                    )}
                    {tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="max-w-16 truncate rounded-full bg-accent-soft px-1.5 py-0.5 text-content-accent"
                      >
                        {tag}
                      </span>
                    ))}
                    {tags.length > 2 && (
                      <span aria-label={`${tags.length - 2} more tags`}>
                        +{tags.length - 2}
                      </span>
                    )}
                  </span>
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
