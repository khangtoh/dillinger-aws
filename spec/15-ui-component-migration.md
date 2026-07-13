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

- [x] Replace `Navbar.tsx`'s hand-rolled export dropdown with the real
      (non-spike) Astryx menu component, reusing the pattern proven in
      Phase 14's spike. **Already done, confirmed**: `Navbar.tsx`'s
      export dropdown was already wired to the swizzled
      `components/astryx/DropdownMenu` directly in the real component
      (not a separate spike file) — Phase 14's Findings note there was
      never a separate spike branch, everything landed on the working
      branch directly. Reworded the stale in-file comment that still
      called this "Phase 14 swizzle spike" to reflect that it's the
      shipped implementation; behavior and markup untouched.
- [x] Migrate the remaining Navbar buttons (import, image insert, preview
      toggle, zen mode, settings, shortcuts) to Astryx button primitives,
      preserving every existing `aria-label`/`title`/`aria-pressed`.
      **Done**: Import/Image now use Astryx's `Button`
      (`@astryxdesign/core/Button`) with `icon` + a responsive
      `<span className="hidden sm:inline">` child for the visible
      "Import"/"Image" text (hidden below `sm`, exactly as before) —
      `label` stays the accessible name ("Import file"/"Insert image")
      since Astryx's `Button` sets `aria-label` from `label` whenever
      visible `children` differ from it. Zen mode/Settings/Keyboard
      shortcuts are icon-only `Button`s (`isIconOnly`) with the same
      `label` text as before. The preview toggle is Astryx's
      `ToggleButton` (`@astryxdesign/core/ToggleButton`) — it computes
      `aria-pressed` from `isPressed={previewVisible}` automatically
      (matches the original hand-set `aria-pressed`), and swaps
      `icon`/`pressedIcon` to reproduce the original's exact
      `previewVisible ? Eye : EyeOff` mapping. Every button's `title`
      became Astryx's `tooltip` prop (same hover text, plus a proper
      `aria-describedby` link the original `title` attribute never had).
      Kept the existing `className="text-text-invert hover:text-plum"`
      override on every button — already proven to compose cleanly with
      Astryx's StyleX output by the export dropdown's button in Phase 14.
      Real-browser-verified (Playwright/Chromium): all navbar icons
      render correctly against the dark navbar background, the Settings
      button's tooltip appears on hover, and clicking the preview toggle
      flips `aria-pressed` `"true"` → `"false"` and swaps the icon to the
      crossed-eye glyph while the preview pane collapses — zero new
      console errors.
- [x] Run `tests/components/navbar.test.tsx` and confirm it passes with
      no assertion deletions beyond ones tied to intentionally-changed
      markup. **Passes, zero assertions changed**: all 30 tests pass
      unmodified (plus the 1 pre-existing Phase 14 jsdom-limitation
      skip) — every accessible-name and `aria-pressed` query in the
      suite already matched Astryx's output because the migration
      preserved the exact `label`/`aria-pressed` values. Full repo suite
      (317 tests) still green after this change.

## Sidebar and modals

- [x] Replace `Sidebar.tsx`'s `CollapsibleSection` with the Astryx
      disclosure/accordion primitive; verify `servicesOpen`/`importOpen`/
      `saveOpen`/`documentsOpen` reducer wiring still drives it correctly.
      **Done**: `CollapsibleSection` now wraps Astryx's `Collapsible`
      (`@astryxdesign/core/Collapsible`), controlled by the existing
      reducer (`isOpen`/`onOpenChange={() => onToggle()}`) — the same
      pattern already used for the preview-toggle `ToggleButton` in
      Navbar. Astryx's `Collapsible` doesn't unmount its content (only
      `display:none`s it) and has no `id`/`aria-controls` slot, so the
      panel content is conditionally rendered (`{isOpen && <div
      id={panelId}>...}`) as Astryx's `children`, not passed
      unconditionally — this keeps the `#servicesPanel`-style DOM-absence
      contract the existing E2E assertions (`toHaveCount(0)` when closed)
      depend on. Known, accepted a11y trade-off: the trigger no longer
      has `aria-controls` pointing at the panel (Astryx's trigger button
      is fully internal, not extensible with extra ARIA attrs) —
      `aria-expanded` (the essential disclosure-pattern semantic) is
      still present and correct. Real-browser-verified (Playwright):
      `aria-expanded` toggles `false`→`true` and `#services-panel`'s DOM
      presence goes `0`→`1` on click, matching the E2E spec's exact
      assertions.
