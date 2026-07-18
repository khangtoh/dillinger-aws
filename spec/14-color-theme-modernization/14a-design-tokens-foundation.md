# 14a — Design Tokens & Theme Infrastructure

Goal: establish the new token system and a real theme provider so every
other sub-spec in this phase has semantic class names and a working
light/dark/system toggle to build against. No other sub-spec should start
until this one is checked off and merged.

Depends on: none (first sub-spec in Phase 14).
Blocks: 14b, 14c, 14d, 14e, 14f, 14g.

Owns: `tailwind.config.ts`, `app/globals.css` (`:root` / `:root.dark`
token declarations only — not component-specific rule blocks, those
belong to the sub-spec that owns that component), new
`components/providers/ThemeProvider.tsx`, `stores/store.ts` (adds a
`themePreference` field).

## Open input needed from the user

- [x] **Sign off on the final palette.** Proceeded with the README's
      proposed values (accent `#6C5CE7` indigo-violet, Zinc-based
      neutrals) per explicit instruction to implement the phase using
      the proposal as default — not yet reviewed by a human designer.
      Revisit if you want different values; only `app/globals.css`'s
      `--color-*` declarations need to change, no component touches a
      literal hex.
- [x] Resolved: unified into **one `bg-chrome` token** (not separate
      navbar/sidebar values) — simpler token surface, and the two
      legacy values (`#373D49` / `#2B2F36`) were already close enough
      that keeping them distinct added no real signal.

## Tasks

### Token definition

- [x] Full semantic token list defined (19 tokens, more than the
      original list — added `bg-surface-hover` and `bg-selected` early
      since 14b's sidebar active-row task and 14e's toggle-track task
      both needed them, avoiding a second pass through this file):
      `accent`, `accent-hover`, `accent-emphasis`, `bg-canvas`,
      `bg-surface`, `bg-surface-raised`, `bg-surface-hover`,
      `bg-chrome`, `bg-selected`, `text-primary`, `text-secondary`,
      `text-inverse`, `text-on-accent`, `border-subtle`,
      `border-strong`, `focus-ring`, `success`, `warning`, `danger`.
- [x] `:root` / `:root.dark` custom-property blocks added at the top of
      `app/globals.css`, one `--color-*` (space-separated RGB channels,
      not hex) per token above.
- [x] `tailwind.config.ts`'s `theme.extend.colors` maps every semantic
      name to `rgb(var(--color-*) / <alpha-value>)`, so opacity
      modifiers like `bg-accent/20` work.
- [ ] Deletion of the old literal-hex entries — deferred to 14h as
      planned, once 14b–14g have migrated off them.
- [x] Confirmed the config compiles: `npm run lint` and `npx tsc --noEmit`
      both clean with old and new tokens coexisting (see Verification).

### Theme provider

- [x] Added `themePreference: "light" | "dark" | "system"` — placed
      inside `UserSettings` (`lib/types.ts`) rather than a separate
      top-level store field, so it rides the *existing*
      `persist()`/`hydrate()` → `localStorage["profileV3"]` path with
      zero new persistence code. This **replaced** the pre-existing
      `enableNightMode: boolean` field (found during implementation —
      a real, working but only-partial dark mode already existed,
      wired ad hoc into just `MonacoEditor.tsx` and
      `MarkdownPreview.tsx`, with no app-wide `dark` class and no
      "system" option). All `enableNightMode` call sites and tests
      updated to `themePreference` in this same change so the repo
      never had a broken intermediate state.
- [x] `components/providers/ThemeProvider.tsx` created: reads
      `themePreference` from the store, resolves `"system"` via
      `matchMedia("(prefers-color-scheme: dark)")`, toggles `dark` on
      `document.documentElement`, and exposes the resolved value to
      descendants via a `useResolvedTheme()` hook (needed by
      `MonacoEditor`/`MarkdownPreview` since Monaco's theme prop can't
      read a CSS class).
- [x] `matchMedia` `change` listener added — live-updates without reload
      when preference is `"system"`.
- [x] Wrapped into `components/providers/Providers.tsx`: `StoreProvider`
      → `ThemeProvider` → `ToastProvider`.
- [x] No-flash guard added as a synchronous inline `<script>` in
      `app/layout.tsx`'s `<head>`, reading `localStorage["profileV3"]`
      directly (same key `hydrate()` uses) before React hydrates.
      Hand-rolled rather than a new dependency — small enough not to
      justify pulling in `next-themes`.

### Verification

- [x] `tests/store/store.test.ts`: default (`"system"`), persistence
      round-trip via `hydrate()`, and `updateSettings()` all covered.
- [x] New `tests/components/theme-provider.test.tsx` (3 tests): dark
      class applied for `"dark"`, removed for `"light"`, resolves via
      mocked `matchMedia` for `"system"`. All passing.
- [ ] Manual real-browser OS-toggle check — not done in this sandbox
      (no interactive browser session available); covered by 14h's
      cross-surface manual pass instead.
- [x] `npx tsc --noEmit`: clean (53 pre-existing unrelated errors in
      `tests/components/github-modal.test.tsx` and
      `app/api/google-drive/save/route.ts` confirmed present on the
      base branch too, before this phase's changes). `npm run lint`:
      clean.
