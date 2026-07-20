"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="grid min-h-dvh place-items-center bg-canvas p-5 text-content-strong">
      <main className="w-full max-w-md rounded-panel border border-border-subtle bg-surface p-6 shadow-high sm:p-8">
        <span className="grid size-11 place-items-center rounded-panel bg-danger-soft font-mono text-sm font-bold text-danger" aria-hidden="true">!</span>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.14em] text-danger">Workspace interrupted</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-content-strong text-balance">The editor hit an unexpected problem.</h1>
        <p className="mt-3 leading-relaxed text-content-muted">
          Your local documents are still on this device. Retry the workspace to continue writing.
        </p>
        <button
          onClick={reset}
          className="mt-6 inline-flex min-h-10 items-center rounded-control bg-accent px-4 text-sm font-semibold text-on-accent shadow-low transition-transform hover:-translate-y-0.5"
        >
          Retry workspace
        </button>
        {error.digest && <p className="mt-5 font-mono text-xs text-content-muted">Reference {error.digest}</p>}
      </main>
    </div>
  );
}
