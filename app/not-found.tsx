import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center bg-canvas p-5 text-content-strong">
      <main className="w-full max-w-md rounded-panel border border-border-subtle bg-surface p-6 shadow-high sm:p-8">
        <span className="grid size-11 place-items-center rounded-panel bg-accent-muted font-mono text-xs font-bold text-accent" aria-hidden="true">404</span>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.14em] text-accent">Page not found</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-content-strong text-balance">This page is outside the workspace.</h1>
        <p className="mt-3 leading-relaxed text-content-muted">
          Return to your documents and keep writing, or use the content navigation to find another page.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-10 items-center rounded-control bg-accent px-4 text-sm font-semibold text-on-accent shadow-low transition-transform hover:-translate-y-0.5"
        >
          Return to editor
        </Link>
      </main>
    </div>
  );
}
