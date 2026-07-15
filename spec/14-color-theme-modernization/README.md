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

## Proposed palette (14a decides the final values — this is the starting proposal)

A concrete starting point, so 14a isn't blocked on a blank page. Final
values are 14a's to lock in (see its "Open input needed" section) —
treat these as a strong draft, not a commitment:

| Role | Proposed value | Notes |
|---|---|---|
| Accent (replaces plum) | `#6C5CE7` (indigo-violet) | Distinct hue family from teal/green; keeps the "single bright voice" principle from `CLAUDE.md` |
| Accent hover/active | `#5A4BD1` | ~10% darker |
| Neutral scale | Zinc-based (`#09090B` → `#FAFAFA`, 10 stops) | Cooler and less saturated than the current slate-blue (`#373D49` family), reads as more "modern SaaS" per the brand personality goal ("focused, capable, understated") |
| Dark chrome surfaces | `#18181B` / `#111113` | Replaces `#2B2F36` / `#373D49` |
| Success / warning / danger | `#22C55E` / `#F59E0B` / `#EF4444` | New — today's app has no consistent semantic status colors (e.g. `DeleteConfirmModal` uses ad hoc red) |

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

- [ ] 14a — Design tokens & theme infrastructure: not started
- [ ] 14b — App chrome & navigation: not started (blocked on 14a)
- [ ] 14c — Editor surface: not started (blocked on 14a)
- [ ] 14d — Preview / markdown rendering: not started (blocked on 14a)
- [ ] 14e — Modals & overlays: not started (blocked on 14a)
- [ ] 14f — UI primitives & feedback: not started (blocked on 14a)
- [ ] 14g — Marketing & content pages: not started (blocked on 14a)
- [ ] 14h — Verification & rollout: not started (blocked on 14b–14g)
