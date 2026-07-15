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

- [ ] Re-theme `app/layout.tsx`'s root-level chrome (if any exists
      outside `Providers`/`ThemeProvider`, e.g. a `<body>` background
      set outside `globals.css`).
- [ ] Re-theme `app/error.tsx` (the error boundary) and
      `app/not-found.tsx` (404 page) onto the new tokens — these render
      *outside* the normal app shell in failure states, so confirm they
      don't depend on `ThemeProvider` having mounted (they may need a
      `prefers-color-scheme` CSS media query fallback instead of the
      JS-driven `dark` class, since an error boundary can fire before
      hydration completes).
- [ ] Re-theme `app/opengraph-image.tsx` (the dynamically generated
      social-preview image) with the new accent/background colors so
      shared links visually match the new brand.
- [ ] Update `public/site.webmanifest`'s `theme_color` and
      `background_color` fields to the new accent/canvas values (this
      controls the mobile browser chrome color and PWA splash screen).
- [ ] Regenerate `app/favicon.ico` (and any other icon sizes referenced
      by the webmanifest) using the new accent color — coordinate with
      the user on whether a new mark/shape is wanted or just a
      recolor of the existing favicon glyph (recolor is the default per
      the phase README's "no logo/wordmark redesign" non-goal).

### Content pages (mechanical per-page pass — one task per route is
overkill; batch by directory)

- [ ] `app/(content)/compare/*` (5 files: hackmd, markdownlivepreview,
      marklivedit, stackedit, typora) — swap `plum` and any other old
      token references to the new semantic names; these are comparison
      landing pages, likely to include colored CTAs/badges that should
      now use `accent`.
- [ ] `app/(content)/guide/*` (2 files: `guide/page.tsx`,
      `guide/best-online-markdown-editor/page.tsx`) — same mechanical
      swap.
- [ ] `app/(content)/{ai,changelog,features,integrations,markdown-to-html,markdown-viewer,privacy,readme-editor}/page.tsx`
      (8 files) — same mechanical swap.
- [ ] `app/(content)/layout.tsx` (the shared layout wrapping all content
      pages, if distinct from the root layout) — re-theme any shared
      header/footer/CTA banner defined here once, rather than per-page.
- [ ] Confirm every content page respects the resolved theme (light/dark)
      consistently with the main app — these are static/marketing pages
      and may currently be light-mode-only; decide whether dark mode is
      in scope for marketing pages or intentionally light-only (record
      the decision here once made, don't leave it implicit).

### Verification

- [ ] `grep -rln "plum" app/\(content\)` returns no matches (directory
      name needs shell-escaping the parens when actually running this).
- [ ] Spot-check at least 3 content pages plus the 404 and error pages
      in a browser, both themes if dark mode is in scope for marketing
      pages.
- [ ] Confirm `app/sitemap.ts` needs no changes (it's route metadata,
      not styling) — explicitly verify rather than skip, since it's in
      the same directory tree as everything else touched here.
- [ ] `npx tsc --noEmit`, `npm run lint`, and `npm run build` (static
      pages are a common place for a build-time-only error to surface)
      all clean.