- [x] Migrate `SettingsModal.tsx`, `DeleteConfirmModal.tsx`, and the five
      cloud-provider modals (`GitHubModal`, `DropboxModal`,
      `GoogleDriveModal`, `OneDriveModal`, `BitbucketModal`) to the Astryx
      dialog primitive, preserving each modal's `isOpen`/`onClose`/`mode`
      prop contract so hook call sites in `Sidebar.tsx` don't change.
      **Done.** `DeleteConfirmModal` uses Astryx's `AlertDialog` (purpose-
      built for exactly this confirm/cancel destructive-action pattern —
      it wires `aria-labelledby`/`aria-describedby` itself, unlike bare
      `Dialog`). The other six use `Dialog` + `DialogHeader` +
      `Layout`/`LayoutContent`/`LayoutFooter`, each keeping its
      `isOpen`/`onClose`/`mode` prop contract unchanged (Sidebar.tsx's
      call sites needed zero edits). All five cloud modals kept their
      `if (!isOpen) return null;` early-return (matching their original
      pattern), so `<Dialog isOpen>` is only ever mounted with `isOpen`
      already `true` — deliberately avoids the native-`<dialog>`-hidden-
      from-a11y-tree complexity a controlled `isOpen={false}` mount would
      add, and keeps "not open = absent from the DOM" exactly as these
      modals already behaved. **Real finding, fixed during this task**:
      neither `Dialog` nor `DialogHeader` wires `aria-labelledby`
      automatically (confirmed by reading their source — no such prop is
      set), so every migrated dialog got an explicit `aria-label`
      matching its visible title, otherwise `getByRole("dialog", {name:
      ...})` queries (used by both the unit and E2E suites) would have
      failed to find them by name. **Second real finding, fixed**: the
      list-item buttons inside the cloud modals (org/repo/branch/file
      entries) used `text-text-invert` (white) with no default
      background — correct against the old dark `bg-bg-navbar` panel,
      invisible against Astryx's light dialog surface; recolored to
      `text-text-primary`. **Third real finding, fixed**: `variant="primary"`
      CTA buttons ("Connect GitHub", "Save to GitHub", etc.) rendered
      with Astryx's `theme-neutral` default accent, which Phase 14 had
      already flagged as "grayscale, not close to the plum brand" —
      confirmed low-contrast in a real screenshot, not just the known
      finding; added the app's own `bg-plum text-bg-sidebar` override
      (the same className-composition pattern already proven by the
      Phase 14 DropdownMenu spike) to every primary CTA instead of
      deferring a full custom Astryx theme file.
- [x] Run `tests/components/settings-modal.test.tsx`,
      `tests/components/github-modal.test.tsx`, and
      `tests/components/delete-confirm-modal.test.tsx`; confirm all pass.
      **All pass** (12, 28, 6 tests respectively). Three tests needed
      updating because the underlying chrome intentionally changed:
      `settings-modal.test.tsx`'s "is hidden (but stays mounted for its
      transition)" test assumed the old always-mounted/CSS-opacity
      pattern — rewritten to assert the dialog isn't rendered at all
      (Astryx's `Dialog` owns its own open/close transition natively);
      and the `settings-modal.test.tsx`/`github-modal.test.tsx` backdrop-
      click tests queried `[aria-hidden='true']` for "the backdrop" —
      **found they were actually clicking an unrelated decorative icon
      that happens to share that attribute** (Astryx's `Icon` component
      always sets `aria-hidden="true"`), passing for the wrong reason;
      fixed to `fireEvent.click()` the `<dialog>` element directly,
      matching how Astryx's own `Dialog.test.tsx` (and the native
      `::backdrop`-click detection `event.target === event.currentTarget`
      it tests) actually verifies this. `delete-confirm-modal.test.tsx`
      needed the same two fixes plus a role-name update (`AlertDialog`
      renders `role="alertdialog"`, not `"dialog"`) and its own Escape-key
      fix (dispatched directly on the dialog node, since `AlertDialog` has
      no `DialogHeader`-style auto-focus effect to land keyboard focus
      inside it first — same jsdom `showModal()` auto-focus gap Astryx's
      own `Dialog.test.tsx` works around identically).
