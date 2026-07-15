# 14c — Editor Surface (Monaco + Chrome)

Goal: re-theme the Monaco editor's two custom themes
(`dillinger-light` / `dillinger-dark`) and the editor pane's surrounding
chrome (title bar, container) onto the new palette — without regressing
the Phase 13 selection/occurrence-highlight fix, which is the most
recently touched code in this exact file.

Depends on: 14a (semantic tokens must exist first).

Owns: `components/editor/EditorContainer.tsx`,
`components/editor/DocumentTitle.tsx`, `components/editor/MonacoEditor.tsx`
(the `monaco.editor.defineTheme` calls' `colors` and `rules` maps only —
not Monaco's own bundled/default themes).

## Current state (for reference while migrating)

`MonacoEditor.tsx` defines two custom Monaco themes today:

- `dillinger-light` (`base: "vs"`): background `#FFFFFF`, foreground
  `#000000`, markdown token colors in `#373D49`,
  `selectionHighlightBackground: "#35D7BB33"`.
- `dillinger-dark` (`base: "vs-dark"`): background `#1D212A`, foreground
  `#D3DAEA`, markdown token colors in `#D3DAEA`/`#A0AABF`,
  `selectionHighlightBackground: "#35D7BB40"`.

Both were extended in Phase 13
(`spec/13-editor-selection-highlight-bug.md`) with explicit
`editor.selectionHighlightBackground`, `selectionHighlightBorder`,
`wordHighlightBackground`, `wordHighlightBorder`,
`wordHighlightStrongBackground`, `wordHighlightStrongBorder` — all keyed
off the plum accent at various alpha values. **Every one of these must be
re-derived from the new accent, not deleted** — deleting them silently
reintroduces the Phase 13 bug (Monaco's stock highlight defaults are
documented in that spec as "nearly imperceptible" against this app's
backgrounds).

## Tasks

### Monaco theme colors

- [ ] Replace `dillinger-light`'s markdown token foreground colors
      (`#373D49`) with `var(--color-text-primary)`'s light-mode resolved
      hex (Monaco's `defineTheme` needs literal hex/rgba strings, not CSS
      custom properties — resolve at build/mount time from the token
      value, don't hand-copy a second literal).
- [ ] Replace `dillinger-dark`'s markdown token foreground colors
      (`#D3DAEA` / `#A0AABF`) with the dark-mode `text-primary` /
      `text-secondary` resolved values.
- [ ] Replace `editor.background` / `editor.foreground` in both themes
      with resolved `bg-canvas` / `text-primary` values per mode.
- [ ] Re-derive all six Phase-13 highlight properties
      (`selectionHighlightBackground`, `selectionHighlightBorder`,
      `wordHighlightBackground`, `wordHighlightBorder`,
      `wordHighlightStrongBackground`, `wordHighlightStrongBorder`) from
      the **new** accent color at the same alpha values Phase 13 chose
      (`33`/`40` hex-alpha suffixes — i.e. ~20%/25% opacity), not the old
      plum hex.
- [ ] Keep `selectionHighlight: true` and
      `occurrencesHighlight: "singleFile"` in `editorOptions` unchanged
      (Phase 13 made these explicit specifically so they wouldn't
      silently regress — this phase must not remove them).

### Editor chrome

- [ ] Re-theme `EditorContainer.tsx`'s non-Monaco chrome (pane
      background, any border between editor and preview panes, the
      zen-mode toggle button) onto `bg-canvas` / `border-subtle` /
      `text-accent` (for the active-state toggle) tokens.
- [ ] Re-theme `DocumentTitle.tsx` (inline-editable title field): resting
      state, focus state (currently likely a plum-colored underline or
      ring), and placeholder text color, using `text-primary` and
      `focus-ring` tokens.

### Verification (mandatory — this file caused a real, previously-shipped bug)

- [ ] Reproduce the exact Playwright check from Phase 13: type a
      repeated word, double-click one occurrence, screenshot, and
      confirm all occurrences are visibly highlighted with clear
      contrast, in **both** light and dark theme, under the **new**
      accent color.
- [ ] Visually confirm the active text selection (click-drag, not just
      word-occurrence highlight) remains clearly visible against both
      new theme backgrounds.
- [ ] Confirm markdown syntax token colors (headers, links, emphasis
      markers — the `keyword.md` / `string.link.md` / `variable.md`
      rules) retain sufficient contrast against the new
      `editor.background` in both modes; these were tuned against the
      old backgrounds (`#FFFFFF` / `#1D212A`) and the new dark canvas
      value may differ.
- [ ] `npx eslint components/editor/` clean; `npx tsc --noEmit` clean
      (matching the exact verification Phase 13 ran).
