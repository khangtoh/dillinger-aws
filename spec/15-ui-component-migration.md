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

- [x] Re-read `components/*/CLAUDE.md` recent-activity notes for any
      component listed below to catch undocumented recent changes before
      migrating it (the repo's memory notes may be ahead of this spec).
      **Done**: `components/ui/CLAUDE.md`'s recent-activity table covers
      only Toast (z-index token, a11y attributes, the original custom
      implementation) — nothing undocumented in this spec. No recent-
      activity entries exist for Skeleton or KeyboardShortcuts beyond
      what this spec already describes.
- [x] For each of UI-3 (scroll-sync) and UI-4 (Mermaid/diagram support),
      confirm current behavior by exercising the running app first —
      Phase 13 flagged these as "confirm and close the gap, don't assume
      it's missing." Record what's actually there before writing tasks
      that assume a blank slate. **UI-3 is already fully wired, not
      missing**: `MonacoEditor.tsx`'s `onDidScrollChange` listener
      computes a scroll percent + top visible line and writes them to
      `editorScrollPercent`/`editorTopLine` in `stores/store.ts`;
      `MarkdownPreview.tsx` reads both and sets `scrollTop` on the
      preview container (line-anchor-based when `data-line-start`
      markers are present, percent-based fallback otherwise), gated by
      `settings.enableScrollSync` (default `true`). Confirmed by reading
      the full call path; could not additionally drive it with a live
      mouse-wheel scroll in this sandbox because Monaco itself fails to
      load here (blocked CDN egress, `ERR_TUNNEL_CONNECTION_FAILED` —
      the same pre-existing sandbox limitation Phase 14 already
      documented, unrelated to this change). **UI-4 is genuinely
      missing**, confirmed by grepping the whole repo for `mermaid`
      (zero matches in `lib/`, `components/`, or `package.json`) — this
      one really does need to be built from a blank slate.
- [x] Decide the Mermaid/diagram rendering library (e.g. `mermaid` npm
      package client-side-only, matching the existing dynamic-import
      pattern used for Monaco) and confirm it does not require a Lambda
      packaging change (no native binary, unlike `@sparticuz/chromium`) —
      if it does, stop and route to Phase 13/`ARCHITECTURE.md` review
      before continuing. **Decision: `mermaid` (npm, currently
      `11.16.0`)**. Checked its full dependency tree via
      `npm view mermaid dependencies`: every dependency is pure JS/TS
      (`d3`, `cytoscape`, `dompurify`, `katex`, `dagre-d3-es`, etc.) —
      no native/binary addons, unlike `@sparticuz/chromium`'s Lambda
      layer requirement. It will be dynamic-imported client-side-only
      (`dynamic(..., { ssr: false })`, matching the existing
      Monaco/Sidebar pattern), so it never runs in the Lambda server
      bundle at all — no packaging change needed. This decision and its
      implementation is UI-4's own task group below, not this group;
      recorded here per this checklist item's scope.

## Toast, Skeleton, KeyboardShortcuts (lowest-risk first)

- [x] Migrate `components/ui/Toast.tsx` to the Astryx toast/notification
      primitive (swizzled), preserving `useToast()`'s existing call
      signature so no call site changes. **Done**: `@astryxdesign/core`
      ships a full toast primitive (`Toast` + `ToastViewport` +
      `useToast()`), but its own `useToast()`/`ToastViewport` state
      machine has a different call signature (`ToastOptions.body`,
      `autoHideDuration`) than this app's `notify(message, duration?)` —
      adopting it wholesale would mean rewriting every call site listed
      in the working rules as "no call site changes." Instead: kept this
      file's own `ToastProvider`/`useToast()` context and state
      (`notify`, `dismiss`, the 150ms exit-delay before unmount) exactly
      as-is, and swapped only the per-toast **rendered markup** — the
      hand-rolled `<div>`/`<button><X/></button>` — for Astryx's
      presentational `Toast` component (`@astryxdesign/core/Toast`),
      which owns its own auto-hide timer via `isAutoHide`/
      `autoHideDuration` (driven by our existing `duration` value) and
      exposes the same `onDismiss` callback shape this file already
      used. The outer container (`role="status"`, `aria-live="polite"`,
      `aria-label="Notifications"`, `z-toast` positioning) is untouched.
      Real-browser-verified (Playwright/Chromium): clicking "Save
      Session" shows a correctly styled "Documents saved" toast with a
      working dismiss button, zero new console errors.
- [x] Run `tests/components/toast.test.tsx`; update only assertions tied
      to markup that intentionally changed, and confirm it passes.
      **Done, zero assertion changes needed**: all 7 tests passed
      unmodified — the outer container's role/aria-live/aria-label were
      preserved exactly, and Astryx's `Toast` dismiss button already uses
      `aria-label="Dismiss notification"` (its `label` prop), matching
      this suite's existing query.
- [x] Migrate `components/ui/Skeleton.tsx` to the Astryx skeleton/loading
      primitive if one exists; otherwise leave as-is and record why.
      **Left as-is — an Astryx `Skeleton` primitive exists
      (`@astryxdesign/core/Skeleton`) but doesn't fit here.** This file's
      `EditorSkeleton` is a full-page compound layout (`aside`/`main`
      structure, a dozen distinct pulse-block sizes) built entirely from
      this repo's Tailwind design-token classes (`w-sidebar`, `h-dvh`,
      `p-4`, etc., per `CLAUDE.md`'s styling conventions) — only the leaf
      pulse blocks are candidates for the primitive swap, and Astryx's
      `Skeleton` takes explicit numeric/CSS `width`/`height` props (no
      Tailwind sizing-class support), so migrating them would mean
      hand-translating every `h-8 w-32`/`h-6 w-24`/etc. utility into
      pixel props with no reuse benefit, breaking every existing
      Tailwind-class-based test assertion in the process. It's also a
      real behavior change, not just a markup swap: Astryx's `Skeleton`
      uses a `steps()` keyframe animation with a 1000ms pre-animation
      delay (deliberately avoiding a flash on fast loads), while this
      component's whole purpose is an *immediate* perceived-loading cue
      via Tailwind's `animate-pulse` — regressing that for a decorative,
      non-interactive element buys nothing. Kept unchanged.
- [x] Run `tests/components/skeleton.test.tsx` and confirm it passes.
      **Passes, unmodified** — no code changed, so no assertions needed
      updating.
- [x] Migrate `components/ui/KeyboardShortcuts.tsx`'s modal chrome to the
      Astryx dialog primitive, preserving the documented shortcut list
      content unchanged. **Done**: replaced the hand-rolled
      `role="dialog"`/backdrop/`useEffect` Escape-listener/focus-ref
      chrome with Astryx's `Dialog` + `DialogHeader` +
      `Layout`/`LayoutContent` (`@astryxdesign/core/Dialog`,
      `@astryxdesign/core/Layout`). Astryx's `Dialog` uses the native
      `<dialog>` element (`showModal()`), so `role="dialog"`/
      `aria-modal` are implicit rather than hand-set; Escape and
      backdrop-click dismissal are handled internally (`purpose="info"`
      default matches this modal's original click-outside-to-close
      behavior); `DialogHeader` auto-focuses its title `<h2>` on open
      (screen-reader convention) in place of the original's manual
      close-button focus; `LayoutContent` provides the scrollable body
      area in place of the original's manual `max-h-[60vh] overflow-y-
      auto`. The `SHORTCUT_GROUPS` data and its rendered markup
      (headings, `<kbd>` keys) are byte-for-byte unchanged, per this
      task's own instruction. No existing test file covers this
      component (`tests/components/` has none), so there were no
      assertions to update. Added a jsdom `HTMLDialogElement.prototype.
      showModal`/`close` shim to `vitest.setup.ts` (Astryx's own
      `Dialog.test.tsx` uses the identical shim) so any future test —
      and this suite's own environment — can render it; the full suite
      (317 tests) still passes with this shim in place, and it changes
      nothing for tests that don't touch a `<dialog>` element.
      Real-browser-verified (Playwright/Chromium): the `?` shortcut opens
      the dialog with correct title/close-button/backdrop styling and
      the full unmodified shortcut list, zero new console errors.

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