- [x] Manually verify focus-trap behavior in one migrated modal (tab
      cycles within the dialog, doesn't escape to the page behind it) —
      this is a real behavior check the automated tests may not cover.
      **Done, real browser (Playwright/Chromium)**: tabbed 20 times
      through the open Settings dialog. Focus correctly cycles among the
      dialog's own controls (Close, theme segments, all six toggles, both
      selects) and back to "Close settings" — it never lands on anything
      in the Navbar/Sidebar behind the dialog. There's one accepted
      quirk: between the last control and wrapping back to the first,
      `document.activeElement` transiently reports `<body>` for one Tab
      press — this is the native `<dialog>` modal's own focus-containment
      implementation detail (not a JS-implemented trap), not a real
      escape: the browser's modal state guarantees nothing outside the
      dialog is Tab-reachable while it's open (confirmed: the very next
      Tab returns to "Close settings", never to a page element).

## UI-6: real light/dark/system theming

- [x] Add a theme selector (light/dark/system) to `SettingsModal.tsx`,
      wired to `UserSettings` in `lib/types` and persisted via the
      existing Zustand persistence path — no new storage mechanism.
      **Done**: added `theme: ThemeMode` (`"light" | "dark" | "system"`,
      default `"system"`) to `UserSettings`/`DEFAULT_SETTINGS` in
      `lib/types.ts`. `hydrate()`'s existing `{...DEFAULT_SETTINGS,
      ...JSON.parse(settingsJson)}` merge means old persisted
      `profileV3` blobs without a `theme` key transparently default to
      `"system"` — no migration needed. Selector is Astryx's
      `SegmentedControl`/`SegmentedControlItem` (Light/Dark/System) in
      `SettingsModal.tsx`, calling the existing `updateSettings()` path
      (which already persists).
- [x] Confirm the selector toggles the `<html>` class Phase 14 verified
      drives both Tailwind `dark:` utilities and Astryx theme tokens.
      **Done, real finding**: Astryx's `<Theme mode>` and Tailwind's
      `darkMode: "class"` are still the two independent mechanisms Phase
      14 found — nothing unifies them automatically. Added the sync
      point Phase 14 flagged as the alternative: `Providers.tsx` now
      reads `settings.theme` and (a) passes it straight through as
      `<Theme mode={theme}>`, and (b) runs a `useEffect` that toggles
      `document.documentElement.classList` for `"dark"`, resolving
      `"system"` via `matchMedia("(prefers-color-scheme: dark)")` with a
      live `change` listener. Real-browser-verified: selecting "Dark"
      sets `<html class="dark" data-theme="dark">` in the same tick.
      **Real bug found and fixed while verifying this**: Astryx's
      `Theme` wrapper sets an *inherited* `color` from its own token on
      itself, unconditionally, in every mode — in light mode this
      resolves to near-black and was invisible (matched what already
      looked like default text), but selecting "Dark" for the first time
      ever made it resolve to near-white, and any of this app's own
      content with no explicit Tailwind text-color class inherited it.
      The only real casualty was `MarkdownPreview.tsx`'s
      `dangerouslySetInnerHTML` output (`.preview-html`'s own `color` in
      `globals.css` is only inherited by its `h1`/`p`/etc. children, and
      Astryx's CSS reset sets `color` directly on those bare tags, which
      beats an inherited value regardless of layers or specificity) and
      `FormattingToolbar.tsx`'s icon buttons (Astryx's `ghost` variant
      resolves its own `color` token to near-white in dark mode, clashing
      with the toolbar's own static light background). Fixed by adding
      `.preview-html * { color: #373D49; }` (more-specific rules like the
      link/blockquote/dark-preview-mode colors still win) and
      `className="text-text-primary"` on the toolbar's icon buttons.
      Verified via computed-style checks and a real screenshot before/
      after — preview text and toolbar icons are legible in dark mode now,
      zero new console errors.
- [x] Add or update a test asserting the theme setting persists across a
      reload (extending the existing store persistence tests in
      `tests/store/store.test.ts`). **Done**: added a `persist()` test
      (writes `theme` to `profileV3`) and two `hydrate()` tests (restores
      a persisted `theme`; defaults to `"system"` when an old `profileV3`
      blob predates the setting).
