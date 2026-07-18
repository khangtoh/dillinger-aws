# Phase 14 — Modernized Color Theme (Full Rebrand)

## Why this exists

Dillinger's current visual identity — the plum/teal accent (`#35D7BB`) over
a dark slate-blue chrome (`#2B2F36` sidebar, `#373D49` navbar) — is the
original upstream OSS project's branding, inherited as-is by the Next.js
port (see `CLAUDE.md`'s Design Context section and `tailwind.config.ts`).
It has never been reconsidered as part of any phase so far; Phase 13 even
reused the plum accent verbatim when fixing the Monaco highlight bug
(`spec/13-editor-selection-highlight-bug.md`).

This phase defines a **complete replacement** color system — new accent,
new neutrals, new semantic tokens for both light and dark mode — that
**does not reuse any current Dillinger brand color** (not `#35D7BB`, not
the current slate chrome palette), and re-themes every UI surface in the
app to consume it. This is a rebrand, not a palette tweak: no component
should still reference `plum`, `bg-sidebar`, `bg-navbar`, `bg-highlight`,
`bg-button-save`, `border-settings`, `switchery`, `dropdown-link`, or
`icon-default` (the current hardcoded Tailwind token names) by the end of
this phase — they get renamed to semantic tokens backed by the new
palette, not just re-colored in place.

Depends on: none (client-side styling only, independent of the AWS
deployment phases). Does not block or get blocked by Phases 1–13.

## Scope note: this phase is specs only

Per the working instruction that created this phase, **14a–14h below are
requirements documents, not yet implemented code.** No component, token,
or CSS file should be modified until a sub-spec is picked up and its tasks
are checked off one at a time, the same way every other phase in this
repo works (see `spec/README.md`: "A scheduled agent picks up the next
unchecked box, does it, verifies it, checks it off, commits, and moves to
the next one").

## New token architecture (applies to every sub-spec)

The current system is a flat list of literal hex values in
`tailwind.config.ts`, with dark-mode handled ad hoc per component (mostly
just Monaco's own theme switching and a `.dark.preview-html` CSS block —
there is no app-wide theme provider or toggle today, despite
`CLAUDE.md`'s Design Context claiming full light/dark/system support).
This phase fixes both problems at once:

1. **CSS custom properties are the source of truth**, not Tailwind's
   static `theme.extend.colors`. Two token sets — `:root` (light) and
   `:root.dark` (dark) — each define the same set of semantic variable
   names (`--color-accent`, `--color-bg-canvas`, `--color-bg-surface`,
   `--color-text-primary`, etc.) with different values. Tailwind's config
   maps semantic class names to `var(--color-*)` so `bg-surface` resolves
   correctly regardless of active theme, instead of Tailwind baking one
   light-only value into the generated CSS.
2. **Semantic names replace structural/brand names.** `plum` → `accent`.
   `bg-navbar` / `bg-sidebar` → `bg-chrome` (one token for both — see
   14b for whether they stay visually identical or diverge). `bg-primary`
   → `bg-canvas`. This makes future re-themes (or a second brand) a
   token-file edit, not a repo-wide grep-and-replace like this phase
   itself has to do once.
3. **One real theme provider** reads/writes the existing `dark` class
   Tailwind already watches for (`darkMode: "class"` in
   `tailwind.config.ts`) plus `prefers-color-scheme` for the "system"
   option, and persists the user's choice — closing the gap between the
   documented design goal and actual behavior.

None of the sub-specs below invent their own colors — 14a is the only
place new hex/OKLCH values get defined. Every other sub-spec consumes
14a's tokens by name.

## Palette (as shipped — see 14a for the original proposal, 14h for the contrast-audit corrections)

Implemented per the original proposal below, with two values corrected
during 14h's WCAG audit after actually computing contrast ratios
(originals struck through):

| Role | Light | Dark | Notes |
|---|---|---|---|
| Accent (replaces plum) | `#6C5CE7` | `#8174F0` | Indigo-violet; distinct hue family from the retired teal/green. Dark value is lighter/more saturated for contrast against a near-black canvas. |
| Accent hover/active | `#5A4BD1` | `#6C5CE7` | ~10% darker than the resting accent, per theme. |
| Neutral scale | Zinc-based, `#09090B` → `#FAFAFA` | Same, theme-selected | Cooler/less saturated than the retired slate-blue (`#373D49` family). |
| Chrome (navbar/sidebar/modals) | `#18181B` | `#09090B` | Always dark in both themes, by design — see 14b. |
| Danger | ~~`#EF4444`~~ → `#DC2626` | `#F87171` | Light value darkened from the original proposal — `#EF4444` measured 3.76:1 against white (fails AA); `#DC2626` measures 4.83:1. |
| Success / warning | `#22C55E` / `#F59E0B` (light), `#4ADE80` / `#FBBF24` (dark) | | Defined but not yet consumed anywhere live (no component currently needs a success/warning state). |
| Text-on-accent | `#FFFFFF` | ~~`#FFFFFF`~~ → `#111113` | Dark value changed from a flat white (originally proposed) to near-black — white-on-dark-accent measured 3.69:1 (fails AA); near-black measures 5.11:1. Chosen over darkening the accent itself so the accent's other use as link text (already passing at 5.11:1) stayed untouched. |

## File ownership (avoids merge conflicts if sub-specs are picked up in parallel)

| Sub-spec | Owns (creates/edits) | Depends on |
|---|---|---|
| [14a-design-tokens-foundation.md](14a-design-tokens-foundation.md) | `tailwind.config.ts`, `app/globals.css` (`:root` token blocks only), new `components/providers/ThemeProvider.tsx`, `stores/store.ts` (theme preference field) | None — do this first |
| [14b-app-chrome-navigation.md](14b-app-chrome-navigation.md) | `components/navbar/Navbar.tsx`, `components/sidebar/Sidebar.tsx`, `components/sidebar/DocumentList.tsx`, `components/ads/LogoBar.tsx` | 14a |
| [14c-editor-surface.md](14c-editor-surface.md) | `components/editor/EditorContainer.tsx`, `components/editor/DocumentTitle.tsx`, `components/editor/MonacoEditor.tsx` (custom theme `colors`/`rules`) | 14a |
| [14d-preview-markdown-rendering.md](14d-preview-markdown-rendering.md) | `components/preview/MarkdownPreview.tsx`, `app/globals.css` (`.preview-html` rule blocks) | 14a |
| [14e-modals-overlays.md](14e-modals-overlays.md) | `components/modals/*.tsx` (all 7 files) | 14a |
| [14f-ui-primitives-feedback.md](14f-ui-primitives-feedback.md) | `components/ui/Toast.tsx`, `components/ui/Skeleton.tsx`, `components/ui/KeyboardShortcuts.tsx` | 14a |
| [14g-marketing-content-pages.md](14g-marketing-content-pages.md) | `app/layout.tsx`, `app/page.tsx`, `app/error.tsx`, `app/not-found.tsx`, `app/opengraph-image.tsx`, `app/(content)/**`, `public/site.webmanifest`, `app/favicon.ico` | 14a |
| [14h-verification-rollout.md](14h-verification-rollout.md) | Accessibility/contrast audit, visual regression, docs (`CLAUDE.md`, `ARCHITECTURE.md` design context), staged rollout | 14b + 14c + 14d + 14e + 14f + 14g |

14b through 14g touch disjoint file sets and can be worked in parallel
once 14a's tokens are merged, the same pattern Phase 11 used for its four
orchestrator modules. 14h is the integration/verification gate and must
come last.

## Non-goals for this phase

- **No new component layouts or interaction changes.** This is a color
  and token swap, not a redesign of spacing, structure, or behavior.
  Where a task calls for adding a missing dark-mode rule or a missing
  focus state, that's an accessibility gap being closed alongside the
  rebrand, not a scope expansion.
- **No logo/wordmark redesign.** The "Dillinger" wordmark text treatment
  in the navbar is restyled with the new accent color (14b), but no new
  icon/logo asset is created as part of this phase.
- **Does not touch `public/` marketing screenshot assets** beyond the
  favicon/OG image/webmanifest theme-color metadata covered in 14g —
  regenerating marketing screenshots is follow-up work once the new
  theme ships.

## Status

- [x] 14a — Design tokens & theme infrastructure: **done**. New semantic
      token set + `ThemeProvider` (light/dark/system) merged; consumed
      the README's proposed palette as-is (pending human design
      review). Legacy tokens still present in `tailwind.config.ts`,
      removed in 14h once every consumer migrates.
- [x] 14b — App chrome & navigation: **done**. Navbar, Sidebar,
      DocumentList, LogoBar migrated to semantic tokens; `bg-highlight`
      split into `bg-selected` (active row) vs. `bg-surface-hover`
      (transient hover).
- [x] 14c — Editor surface: **done**. Monaco custom themes, editor
      chrome, and document title bar re-themed; Phase 13's highlight
      fix re-derived from the new accent at the same alpha ratios.
      Also closed a real gap: the editor title bar and preview-split
      divider had no dark-mode treatment at all before this.
- [x] 14d — Preview / markdown rendering: **done**. `.preview-html`
      fully token-driven; the entire `.dark.preview-html` override
      block (~60 lines) deleted since CSS vars already cascade per
      theme. `MarkdownPreview.tsx` simplified — dropped its own
      `enableNightMode`/`useResolvedTheme` theme-detection path
      entirely as dead weight. Missing checkbox `accent-color` added
      for both themes.
- [x] 14e — Modals & overlays: **done**. All 7 modals re-themed;
      introduced the `danger` token for destructive actions and applied
      it consistently (including Sidebar's delete/unlink buttons, which
      predated this phase's `plum` grep since they never used `plum`).
- [x] 14f — UI primitives & feedback: **done**. Toast, Skeleton,
      KeyboardShortcuts re-themed. Found the toast-variant task in this
      sub-spec didn't apply — `Toast.tsx`'s real API has no variant
      parameter at all, contrary to `CLAUDE.md`'s documented example.
- [x] 14g — Marketing & content pages: **done**. All 17 content
      routes, the app shell (layout/page/error/not-found), the OG
      image, and the webmanifest re-themed. **Verified live in a real
      browser** (Playwright + pre-installed Chromium): light/dark
      toggle confirmed working end-to-end. Favicon/PNG icon
      regeneration deferred — no image tooling available in this
      sandbox. `npm run build` fails on a confirmed pre-existing,
      unrelated bug (`app/api/google-drive/save/route.ts`), not caused
      by this phase.
- [x] 14h — Verification & rollout: **implementation complete, not
      deployed**. Repo-wide sweep confirms zero remaining references
      to the old brand color/tokens (`tailwind.config.ts`'s 13 legacy
      entries removed). A real WCAG contrast audit (computed, not
      eyeballed) found and fixed two genuine AA failures — light-mode
      `danger` text and dark-mode `text-on-accent` on the accent
      button fill — by adjusting token values, not by working around
      them per-component. `npm run lint`/`tsc`/unit tests all clean
      (311/321, 10 pre-existing unrelated failures). `npm run
      build`/`test:e2e`/`verify` could not run — pre-existing,
      unrelated build bug in `app/api/google-drive/save/route.ts`,
      confirmed via `git stash` to predate this phase. **Not deployed
      to `staging`** — no AWS credentials in this sandbox, same
      constraint as every other phase here.
