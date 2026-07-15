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

- [ ] **Sign off on the final palette.** The README's "Proposed palette"
      table is a draft. Confirm the accent hue (indigo-violet `#6C5CE7`
      proposed) and neutral scale (Zinc-based proposed) before locking
      values into `tailwind.config.ts` — once other sub-specs start
      consuming these tokens by name, changing the *values* is cheap
      (edit one file) but changing the *token names* touches every
      component again.
- [ ] Confirm whether dark chrome surfaces (navbar/sidebar) should stay
      visually distinct from the editor/preview canvas in the new theme
      (today: `bg-navbar` `#373D49` and `bg-sidebar` `#2B2F36` are two
      close-but-different dark grays) or unify into one `bg-chrome`
      value — affects the token list below.

## Tasks

### Token definition

- [ ] Write the full semantic token list replacing every current
      structural/brand name (do not skip any — grep confirms 44 files
      reference `plum` alone): `accent`, `accent-hover`,
      `accent-emphasis` (for active/pressed states), `bg-canvas`,
      `bg-surface`, `bg-surface-raised` (modals/dropdowns), `bg-chrome`
      (or `bg-chrome-navbar` / `bg-chrome-sidebar` per the open question
      above), `text-primary`, `text-secondary`, `text-inverse`,
      `text-on-accent`, `border-subtle`, `border-strong`, `focus-ring`,
      `success`, `warning`, `danger`.
- [ ] Add `:root { --color-*: ... }` (light values) and
      `:root.dark { --color-*: ... }` (dark values) blocks to the top of
      `app/globals.css`, one custom property per semantic token above.
- [ ] Update `tailwind.config.ts`'s `theme.extend.colors` so every
      semantic name maps to `withOpacity`-safe `rgb(var(--color-*) / <alpha-value>)`
      (or `var(--color-*)` directly if opacity modifiers on theme colors
      aren't needed — check current usage of e.g. `bg-plum/20` style
      modifiers first) instead of a literal hex string.
- [ ] Delete the old literal-hex color entries (`plum`, `bg-primary`,
      `bg-sidebar`, `bg-navbar`, `bg-highlight`, `bg-button-save`,
      `text-primary` (old value), `text-invert`, `text-muted`,
      `border-light`, `border-settings`, `icon-default`, `dropdown-link`,
      `switchery`) from `tailwind.config.ts` only after every consuming
      sub-spec (14b–14g) has migrated off them — track this as the
      *last* task in 14h, not here; this task is just "stop adding new
      usages of the old names."
- [ ] Run `npx tailwindcss --content './{app,components}/**/*.{ts,tsx}' --output /dev/null` (or `next build` dry pass) to confirm the config compiles with no invalid class references yet (old names still present, not yet removed).

### Theme provider

- [ ] Add `themePreference: "light" | "dark" | "system"` to
      `stores/store.ts`'s persisted state (default `"system"`), following
      the existing Zustand + localStorage persistence pattern already
      documented in `CLAUDE.md`.
- [ ] Create `components/providers/ThemeProvider.tsx` ("use client"):
      reads `themePreference` from the store, resolves `"system"` via
      `window.matchMedia("(prefers-color-scheme: dark)")`, and toggles
      the `dark` class on `document.documentElement` — the same class
      `darkMode: "class"` in `tailwind.config.ts` already expects, and
      that `app/globals.css`'s existing `.dark.preview-html` block
      already targets.
- [ ] Add a `(change)` listener on the `matchMedia` query so switching OS
      theme live-updates the app when preference is `"system"`, without
      a page reload.
- [ ] Wrap `ThemeProvider` around `children` in
      `components/providers/Providers.tsx`, inside `StoreProvider` (needs
      the store hydrated first) and outside `ToastProvider`.
- [ ] Guard against hydration mismatch: apply the resolved theme class
      via a synchronous inline script in `app/layout.tsx` (before React
      hydrates), not only inside `ThemeProvider`'s `useEffect` — otherwise
      the first paint flashes the wrong theme. Reference the existing
      `next-themes`-style no-flash pattern if adding a dependency is
      preferred over a hand-rolled inline script; either is acceptable,
      document the choice.

### Verification

- [ ] Add `tests/store/store.test.ts` coverage for the new
      `themePreference` field: default value, persistence round-trip,
      and that setting it to each of the three values is reflected in
      `useStore.getState()`.
- [ ] Add a component test (or extend an existing one) confirming
      `ThemeProvider` adds/removes the `dark` class on
      `document.documentElement` when `themePreference` changes.
- [ ] Manually verify in a browser: toggle OS-level dark mode with
      `themePreference: "system"` and confirm the app follows without a
      reload; then set an explicit preference and confirm OS toggling no
      longer affects it.
- [ ] Confirm `npx tsc --noEmit` and `npm run lint` are clean.