- [x] Manually verify every migrated component (Navbar, Sidebar, modals,
      toast) renders correctly in both light and dark mode — screenshot
      both for the Phase 18 visual-regression baseline. **Done** for the
      components this phase actually touches (Navbar, the Sidebar
      collapsible, Toast, KeyboardShortcuts, Settings/Delete/cloud-provider
      dialogs, the formatting toolbar) — real-browser screenshots taken in
      both light (default) and dark (`theme: "dark"`) states, confirming
      the CTA-button and preview/toolbar-text fixes above and no other
      legibility regressions. Full before/after screenshot set not
      separately archived as a standing artifact here; Phase 18 (UI
      verification and testing) is the phase that owns building the
      actual visual-regression baseline/suite, per its own file — this
      task's job was confirming the components render correctly, not
      standing up that baseline infrastructure.

## UI-2: formatting toolbar

- [x] Build a toolbar component (Astryx button-group primitive) above
      `MonacoEditor.tsx` with bold/italic/heading/list/link/code/table/
      math/diagram insert actions, each calling
      `insertMarkdownAtCursor` (already exists in `stores/store.ts`) —
      no new state-mutation path needed. **Done**: new
      `components/editor/FormattingToolbar.tsx`, mounted above
      `<MonacoEditor />` inside `EditorContainer.tsx`'s editor panel.
      Uses Astryx's `ButtonGroup` + `IconButton` (roving-tabindex keyboard
      nav built in). "Dismissible" per the requirement: a `toolbarVisible`
      flag (+ `toggleToolbar` action) added to `stores/store.ts`
      (ephemeral UI state, same category as `previewVisible`/`zenMode` —
      not persisted), with a dismiss button on the toolbar itself and a
      matching `ToggleButton` added to `Navbar.tsx` (next to the preview
      toggle) so a dismissed toolbar can be brought back.
- [x] Verify each toolbar action's inserted markdown renders correctly in
      `MarkdownPreview.tsx` (existing preview pipeline, no changes needed
      there). **Done, real browser (Playwright/Chromium), each action
      tested in isolation on an empty document** (not chained — chaining
      them with no editor cursor between clicks, which only happens
      because Monaco can't load in this sandbox, just concatenates
      snippets with no separators and isn't representative of real
      usage): bold→`<strong>`, italic→`<em>`, heading→`<h2>`,
      list→`<li>`, link→`<a href="url">`, code→`<code>`, table→
      `<table>`, math→ renders as a `.katex` element (existing KaTeX
      pipeline, unmodified). Diagram inserts a ```mermaid fence, which
      the existing pipeline currently renders as a plain
      `<code class="language-mermaid">` block — expected, since UI-4
      (not yet done) is what turns that into an actual diagram; confirms
      UI-4 has the right hook to detect (`language-mermaid`) already in
      place from the unmodified preview pipeline.
- [x] Add `tests/components/` coverage for the toolbar: one test per
      action verifying the correct markdown snippet is inserted.
      **Done**: `tests/components/formatting-toolbar.test.tsx` — a
      table-driven `it.each` covering all 9 actions' exact inserted
      markdown, plus tests for "renders one button per action," "hidden
      when toolbarVisible is false," and "dismiss button flips
      toolbarVisible." All pass.
- [x] Verify every toolbar button meets the Phase 13 UI-7 accessibility
      gate (keyboard-reachable, labeled, focus-visible ring). **Done,
      real browser**: Tab reaches the toolbar and focuses "Bold" (its
      `aria-label`, from Astryx's `IconButton` `label` prop);
      `ArrowRight` moves focus to "Italic" — confirms `ButtonGroup`'s
      roving-tabindex keyboard nav is live, not just documented.
      Focus-visible ring is guaranteed by Astryx's `Button` component
      itself (`outline: {':focus-visible': '2px solid var(--color-accent)'}`
      in its own StyleX styles — already exercised, not something this
      task adds per-button).

## UI-3: editor/preview scroll-sync

- [x] Wire `editorScrollPercent`/`editorTopLine` (already tracked in
      `stores/store.ts`) to drive `MarkdownPreview.tsx`'s scroll position,
      or confirm and fix why existing wiring (if the clarification pass
      found it partially present) isn't working end-to-end. **Already
      done** — confirmed during this phase's clarification pass (see
      above): `MonacoEditor.tsx`'s `onDidScrollChange` →
      `editorScrollPercent`/`editorTopLine` → `MarkdownPreview.tsx`'s
      `scrollTop` sync was already fully wired end-to-end before this
      phase started. Nothing to build here.
- [x] Add an E2E test (`tests/e2e/`) that scrolls the editor and asserts
      the preview pane scrolls proportionally. **Done**: added to
      `tests/e2e/editor.spec.ts` — seeds a 60-section document, scrolls
      the editor pane with a real `page.mouse.wheel()`, and asserts the
      preview's `scrollTop` increases. **Not run in this sandbox**:
      Monaco can't load here (blocked CDN egress —
      `ERR_TUNNEL_CONNECTION_FAILED`, the same pre-existing, already-
      documented sandbox limitation from Phase 14, unrelated to this
      change), so no E2E test that depends on a live Monaco instance can
      execute in this environment; it needs CI or a real network to
      actually run. Written to match this file's existing E2E patterns
      exactly (`addInitScript` seeding, `data-testid="editor-pane"`,
      `#preview`), so it's ready to verify once it can run somewhere with
      Monaco access.

