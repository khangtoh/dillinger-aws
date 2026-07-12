# Phase 15 — UI Component Migration to Astryx + New Editor UX

Goal: migrate the existing hand-rolled component layer to Astryx
primitives one component at a time, and land the new StackEdit-beating
UI requirements (Phase 13 Section C, UI-2 through UI-6) on top of that
base — without regressing accessibility, the plum brand, or any existing
test.

Depends on: Phase 14 **Go** decision.

## Working rules

- Migrate one component per task group; each group must pass its own
  tests before the next starts. This mirrors Phase 13's Section A finding
  that every interactive pattern is currently bespoke — migrate them to
  the shared primitive one at a time so a regression is traceable to a
  single component.
- Every migrated component must keep its existing `data-testid`s and ARIA
  attributes unless a task explicitly changes them (and if it does, the
  corresponding test must be updated in the same task, not a later one).
- New UI requirements (UI-2..UI-6) are additive components, not rewrites
  of unrelated ones — do not fold unrelated cleanup into these tasks.

## Clarification pass

- [ ] Re-read `components/*/CLAUDE.md` recent-activity notes for any
      component listed below to catch undocumented recent changes before
      migrating it (the repo's memory notes may be ahead of this spec).
- [ ] For each of UI-3 (scroll-sync) and UI-4 (Mermaid/diagram support),
      confirm current behavior by exercising the running app first —
      Phase 13 flagged these as "confirm and close the gap, don't assume
      it's missing." Record what's actually there before writing tasks
      that assume a blank slate.
- [ ] Decide the Mermaid/diagram rendering library (e.g. `mermaid` npm
      package client-side-only, matching the existing dynamic-import
      pattern used for Monaco) and confirm it does not require a Lambda
      packaging change (no native binary, unlike `@sparticuz/chromium`) —
      if it does, stop and route to Phase 13/`ARCHITECTURE.md` review
      before continuing.

## Toast, Skeleton, KeyboardShortcuts (lowest-risk first)

- [ ] Migrate `components/ui/Toast.tsx` to the Astryx toast/notification
      primitive (swizzled), preserving `useToast()`'s existing call
      signature so no call site changes.
- [ ] Run `tests/components/toast.test.tsx`; update only assertions tied
      to markup that intentionally changed, and confirm it passes.
- [ ] Migrate `components/ui/Skeleton.tsx` to the Astryx skeleton/loading
      primitive if one exists; otherwise leave as-is and record why.
- [ ] Run `tests/components/skeleton.test.tsx` and confirm it passes.
- [ ] Migrate `components/ui/KeyboardShortcuts.tsx`'s modal chrome to the
      Astryx dialog primitive, preserving the documented shortcut list
      content unchanged.

## Navbar

- [ ] Replace `Navbar.tsx`'s hand-rolled export dropdown with the real
      (non-spike) Astryx menu component, reusing the pattern proven in
      Phase 14's spike.
- [ ] Migrate the remaining Navbar buttons (import, image insert, preview
      toggle, zen mode, settings, shortcuts) to Astryx button primitives,
      preserving every existing `aria-label`/`title`/`aria-pressed`.
- [ ] Run `tests/components/navbar.test.tsx` and confirm it passes with
      no assertion deletions beyond ones tied to intentionally-changed
      markup.

## Sidebar and modals

- [ ] Replace `Sidebar.tsx`'s `CollapsibleSection` with the Astryx
      disclosure/accordion primitive; verify `servicesOpen`/`importOpen`/
      `saveOpen`/`documentsOpen` reducer wiring still drives it correctly.
- [ ] Migrate `SettingsModal.tsx`, `DeleteConfirmModal.tsx`, and the five
      cloud-provider modals (`GitHubModal`, `DropboxModal`,
      `GoogleDriveModal`, `OneDriveModal`, `BitbucketModal`) to the Astryx
      dialog primitive, preserving each modal's `isOpen`/`onClose`/`mode`
      prop contract so hook call sites in `Sidebar.tsx` don't change.
- [ ] Run `tests/components/settings-modal.test.tsx`,
      `tests/components/github-modal.test.tsx`, and
      `tests/components/delete-confirm-modal.test.tsx`; confirm all pass.
- [ ] Manually verify focus-trap behavior in one migrated modal (tab
      cycles within the dialog, doesn't escape to the page behind it) —
      this is a real behavior check the automated tests may not cover.

## UI-6: real light/dark/system theming

- [ ] Add a theme selector (light/dark/system) to `SettingsModal.tsx`,
      wired to `UserSettings` in `lib/types` and persisted via the
      existing Zustand persistence path — no new storage mechanism.
- [ ] Confirm the selector toggles the `<html>` class Phase 14 verified
      drives both Tailwind `dark:` utilities and Astryx theme tokens.
- [ ] Add or update a test asserting the theme setting persists across a
      reload (extending the existing store persistence tests in
      `tests/store/store.test.ts`).
- [ ] Manually verify every migrated component (Navbar, Sidebar, modals,
      toast) renders correctly in both light and dark mode — screenshot
      both for the Phase 18 visual-regression baseline.

## UI-2: formatting toolbar

- [ ] Build a toolbar component (Astryx button-group primitive) above
      `MonacoEditor.tsx` with bold/italic/heading/list/link/code/table/
      math/diagram insert actions, each calling
      `insertMarkdownAtCursor` (already exists in `stores/store.ts`) —
      no new state-mutation path needed.
- [ ] Verify each toolbar action's inserted markdown renders correctly in
      `MarkdownPreview.tsx` (existing preview pipeline, no changes needed
      there).
- [ ] Add `tests/components/` coverage for the toolbar: one test per
      action verifying the correct markdown snippet is inserted.
- [ ] Verify every toolbar button meets the Phase 13 UI-7 accessibility
      gate (keyboard-reachable, labeled, focus-visible ring).

## UI-3: editor/preview scroll-sync

- [ ] Wire `editorScrollPercent`/`editorTopLine` (already tracked in
      `stores/store.ts`) to drive `MarkdownPreview.tsx`'s scroll position,
      or confirm and fix why existing wiring (if the clarification pass
      found it partially present) isn't working end-to-end.
- [ ] Add an E2E test (`tests/e2e/`) that scrolls the editor and asserts
      the preview pane scrolls proportionally.

## UI-4: Mermaid/diagram support

- [ ] Add the diagram library chosen in the clarification pass as a
      dynamic, client-only import (matching the existing Monaco/Sidebar
      `dynamic(..., { ssr: false })` pattern in `EditorContainer.tsx`).
- [ ] Extend the markdown rendering pipeline (`lib/markdown.ts` or
      equivalent) to detect fenced ```mermaid blocks and render them as
      diagrams in `MarkdownPreview.tsx`, sanitizing output with DOMPurify
      per this repo's existing XSS-prevention rule (`CLAUDE.md` Security
      Guidelines).
- [ ] Add a unit test in `tests/lib/markdown.test.ts` covering a mermaid
      code block rendering to a diagram container element.
- [ ] Add the toolbar's diagram-insert action (from UI-2) to insert a
      starter ```mermaid fence.

## UI-5: command palette

- [ ] Build a ⌘K/Ctrl+K command palette (Astryx pattern-library
      component if one exists for this; otherwise swizzle the closest
      primitive) listing: switch document, toggle preview, toggle zen
      mode, each export format, each toolbar formatting action, open
      settings.
- [ ] Wire the existing keyboard-shortcut registration approach (see
      `KeyboardShortcuts.tsx`/existing Cmd+Shift+Z handling) to open the
      palette, and add the new shortcut to the documented shortcut list.
- [ ] Add `tests/components/` coverage: palette opens on shortcut, filters
      by typed text, executes the selected action and closes.
- [ ] Note in a code comment (not a doc file) that this palette is the
      integration point Phase 17's AI-3 in-editor AI actions extend —
      no implementation of AI-3 itself happens in this phase.

## Full regression pass

- [ ] Run `npm run verify` (lint + typecheck + unit + E2E) end-to-end on
      the fully migrated branch and confirm it's green.
- [ ] Run `npx vitest run --coverage` and confirm coverage does not drop
      below the CLAUDE.md-documented baseline (98% statements / 91%
      branches / 99.5% functions / 98% lines) — add tests for any
      migrated component that dips below its prior per-file coverage.
- [ ] Check this phase off in `spec/README.md` once every task and gate
      above is complete and green.
