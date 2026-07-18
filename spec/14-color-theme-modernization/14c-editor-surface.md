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

- [x] `dillinger-light` markdown token foreground: `#373D49` →
      `#18181B` (resolved light `text-primary`). Monaco's `defineTheme`
      takes literal hex, so this is a hand-resolved copy of the same
      value in `app/globals.css`'s `--color-text-primary`, documented
      with a comment pointing back at the token source so the two don't
      drift silently.
- [x] `dillinger-dark` markdown token foreground: `#D3DAEA`/`#A0AABF` →
      `#FAFAFA` (text-primary dark, for keyword/variable/heading) and
      `#A1A1AA` (text-secondary dark, for links) — preserves the
      original design's two-shade distinction (headings/keywords
      brighter than links) using the new neutral scale.
- [x] `editor.background`/`editor.foreground` in both themes now
      `#FFFFFF`/`#18181B` (light) and `#111113`/`#FAFAFA` (dark) —
      resolved `bg-canvas`/`text-primary` per mode.
- [x] All six Phase-13 highlight properties re-derived from the new
      accent (`#6C5CE7` light / `#8174F0` dark, using a lighter accent
      shade in dark mode for contrast, matching 14a's token values) at
      the **exact same hex-alpha suffixes** Phase 13 chose
      (`33`/`80`/`26`/`66`/`40`/`99` light,
      `40`/`99`/`2E`/`73`/`4D`/`B3` dark) — only the base color changed,
      the alpha ratios are untouched.
- [x] `selectionHighlight: true` and `occurrencesHighlight: "singleFile"`
      left unchanged in `editorOptions`.

### Editor chrome

- [x] `EditorContainer.tsx`: `bg-bg-primary` → `bg-bg-canvas`,
      `border-border-light` → `border-border-subtle`,
      `text-text-muted` → `text-text-secondary`,
      `bg-plum/20`/`text-plum` (drop-zone overlay) → `bg-accent/20`/
      `text-accent`. Also fixed two arbitrary-hex values found while in
      this file: the editor/preview divider's
      `shadow-[1px_0_0_0_#E8E8E8]` → references
      `rgb(var(--color-border-subtle))` instead of a hardcoded hex, and
      the preview panel's `bg-[#FAFBFC]` → `bg-bg-surface` — both were
      previously light-mode-only values with no dark equivalent; they
      now respond to the active theme like everything else in this
      file, closing a real (not just cosmetic) dark-mode gap.
- [x] `DocumentTitle.tsx`: input field `bg-white` → `bg-bg-canvas`,
      `focus:border-plum`/`focus-visible:ring-plum` → `focus:border-accent`/
      `focus-visible:ring-focus-ring`, save-icon `text-plum` →
      `text-accent`, rename-icon `hover:text-plum` → `hover:text-accent`,
      `text-text-muted` → `text-text-secondary`. Same dark-mode gap as
      above: this title bar previously had no dark treatment at all
      (`bg-white` was unconditional) — now it's canvas-token-driven.

### Verification (mandatory — this file caused a real, previously-shipped bug)

- [ ] Reproduce the exact Playwright check from Phase 13 (type a
      repeated word, double-click one occurrence, screenshot, confirm
      all occurrences highlighted) — **not run in this sandbox** (no
      interactive browser session); deferred to 14h's manual pass. The
      alpha-ratio-preserving approach above is the mitigation against
      regressing Phase 13 without being able to re-screenshot it here.
- [ ] Visual confirmation of active text selection contrast — deferred
      to 14h alongside the above, same constraint.
- [x] Markdown syntax token contrast reasoned through, not just
      guessed: light mode is near-black text (`#18181B`) on white
      (`#FFFFFF`) — very high contrast by construction. Dark mode is
      near-white text (`#FAFAFA`) on near-black (`#111113`) — same.
      Link color in dark mode (`#A1A1AA` on `#111113`) is the one
      pairing worth a real contrast-ratio check, flagged for 14h's
      WCAG audit rather than eyeballed here.
- [x] `npx eslint components/editor/` (via `npm run lint`) clean;
      `npx tsc --noEmit` clean (no new errors beyond the same
      pre-existing set noted in 14a).