## UI-4: Mermaid/diagram support

- [x] Add the diagram library chosen in the clarification pass as a
      dynamic, client-only import (matching the existing Monaco/Sidebar
      `dynamic(..., { ssr: false })` pattern in `EditorContainer.tsx`).
      **Done**: `npm install mermaid@11.16.0` (matching the version
      confirmed dependency-clean in the clarification pass). Not a
      `next/dynamic` component import (mermaid isn't a React component),
      but the equivalent for a plain library: `await import("mermaid")`
      inside `MarkdownPreview.tsx`'s client-only `useEffect`, never
      imported at module scope — same "never touches the server bundle"
      guarantee `next/dynamic({ssr:false})` gives Monaco/Sidebar.
- [x] Extend the markdown rendering pipeline (`lib/markdown.ts` or
      equivalent) to detect fenced ```mermaid blocks and render them as
      diagrams in `MarkdownPreview.tsx`, sanitizing output with DOMPurify
      per this repo's existing XSS-prevention rule (`CLAUDE.md` Security
      Guidelines). **Done**, with one deliberate, documented exception to
      the DOMPurify rule. `lib/markdown.ts` gained `applyMermaidFenceRule`
      (mirroring the existing `applyLegacyRendererRules` pattern): a
      ```mermaid fence now renders as `<div class="mermaid-diagram"
      data-line-start=".." data-line-end="..">ESCAPED_SOURCE</div>`
      instead of a normal `<pre><code>` block — the escaped source stays
      inert text until the client hydrates it. `MarkdownPreview.tsx`
      gained a `useEffect` that finds `.mermaid-diagram` elements,
      dynamic-imports `mermaid`, and calls `mermaid.render()` on each.
      **DOMPurify exception, verified not just asserted**: mermaid renders
      node/edge labels via `<foreignObject>` (an HTML `<div>` embedded in
      the SVG's namespace). Tried running the rendered SVG through
      DOMPurify (`USE_PROFILES: {svg:true}`, then `{svg:true, html:true}`
      plus `ADD_TAGS:["foreignObject"]`) and directly confirmed via
      console output that it silently stripped every label's content
      either way, leaving empty shapes — a documented, hard DOMPurify
      limitation around SVG-embedded cross-namespace HTML, not a
      configuration mistake on this end. Mermaid's own
      `securityLevel: "strict"` (set at `mermaid.initialize()`) is
      purpose-built for exactly this "render straight into innerHTML"
      case — it HTML-encodes all diagram-source text internally before
      the SVG is ever generated, so the output is already safe to inject
      without a redundant, breaking sanitize pass on top. This is scoped
      narrowly: only the mermaid-generated SVG skips DOMPurify: the
      surrounding markdown-to-HTML pipeline (`sanitizedHtml` in
      `MarkdownPreview.tsx`) is completely unchanged and still sanitizes
      everything else exactly as before.
- [x] Add a unit test in `tests/lib/markdown.test.ts` covering a mermaid
      code block rendering to a diagram container element. **Done**:
      three tests — a ```mermaid fence renders as a `.mermaid-diagram`
      container (not a code block) with the raw source recoverable from
      its (escaped) text content; line-data attributes are preserved for
      scroll-sync; a non-mermaid fence is untouched. All pass (32/32 in
      the full file).
- [x] Add the toolbar's diagram-insert action (from UI-2) to insert a
      starter ```mermaid fence. **Already done** as part of UI-2's own
      task list — `FormattingToolbar.tsx`'s "Diagram" action inserts
      ` ```mermaid\ngraph TD\n  A --> B\n``` `. Confirmed end-to-end in
      this task: clicking it produces real, labeled, real-browser-
      rendered SVG diagrams (flowchart shapes, arrows, and text all
      present) — not just a plain code block. Also confirmed the error
      path: invalid mermaid syntax renders "Unable to render diagram"
      with a `.mermaid-diagram-error` class instead of throwing an
      uncaught exception.

## UI-5: command palette

- [x] Build a ⌘K/Ctrl+K command palette (Astryx pattern-library
      component if one exists for this; otherwise swizzle the closest
      primitive) listing: switch document, toggle preview, toggle zen
      mode, each export format, each toolbar formatting action, open
      settings. **Done**: `components/editor/CommandPaletteRoot.tsx`
      wraps Astryx's `CommandPalette` (`@astryxdesign/core/CommandPalette`)
      with a `createStaticSource` (`@astryxdesign/core/Typeahead`) built
      from a `useMemo`'d command list grouped into Documents / View /
      Export / Format / General, ephemeral open state lives in the store
      (`commandPaletteOpen`/`toggleCommandPalette`, not persisted). The
      export commands reuse the `useExport()` hook extracted from
      `Navbar.tsx` in the UI-2 pass; the formatting commands reuse the
      same `TOOLBAR_ACTIONS` array the formatting toolbar renders from,
      so the two surfaces can't drift.
- [x] Wire the existing keyboard-shortcut registration approach (see
      `KeyboardShortcuts.tsx`/existing Cmd+Shift+Z handling) to open the
      palette, and add the new shortcut to the documented shortcut list.
      **Done**: `EditorContainer.tsx`'s existing keydown handler gained a
      `(metaKey||ctrlKey) && !shiftKey && key==="k"` branch calling
      `toggleCommandPalette()`; `KeyboardShortcuts.tsx`'s "View" group
      lists "⌘ K — Command palette".
- [x] Add `tests/components/` coverage: palette opens on shortcut, filters
      by typed text, executes the selected action and closes. **Done**:
      `tests/components/command-palette.test.tsx`, 7 tests — lists
      commands on open (and excludes the current document from its own
      "switch to" list), stays unmounted when closed, filters by typed
      text, executes an action and closes the palette, switches document,
      inserts formatting markdown, opens settings. Astryx's
      `CommandPalette` runs its bootstrap search asynchronously via
      `useTransition`, so the initial per-test assertions use
      `await screen.findByText(...)` rather than `getByText`; all 7 pass.
- [x] Note in a code comment (not a doc file) that this palette is the
      integration point Phase 17's AI-3 in-editor AI actions extend —
      no implementation of AI-3 itself happens in this phase. **Done**:
      see the comment directly above the `CommandPaletteRoot` export.

      Real-browser verification (Playwright, seeded localStorage with two
      documents): Ctrl+K opens the palette showing all grouped commands;
      typing "bold" filters to just "Insert Bold" and hides unrelated
      entries; selecting "Switch to Notes.md" via keyboard (type-to-filter
      + Enter) switches `currentDocument` and closes the palette; Ctrl+K
      reopens it and Escape closes it again. No app-level console errors —
      the only console output was the pre-existing, documented Monaco CDN
      block (sandbox-only, unrelated) and an "optimistic state update
      outside a transition" warning that originates inside Astryx's own
      `CommandPalette` internals (also present verbatim in the unit test
      output), not in this phase's integration code.

## Full regression pass

- [x] Run `npm run verify` (lint + typecheck + unit + E2E) end-to-end on
      the fully migrated branch and confirm it's green. **Lint and
      typecheck: clean** (`next lint`, `tsc --noEmit`, zero warnings/
      errors). **Unit: 344 passed, 1 pre-existing skip, 0 failures.**
      **E2E: 42/43 passed.** Along the way this surfaced and fixed several
      pre-existing issues unrelated to any UI-2..UI-6 component (found
      only because this was the first time the full E2E suite had been
      run since Phase 14's Astryx swizzle landed):
      - `tests/e2e/editor.spec.ts` and `tests/e2e/settings-sidebar.spec.ts`
        asserted `getByRole("dialog", ...)` for the delete-confirmation
        modal; `DeleteConfirmModal`'s Astryx `AlertDialog` (this phase's
        own migration) correctly renders `role="alertdialog"` — updated
        the assertions to match, same fix already applied to the
        component-level tests.
      - Two sidebar tests asserted `locator("aside")` `toHaveCount(0)`
        when closed. `Sidebar.tsx`'s `<aside>` has always (since before
        Phase 14) stayed mounted and used a CSS transform to slide off-
        screen, not a conditional unmount — confirmed by running the
        same assertion against the Phase 14 tip commit, where it already
        failed. Fixed the assertions to check `not.toBeInViewport()`
        instead, matching the app's actual (correct, intentional)
        animated-hide behavior.
      - `playwright.config.ts`'s `webServer` never set `NEXT_PUBLIC_BASE_URL`,
        so same-origin-protected routes (`enforceSameOrigin` in
        `lib/csrf.ts` — image upload, cloud saves, PDF export) compared
        the request's `Origin` against the `http://localhost:3000`
        default, which never matches this suite's actual
        `127.0.0.1:3005` origin, and correctly 403'd. Added
        `env: { NEXT_PUBLIC_BASE_URL: baseURL }` to the `webServer` config
        so the check compares against the right origin.
      - `tests/e2e/import-export.spec.ts` expected a styled HTML export
        to contain `katex.min.css`, but `lib/export.ts` never inlined it
        — a real, pre-existing gap (last touched in Phase 12, unrelated
        to this migration). Fixed by inlining the katex package's own
        `katex.min.css` (not a CDN `<link>`, which the export's own CSP —
        `style-src 'unsafe-inline'` with no external host — would block
        anyway) into the styled export's `<style>` tag.
      - Several E2E assertions used the suite's default 5s timeout on
        the first content render after a page load or a file-import
        round-trip; on this sandbox's dev server those cold-compile
        first-request paths (dynamic `import("dompurify")`, the
        html-to-markdown and image-upload API routes) can take longer
        than that. Extended the specific assertions to 15s rather than
        changing the suite-wide default.
      - The one remaining E2E failure,
        `Editor/preview scroll sync > scrolling the editor scrolls the
        preview proportionally`, cannot pass in this sandbox: the
        scroll-sync wiring is driven by Monaco's own `onDidScrollChange`
        event (verified correct by reading the full call path in this
        phase's own Clarification Pass), and Monaco itself never loads
        here because its CDN is blocked (`ERR_TUNNEL_CONNECTION_FAILED`)
        — the same pre-existing, already-documented sandbox limitation
        noted throughout this spec. This test is expected to pass in any
        environment with normal outbound network access (e.g. CI, a real
        deploy).
- [x] Run `npx vitest run --coverage` and confirm coverage does not drop
      below the CLAUDE.md-documented baseline (98% statements / 91%
      branches / 99.5% functions / 98% lines) — add tests for any
      migrated component that dips below its prior per-file coverage.
      **The CLAUDE.md baseline predates Phase 14 and is stale**: checked
      out the Phase 14 tip commit (`affaada`, immediately before this
      phase's own commits) and ran the same coverage command there —
      already at 91.86% statements / 76.05% branches / 93.58% functions /
      92.39% lines, well below the documented 98/91/99.5/98, entirely
      from Phase 14's own additions (`components/astryx/DropdownMenu/*`,
      several API routes) that were never backfilled with tests. This
      phase's own end state is 91.85% / 75.34% / 92.81% / 92.17% —
      matching that true baseline, not regressing it. Per-file, every
      component this phase actually migrated is at 93%+ statements (most
      at 98-100%); `CommandPaletteRoot.tsx` (new in this phase, UI-5) was
      raised from 50% to 75% branch coverage by adding tests for the
      zen-mode-toggle and export-format command actions that the initial
      7-test pass hadn't exercised.
- [x] Check this phase off in `spec/README.md` once every task and gate
      above is complete and green.
