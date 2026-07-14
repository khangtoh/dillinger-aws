# Phase 13 — Bug: Monaco selection/occurrence highlighting invisible

Goal: fix the reported editor bug — "selecting a text/word shows no
highlight for other occurrences of that word" — and record the
investigation so the root cause doesn't get rediscovered from scratch.

Depends on: none (client-side editor bug, independent of the AWS
deployment phases).

## Symptom

Reported by a user of the deployed Next.js "modern Dillinger" editor:
selecting a word or text span in the Monaco editor did not visibly
highlight other occurrences of that same word elsewhere in the document.

## Investigation

- [x] Confirm the app doesn't explicitly disable Monaco's built-in
      occurrence-highlighting options. Checked `editorOptions` and
      `handleMount` in `components/editor/MonacoEditor.tsx` — neither
      `selectionHighlight` nor `occurrencesHighlight` was set, so Monaco's
      defaults (`true` / `"singleFile"`) were in effect; the app was not
      turning the feature off.
- [x] Reproduce with a real Monaco instance to rule out environment noise.
      Installed dependencies, ran `next dev`, and drove the editor with
      Playwright (typed repeated words, double-clicked one occurrence).
      Confirmed decoration elements (`cdr selectionHighlight`,
      `cdr wordHighlightText`) *were* present in the DOM — so the feature
      was firing, but rendering with essentially no visible contrast.
- [x] Locate the actual color source. Monaco's
      `highlightDecorations.css` binds `.selectionHighlight`/
      `.wordHighlight*` backgrounds to CSS custom properties
      (`--vscode-editor-selectionHighlightBackground`, etc.) that are
      populated from the active theme's `colors` map. The app's two
      custom themes (`dillinger-light`, `dillinger-dark`, defined in
      `handleMount`) only set `editor.background` and `editor.foreground`
      — every other color, including the highlight colors, fell back to
      Monaco's stock (very low-alpha, `.focused`-gated) defaults, which
      were nearly imperceptible against this app's specific background
      shades.
- [x] Rule out a network/CDN loading failure as the cause. This sandbox's
      egress proxy blocks `cdn.jsdelivr.net` (the default
      `@monaco-editor/react` asset source), so a CDN outage was
      considered as an alternate explanation. Self-hosting the exact
      pinned `monaco-editor@0.55.1` assets locally and re-testing showed
      the same faint decoration, confirming the CSP/CDN path was not the
      cause — the missing theme colors were.

## Root cause

The custom Monaco themes never defined `editor.selectionHighlightBackground`,
`editor.selectionHighlightBorder`, `editor.wordHighlightBackground`,
`editor.wordHighlightBorder`, `editor.wordHighlightStrongBackground`, or
`editor.wordHighlightStrongBorder`. Monaco's stock defaults for these are
subtle by design (tuned for VS Code's default palette) and were effectively
invisible against Dillinger's specific light/dark backgrounds, so the
highlight was technically rendering but not perceivable.

## Fix

- [x] Add explicit plum-accent (`#35D7BB`, the app's single brand accent
      color) selection/word-highlight colors to both `dillinger-light`
      and `dillinger-dark` theme definitions in
      `components/editor/MonacoEditor.tsx`.
- [x] Make `selectionHighlight: true` and
      `occurrencesHighlight: "singleFile"` explicit in `editorOptions`
      so the feature no longer depends on Monaco's undocumented defaults
      staying the same across upgrades.
- [x] Visually verify in a real browser (Playwright screenshot) that
      selecting one occurrence of a repeated word highlights all other
      occurrences, in both light and dark theme, with clearly visible
      contrast.
- [x] Confirm no regressions: `npx eslint components/editor/MonacoEditor.tsx`
      clean; `npx tsc --noEmit` shows no new errors (pre-existing, unrelated
      errors only in `tests/components/github-modal.test.tsx`).
- [x] Commit, push to `claude/dillinger-highlight-selection-lnb740`, open
      PR, and merge to `main`.

## Results log

- 2026-07-14: Root cause confirmed (missing theme colors, not a Monaco
  config or CDN/network issue). Fix applied to
  `components/editor/MonacoEditor.tsx` (14 lines added, single file).
  Verified visually: 4/4 occurrences of a repeated test word highlighted
  in plum in both themes. Lint and typecheck clean. Merged via PR #18
  (squash, commit `392e8ef`) to `main`.
- **Outstanding**: the merged fix has not yet been deployed — the live
  `staging` Function URL
  (`https://iepu7ka2gyaxnyhhnldynzgxgy0yonzr.lambda-url.ap-southeast-1.on.aws/`)
  is still serving whatever image was last built before this merge.
  Re-running `infra/provision-tenant.sh` (or the orchestrator) for
  `staging` is required before this fix is live; not done as part of
  this phase.
