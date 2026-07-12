# Phase 14 — Astryx Design-System Adoption Spike

Goal: prove, on a throwaway branch, that Astryx can coexist with this
app's Next.js 14 + Tailwind 3.4.1 stack without regressing anything, then
make an explicit go/no-go call before any real component migrates
(Phase 15).

Depends on: Phase 13 decisions (design system = Astryx, coexists with
Tailwind, matches current plum brand unless told otherwise).

## Working rules

- Every task in this phase must be independently completable and
  verifiable in isolation — this phase is the "prove it before you build
  on it" gate, so no task should be marked done on faith.
- This phase runs on a spike branch (`spike/astryx-adoption` or similar);
  nothing here touches `main` or the deploy branch until the go/no-go
  task at the end passes.
- If any P0 clarification task below surfaces a blocking incompatibility,
  stop, record it under "Findings," and route it back to Phase 13's
  Decisions section for revision rather than forcing the migration
  forward.

## Clarification pass (resolve before building anything)

A scheduled agent runs these first — each is a fast, checkable research
task, not a judgment call — so the spike below never starts on an
assumption that turns out to be wrong.

- [ ] Confirm the current published Astryx package names and versions on
      npm (`@astryxdesign/core`, `@astryxdesign/theme-neutral` or
      equivalent) match what Phase 13's research found; record the exact
      versions pinned.
- [ ] Confirm whether a theme closer to the plum accent (`#35D7BB`) ships
      out of the box, or whether Phase 13's "match current brand" default
      requires a custom theme file from day one; record the answer.
- [ ] Confirm Astryx's stated React version support explicitly covers
      React 18.x (this repo's `package.json` version), not just "18+"
      loosely worded in docs.
- [ ] Confirm whether Astryx's CSS `@layer` approach conflicts with this
      repo's existing `app/globals.css` (`@tailwind base/components/
      utilities` + a `katex` import + hand-written `.preview-html` rules)
      — read the current file, not just Phase 13's summary, before writing
      the merged version.
- [ ] Confirm Astryx's bundle-size impact is compatible with this
      project's Lambda-image and cold-start budget documented in
      `ARCHITECTURE.md` (server bundle only grows with server-rendered
      component code, not client CSS, but record the actual added KB to
      `.next/static` so Phase 18 has a before/after baseline).

## Spike: install and coexist

- [ ] Create the spike branch from the current UI-refresh working branch.
- [ ] `npm install` the pinned Astryx packages from the clarification pass.
- [ ] Add the documented `@layer` declarations and `@import`s to
      `app/globals.css`, preserving the existing `@tailwind` directives,
      the `katex` import, and all `.preview-html` rules — do not delete
      any current rule as part of this task.
- [ ] Run `npm run dev` and confirm the app boots with zero console errors
      introduced by the new CSS.
- [ ] Render one existing page (`/`) and confirm no existing Tailwind
      utility class visibly broke (screenshot or visual diff against a
      pre-spike baseline screenshot).

## Spike: one real component via swizzle

- [ ] Pick the single most duplicated pattern from Phase 13 Section A
      (the dismissible-panel logic shared by `Sidebar.tsx`'s
      `CollapsibleSection` and `Navbar.tsx`'s export dropdown) as the
      spike target — not a trivial button, so the spike actually tests
      the pattern this adoption is meant to fix.
- [ ] Use the Astryx CLI to swizzle the closest matching primitive
      (disclosure/accordion or menu component) into the project.
- [ ] Reimplement `Navbar.tsx`'s export dropdown using the swizzled
      component, on the spike branch only, leaving `Sidebar.tsx`
      untouched (full migration is Phase 15).
- [ ] Verify keyboard behavior matches or exceeds the original: `Escape`
      closes it, click-outside closes it, focus returns to the trigger
      button, `aria-expanded`/`aria-haspopup` are present.
- [ ] Verify the swizzled component picks up the plum accent (or the
      Phase 13-approved interim theme) without manual color overrides
      fighting the theme layer.
- [ ] Run the existing `tests/components/navbar.test.tsx` against the
      spiked component (adapt queries only if the DOM structure changed)
      and confirm it still passes.

## Spike: theming and dark mode

- [ ] Confirm Astryx's theme layer can be toggled by the same
      `darkMode: "class"` mechanism already configured in
      `tailwind.config.ts` (i.e., toggling a class on `<html>` flips both
      Tailwind's `dark:` utilities and Astryx's theme tokens together) —
      this is required for Phase 13's UI-6 requirement to be buildable
      without two separate theming systems.
- [ ] If it cannot, record the alternative wiring needed (e.g., a shared
      theme-provider that drives both) as a finding for Phase 15/16
      rather than silently working around it in the spike.

## Go / no-go decision

- [ ] Tally the clarification-pass and spike results against these gates:
      no console errors, no visual regression on `/`, dropdown spike
      matches or exceeds original a11y behavior, dark-mode toggle wiring
      resolved (with or without a workaround), bundle-size delta
      acceptable per the clarification-pass baseline.
- [ ] Write a dated "Findings" entry below with a clear **Go** or **No-go**
      call. A **No-go** must name the specific gate that failed and route
      back to Phase 13 rather than being silently abandoned.
- [ ] If **Go**: merge the spike branch's `package.json`/`globals.css`
      changes (but not the one-off `Navbar.tsx` spike component — that's
      superseded by Phase 15's real migration) into the UI-refresh working
      branch, and check this box to unblock Phase 15.
- [ ] If **No-go**: open a revision to Phase 13's "Design system" decision
      recording the alternative chosen (e.g., stay on hand-rolled
      Tailwind, or evaluate a second candidate) before Phase 15 starts.

## Findings

_(append dated entries here, e.g. "2026-07-15: Go — zero console errors,
dropdown spike passes a11y checks unchanged, dark-mode class toggle drives
both systems with no extra wiring, +14KB gzip to client CSS, acceptable.")_
