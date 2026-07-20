import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {};

export default function ContentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-content-strong">
      <header className="sticky top-0 z-navbar border-b border-border-subtle bg-surface/95 px-4 backdrop-blur sm:px-6">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6">
          <Link href="/" className="group flex min-w-0 items-center gap-3 rounded-control">
            <span className="grid size-9 shrink-0 place-items-center rounded-panel bg-accent text-base font-semibold text-on-accent shadow-low transition-transform group-hover:-translate-y-0.5" aria-hidden="true">
              D
            </span>
            <span className="leading-tight">
              <span className="block text-base font-semibold tracking-tight text-content-strong">Dillinger</span>
              <span className="hidden text-[10px] font-medium uppercase tracking-[0.14em] text-content-muted sm:block">Editorial workspace</span>
            </span>
          </Link>
          <nav className="ml-auto hidden items-center gap-5 text-sm font-medium text-content-muted md:flex" aria-label="Content navigation">
            {[
              ["Features", "/features"],
              ["AI", "/ai"],
              ["Integrations", "/integrations"],
              ["Guide", "/guide"],
              ["Compare", "/compare"],
            ].map(([label, href]) => (
              <Link key={href} href={href} className="rounded-control transition-colors hover:text-accent">
                {label}
              </Link>
            ))}
          </nav>
          <Link
            href="/"
            className="ml-auto inline-flex min-h-10 items-center rounded-control bg-accent px-3.5 text-sm font-semibold text-on-accent shadow-low transition-transform hover:-translate-y-0.5 md:ml-0"
          >
            Open editor
          </Link>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border-subtle bg-surface px-6 py-8 text-sm text-content-muted">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>Dillinger — The last Markdown editor you will ever need.</span>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-content-strong transition-colors">
              Privacy
            </Link>
            <Link href="/changelog" className="hover:text-content-strong transition-colors">
              Changelog
            </Link>
            <a
              href="https://github.com/joemccann/dillinger"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-content-strong transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
