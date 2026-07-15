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

- [ ] Replace `bg-navbar` with `bg-chrome` (or `bg-chrome-navbar` per
      14a's resolved naming) in `Navbar.tsx`'s root element.
- [ ] Replace `text-invert` with `text-inverse` on navbar text/icons.
- [ ] Replace every `hover:text-plum` (9 occurrences per current grep)
      with `hover:text-accent`; confirm the `active:scale-[0.97]` press
      state still reads correctly against the new accent at both
      lightness values.
- [ ] Restyle the "Dillinger" wordmark (`text-plum font-bold text-xl
      tracking-wide`) with `text-accent`; keep weight/tracking/size
      unchanged (layout is out of scope per the phase README).
- [ ] Add an explicit `focus-visible:ring-2 focus-visible:ring-focus-ring`
      (or equivalent) state to every navbar icon button if not already
      present — `CLAUDE.md`'s accessibility principle requires visible
      focus rings, and this is a natural checkpoint to confirm they
      exist under the new palette, not just carry over an existing gap.

### Sidebar & document list

- [ ] Replace `bg-sidebar` with `bg-chrome` (or `bg-chrome-sidebar`) in
      `Sidebar.tsx`.
- [ ] Replace `bg-highlight` (active/selected document row) with a new
      `bg-surface-raised` or dedicated `bg-selected` token — confirm
      with 14a whether "active row" needs its own token distinct from
      generic raised surfaces (it currently is a distinct color from
      both sidebar and highlight, so likely yes).
- [ ] Replace `border-settings` divider usage with `border-subtle`.
- [ ] Confirm the active document row remains distinguishable from an
      unselected hovered row — today's hover and active states may
      collide once both map through fewer, more systematic tokens; add
      a hover-specific token (`bg-surface-hover`) if the collision shows
      up.
- [ ] Re-theme any scrollbar styling in the sidebar's document list (if
      custom scrollbar CSS exists) to match the new neutral scale.

### Logo bar (third-party ad slot)

- [ ] Migrate the `#logobar` CSS rule block in `app/globals.css` from
      hardcoded hex to `var(--color-*)` references, matching the new
      `bg-chrome` / `text-secondary` / `text-inverse` tokens so this
      third-party-injected markup doesn't visually clash with the
      rest of the now-retheme'd chrome.
- [ ] Verify the ad content itself (injected by BuySellAds, outside this
      app's control) still has sufficient contrast against the new
      background — if the third-party creative assumes the old dark
      slate background, flag this as a known limitation in 14h rather
      than trying to override third-party asset colors.

### Verification

- [ ] `grep -rn "bg-navbar\|bg-sidebar\|bg-highlight\|border-settings\|text-plum\|hover:text-plum\|text-invert" components/navbar components/sidebar components/ads` returns no matches.
- [ ] Manual check in both light and dark mode: navbar, sidebar, and
      logo bar all read as one coherent chrome, not three different
      grays.
- [ ] Run the existing `tests/components/navbar.test.tsx` and any
      sidebar/document-list tests — confirm they assert behavior, not
      literal class names that would break on a rename; update any that
      snapshot old class names.
- [ ] `npx tsc --noEmit` and `npm run lint` clean.
