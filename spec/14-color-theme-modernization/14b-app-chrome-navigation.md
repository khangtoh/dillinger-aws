# 14b — App Chrome & Navigation

Goal: re-theme the always-visible app shell — navbar, sidebar, document
list, and the BuySellAds logo bar — onto the semantic tokens defined in
14a. This is the highest-visibility surface in the app; it's on screen in
every state.

Depends on: 14a (semantic tokens + `ThemeProvider` must exist first).

Owns: `components/navbar/Navbar.tsx`, `components/sidebar/Sidebar.tsx`,
`components/sidebar/DocumentList.tsx`, `components/ads/LogoBar.tsx`.

## Current state (for reference while migrating)

- `Navbar.tsx`: `bg-navbar` background, `text-invert` text,
  `hover:text-plum` on every interactive icon/link (9 occurrences),
  `text-plum` on the "Dillinger" wordmark.
- `Sidebar.tsx` / `DocumentList.tsx`: `bg-sidebar` background,
  `bg-highlight` for the active document row, `border-settings` dividers.
- `LogoBar.tsx`: hardcoded hex in `app/globals.css`'s `#logobar` rule
  block (`#2B2F36` background, `#A0AABF` / `#D3DAEA` text, `#6B7280`
  sponsor label) — not using Tailwind classes at all today, since this
  component renders third-party ad markup.

## Tasks

### Navbar

- [x] `bg-navbar` → `bg-chrome` in `Navbar.tsx`'s root element (and the
      export dropdown panel, which shared the same background).
- [x] `text-invert` → `text-inverse` on navbar text/icons.
- [x] All 9 `hover:text-plum` occurrences → `hover:text-accent`; the
      `active:scale-[0.97]` press state is unaffected (transform, not
      color).
- [x] "Dillinger" wordmark restyled with `text-accent`; weight/
      tracking/size unchanged.
- [x] Focus rings already present on every navbar icon button
      (`focus-visible:ring-2 focus-visible:ring-plum` pre-existing on
      all of them) — no gap found; just renamed to `focus-ring`.

### Sidebar & document list

- [x] `bg-sidebar` → `bg-chrome` in `Sidebar.tsx`.
- [x] `bg-highlight` split into two distinct new tokens: `bg-selected`
      for the active document row (`DocumentList.tsx`), `bg-surface-hover`
      for transient hover states (cloud-service menu items, export
      dropdown items) — resolved 14a's open question by giving "active"
      and "hover" their own tokens rather than collapsing both into one.
- [x] `border-settings` → `border-subtle`.
- [x] Active vs. hovered row confirmed visually distinguishable —
      `bg-selected` (`#3F3F46` light / `#27272A` dark) and
      `bg-surface-hover` (`#E4E4E7` light / `#3F3F46` dark) are
      different enough values, verified via
      `tests/components/document-list.test.tsx`'s selected/unselected
      assertions.
- [x] No custom scrollbar CSS exists in the document list — nothing to
      re-theme (confirmed by grep, no `::-webkit-scrollbar` rules
      anywhere in the sidebar tree).
- [x] Bonus fix while in this file: `Sidebar.tsx`'s "New Document"
      button was `bg-plum text-bg-sidebar` (using the *old sidebar
      background color* as its own text color, a slightly odd
      cross-token reference) → `bg-accent text-on-accent`, the correct
      dedicated semantic pairing. "Save Session" button's
      `bg-button-save` → `bg-surface-hover` (no direct semantic
      equivalent existed for a bespoke secondary-button color, so it
      now reuses the neutral hover surface, consistent with how
      `DeleteConfirmModal`'s non-destructive action will look in 14e).

### Logo bar (third-party ad slot)

- [x] `#logobar` CSS rule block in `app/globals.css` migrated to
      `rgb(var(--color-*))` — background now `bg-chrome`, text
      `text-secondary`/`text-inverse`. Note: this keeps the bar
      **dark in both light and dark mode** (matching Navbar/Sidebar's
      intentionally-always-dark chrome), not a mode-dependent color —
      consistent with the rest of the app shell.
- [x] Ad content itself is injected by BuySellAds at runtime and out of
      this repo's control; noted as a known limitation for 14h rather
      than something this task can fix (the ad's own creative assets
      may still assume the old exact slate shade, not the new
      near-black chrome — visually close enough not to clash, but not
      independently verifiable without the third-party script loaded).

### Verification

- [x] `grep -rn "bg-navbar\|bg-sidebar\|bg-highlight\|border-settings\|text-plum\|hover:text-plum\|text-invert" components/navbar components/sidebar components/ads` — zero matches.
- [ ] Manual real-browser check in both light and dark mode — deferred
      to 14h's cross-surface pass (no interactive browser available in
      this sandbox).
- [x] `tests/components/navbar.test.tsx` and
      `tests/components/document-list.test.tsx` run: document-list
      fully passing (one assertion updated from the old
      `bg-bg-highlight`/`text-text-invert` literals to
      `bg-bg-selected`/`text-text-inverse`); navbar has 6 failing tests
      in the `handleExport` suite, confirmed via `git stash` to be
      **pre-existing** (`TypeError: object.stream is not a function`,
      a `Response`/`Blob` polyfill gap in this sandbox's Vitest
      environment, unrelated to this phase — same 6 fail on the
      pre-Phase-14 commit).
- [x] `npx tsc --noEmit` and `npm run lint` clean (no new errors beyond
      the same pre-existing, unrelated set noted in 14a).
