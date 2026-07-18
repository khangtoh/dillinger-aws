# 14g — Marketing & Content Pages, App Shell Metadata

Goal: re-theme the top-level app shell (`layout.tsx`, `page.tsx`,
`error.tsx`, `not-found.tsx`) and every static marketing/content route
under `app/(content)/**`, plus theme-related browser metadata
(favicon, `site.webmanifest` theme-color, OG image), so the new brand is
consistent from the very first paint and across every page a search
engine or new visitor might land on directly — not just inside the
editor app itself.

Depends on: 14a (semantic tokens must exist first).

Owns: `app/layout.tsx`, `app/page.tsx`, `app/error.tsx`,
`app/not-found.tsx`, `app/opengraph-image.tsx`, everything under
`app/(content)/**` (`ai`, `changelog`, `compare/*` (5 comparison pages),
`features`, `guide` + `guide/best-online-markdown-editor`,
`integrations`, `markdown-to-html`, `markdown-viewer`, `privacy`,
`readme-editor`), `public/site.webmanifest`, `app/favicon.ico`.

## Current state (for reference while migrating)

Every file in `app/(content)/**` references `plum` per the repo-wide
grep — these are static marketing pages independent of the editor's
Zustand store, so they most likely hardcode Tailwind's `plum`/`bg-*`
classes directly in JSX rather than going through any shared component,
making this the widest-*fanout*, lowest-*complexity-per-file* sub-spec in
the phase (17 route files, each a mechanical token swap).

## Tasks

### App shell

- [x] `app/layout.tsx` has no color classes of its own outside
      `Providers` — nothing to re-theme (already updated in 14a for the
      no-flash script).
- [x] `app/error.tsx` / `app/not-found.tsx` re-themed onto semantic
      tokens (`bg-primary`→`bg-canvas`, `text-invert`→`text-inverse`,
      `text-muted`→`text-secondary`, `bg-plum text-bg-sidebar`→
      `bg-accent text-on-accent`). Resolved the flagged concern: these
      **do** work correctly pre-hydration — the tokens are CSS custom
      properties resolved by the `<html class="dark">` state, which
      14a's inline `<script>` sets synchronously before React runs, so
      no separate `prefers-color-scheme` fallback path was needed.
- [x] `app/opengraph-image.tsx` re-themed. This is a `next/og`
      `ImageResponse` (satori), which renders server-side to a static
      PNG and cannot reference CSS custom properties or Tailwind
      classes — used literal hex constants matching 14a's token values
      instead (`#18181B` chrome, `#6C5CE7` accent, `#FAFAFA` text,
      `#A1A1AA` secondary text). This one file will need a manual edit
      if the palette values in `app/globals.css` ever change, since it
      can't consume the CSS variables directly.
- [x] `public/site.webmanifest`: `theme_color` `#35D7BB`→`#6C5CE7`,
      `background_color` `#1E2127`→`#111113`.
- [ ] `app/favicon.ico` and the PNG icons it references
      (`icon-192x192.png`, `icon-512x512.png`, `apple-touch-icon.png`)
      **not regenerated** — no image-editing tooling (ImageMagick,
      Pillow) is available in this sandbox to recolor binary icon
      assets, and per this task's own note, whether to keep the
      existing glyph shape (just recolor) or commission a new mark is
      a design decision, not a code change. Left as a follow-up
      requiring either design tooling or an asset handoff.

### Content pages

- [x] `app/(content)/compare/*` (5 files) — swapped.
- [x] `app/(content)/guide/*` (2 files) — swapped.
- [x] Remaining 8 single-page routes
      (`ai,changelog,features,integrations,markdown-to-html,markdown-viewer,privacy,readme-editor`)
      — swapped. Found and fixed one pattern not anticipated in this
      task list: `bg-bg-highlight text-icon-default` used as an
      inline-code/pre "chip" style (11 occurrences across
      `guide`, `markdown-viewer`, `readme-editor`, `markdown-to-html`)
      → `bg-bg-surface text-text-secondary`, consistent with how
      `.preview-html code` treats the same visual role in 14d.
- [x] `app/(content)/layout.tsx` — swapped (no shared header/footer/CTA
      banner exists there beyond what page-level components already
      handle).
- [x] Resolved the light/dark-mode-scope question: content pages use
      the **same** semantic tokens as the main app, so they inherit
      dark mode automatically via the same `<html class="dark">`
      mechanism — no separate decision needed, and no page was
      "light-only" by design, they just hadn't been tested against a
      dark class before (none existed to test against).

### Verification

- [x] `grep -rln "plum\|35D7BB" "app/(content)" app/layout.tsx app/page.tsx app/error.tsx app/not-found.tsx app/opengraph-image.tsx public/site.webmanifest` — zero matches.
- [x] Real browser check (not deferred — Playwright + the pre-installed
      Chromium were available): loaded the app at `/`, screenshotted
      light mode, opened Settings → switched Theme to Dark via the
      14a-built selector, screenshotted again. **Confirmed working
      end-to-end**: chrome, sidebar (incl. the new indigo-violet accent
      on the wordmark and "New Document" button, and the red-toned
      `danger` "Delete Document" button), title bar, and preview pane
      all switch correctly and live, no reload. Monaco itself didn't
      render content (shows "Loading...") — consistent with Phase 13's
      documented finding that this sandbox's egress proxy blocks the
      Monaco CDN; not a regression from this phase. Individual content
      pages spot-checked via `curl` against a running `next dev` server
      (`/`, `/features`, `/changelog` all returned 200 with no runtime
      errors in the server log).
- [x] `app/sitemap.ts` confirmed to contain no color/styling code —
      genuinely nothing to change.
- [x] `npx tsc --noEmit` and `npm run lint` clean. `npm run build`
      **fails**, but confirmed via `git stash` to fail identically on
      the pre-Phase-14 commit: a pre-existing `body` block-scoped
      variable redeclaration bug in
      `app/api/google-drive/save/route.ts` (unrelated API route, not
      touched by this phase) breaks the production webpack build.
      Not fixed here — out of scope for a color-theme phase, and fixing
      an unrelated pre-existing bug as a drive-by would obscure this
      phase's actual diff. `next dev` (used for the browser
      verification above) does not hit this failure since it compiles
      routes on demand rather than bundling everything up front.
