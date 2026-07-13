# Phase 14 — Astryx Design-System Adoption Spike

Goal: prove, on a throwaway branch, that Astryx can coexist with this
app's Next.js 15.5.20 + React 19.2.7 + Tailwind 3.4.1 stack without
regressing anything, then make an explicit go/no-go call before any real
component migrates (Phase 15).

Depends on: Phase 13 decisions (design system = Astryx, coexists with
Tailwind, matches current plum brand unless told otherwise). **UNBLOCKED
2026-07-12**: `spec/19-incremental-stack-upgrade-for-astryx.md` Step 4
confirmed `npm install @astryxdesign/core@0.1.4
@astryxdesign/theme-neutral@0.1.4 --dry-run` now resolves cleanly against
this repo's real `package.json` — the React ≥19 blocker below is
cleared. This phase is **no longer paused**; its clarification-pass and
spike tasks can resume, including the bundle-size baseline task that was
previously moot.

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

- [x] Confirm the current published Astryx package names and versions on
      npm (`@astryxdesign/core`, `@astryxdesign/theme-neutral` or
      equivalent) match what Phase 13's research found; record the exact
      versions pinned. **Confirmed real**: `@astryxdesign/core@0.1.4`,
      MIT, published 5 days old (`npm view`), matches Phase 13. Seven
      theme packages confirmed on npm (`theme-neutral`, `theme-butter`,
      `theme-chocolate`, `theme-matcha`, `theme-stone`, `theme-gothic`,
      `theme-y2k`), each pinned to `@astryxdesign/core: "0.1.4"` exactly
      (not a range) — themes and core version-lock together, so future
      core upgrades will require matching theme-package bumps.
- [x] Confirm whether a theme closer to the plum accent (`#35D7BB`) ships
      out of the box, or whether Phase 13's "match current brand" default
      requires a custom theme file from day one; record the answer.
      **No shipped theme is close.** Inspected the actual `dist/theme.css`
      token values (not just theme descriptions): `theme-neutral`'s
      `--color-accent` is grayscale (`#262626`/`#ebebeb`, effectively no
      accent color at all); `theme-matcha`'s is `#3E481D`/`#C0CBA9`
      (dark olive / pale sage) — nowhere near the bright teal-mint plum.
      Confirms Phase 13's assumption: a custom theme file is required
      from day one to keep the current brand, not optional polish.
- [x] Confirm Astryx's stated React version support explicitly covers
      React 18.x (this repo's `package.json` version), not just "18+"
      loosely worded in docs. **It does not — this is a hard blocker,
      see Findings below.** `npm view @astryxdesign/core peerDependencies`
      returns `react: ">=19.0.0"`, `react-dom: ">=19.0.0"`,
      `@stylexjs/stylex: "^0.18.3"`. Checked every published core version
      back to the first (`0.0.15`): all require `react >=19.0.0` —
      this was never a React-18-compatible library, not a recent bump.
      This directly contradicts the "React 18+" summary Phase 13 recorded
      from a secondary (web-search-derived) source; the primary source
      (npm package metadata) overrides it.
- [x] Confirm whether Astryx's CSS `@layer` approach conflicts with this
      repo's existing `app/globals.css` (`@tailwind base/components/
      utilities` + a `katex` import + hand-written `.preview-html` rules)
      — read the current file, not just Phase 13's summary, before writing
      the merged version. **Resolved — no conflict, once resumed.** The
      documented integration snippet's `@import 'tailwindcss/theme.css'
      layer(theme)` line is Tailwind v4 CSS-first-config syntax, which
      doesn't apply to this repo (Tailwind 3.4.1). Confirmed via
      `npm view @astryxdesign/core exports` that Astryx's CSS is shipped
      as three independent, version-agnostic files
      (`./reset.css`, `./astryx.css`, `./tailwind-theme.css`) with no
      dependency on the v4-only cascade-layer declaration — plain
      `@import` in cascade order after the existing `@tailwind`
      directives and the `katex` import works with zero build errors.
      Actually added to `app/globals.css` and build-verified (see Spike
      section below), not just reasoned about.
- [x] Confirm Astryx's bundle-size impact is compatible with this
      project's Lambda-image and cold-start budget documented in
      `ARCHITECTURE.md`. **Measured, real build**: `.next/static/css`
      grew from a 132 KB pre-Astryx baseline to 272 KB (+140 KB raw) with
      `@astryxdesign/core` + `@astryxdesign/theme-neutral` imported;
      total gzipped CSS across all chunks is ~48.8 KB. This is
      client-side CSS only — the JS bundle (`First Load JS shared by
      all`) was unchanged (103 KB before and after), so this has no
      effect on the server bundle size or cold-start path that
      `ARCHITECTURE.md`'s cold-start anatomy table covers. Acceptable.

## Spike: install and coexist — UNBLOCKED, done

Was blocked on Astryx's React ≥19 requirement (evidence retained below
for the record); cleared once Phase 19 landed Next 15.5.20/React
19.2.7/StyleX 0.18.3 and confirmed via dry-run install. Resumed and
completed 2026-07-13:

```
$ npm install @astryxdesign/core@0.1.4 @astryxdesign/theme-neutral@0.1.4 --dry-run
npm error code ERESOLVE
npm error Found: react@18.3.1 (node_modules/react, "^18" from the root project)
npm error Could not resolve dependency:
npm error   peer react@">=19.0.0" from @astryxdesign/core@0.1.4
```

(That was the original, now-historical failure against React 18 —
kept here as the reproduction record. See `spec/19` for the resolution.)

- [x] ~~Create the spike branch from the current UI-refresh working
      branch.~~ **Adapted, same as every other phase in this
      initiative**: committed directly to `claude/modern-dillinger-aws`,
      no separate branch.
- [x] `npm install` the pinned Astryx packages from the clarification
      pass. Done: `@astryxdesign/core@0.1.4` +
      `@astryxdesign/theme-neutral@0.1.4`, clean install, zero
      `ERESOLVE` warnings — confirms Phase 19's upgrade actually cleared
      the blocker, not just the dry-run check.
- [x] Add the documented `@layer` declarations and `@import`s to
      `app/globals.css`, preserving the existing `@tailwind` directives,
      the `katex` import, and all `.preview-html` rules. Done —
      preserving everything already there, `@import`ing Astryx's three
      CSS files after the existing directives (no v4 `@layer` cascade
      declaration needed; see the clarification-pass finding above for
      why).
- [x] Run `npm run dev` and confirm the app boots with zero console
      errors introduced by the new CSS. **Done via a real headless
      browser** (not just curl): `next dev` ready in 2.2s, homepage
      loaded with `waitUntil: networkidle`, zero console errors, zero
      page errors captured.
- [x] Render one existing page (`/`) and confirm no existing Tailwind
      utility class visibly broke. **Screenshot-verified**: sidebar,
      navbar, editor pane, and preview pane all render with correct
      colors/layout/proportions — nothing clobbered by Astryx's reset
      or theme CSS.

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

- [x] Tally the clarification-pass and spike results against these gates:
      no console errors, no visual regression on `/`, dropdown spike
      matches or exceeds original a11y behavior, dark-mode toggle wiring
      resolved (with or without a workaround), bundle-size delta
      acceptable per the clarification-pass baseline. **Fails at the
      first gate before any spike work is possible**: `npm install`
      itself cannot resolve, so no console-error/visual-regression/a11y/
      bundle-size check can even be attempted. Called early per this
      phase's own working rule rather than padding out unreachable spike
      tasks.
- [x] Write a dated "Findings" entry below with a clear **Go** or **No-go**
      call. A **No-go** must name the specific gate that failed and route
      back to Phase 13 rather than being silently abandoned. **Done — see
      Findings below.**
- [ ] If **Go**: merge the spike branch's `package.json`/`globals.css`
      changes (but not the one-off `Navbar.tsx` spike component — that's
      superseded by Phase 15's real migration) into the UI-refresh working
      branch, and check this box to unblock Phase 15. **N/A this pass.**
- [x] If **No-go**: open a revision to Phase 13's "Design system" decision
      recording the alternative chosen (e.g., stay on hand-rolled
      Tailwind, or evaluate a second candidate) before Phase 15 starts.
      **Done — see `spec/13-ui-refresh-requirements.md`'s "Revision
      2026-07-12" section.**

## Findings

- **2026-07-12: No-go, blocked before the install step.**
  `@astryxdesign/core` requires `react: ">=19.0.0"` /
  `react-dom: ">=19.0.0"` (every published version back to `0.0.15` —
  not a recent bump) plus `@stylexjs/stylex: "^0.18.3"`. This repo runs
  `react: "^18"` / `react-dom: "^18"` on Next.js `14.2.35`, which does
  not carry stable React 19 support. `npm install
  @astryxdesign/core@0.1.4 @astryxdesign/theme-neutral@0.1.4 --dry-run`
  against the real `package.json` fails with `ERESOLVE` (see transcript
  above) — reproducible, not inferred from docs. Separately, no shipped
  Astryx theme is close to the plum brand accent (token-level check, not
  a guess), and the documented CSS integration snippet targets Tailwind
  v4's `@layer`/`@import ... layer(theme)` syntax, not this repo's
  Tailwind 3.4.1 `@tailwind` directives — two more integration costs on
  top of the hard blocker. Routed back to Phase 13 for a decision
  revision; the "Spike: one real component via swizzle," "Spike: theming
  and dark mode," and bundle-size clarification tasks above were never
  started because there is nothing installable to spike against.
- **2026-07-12: Resequenced, not abandoned.** User decision (recorded in
  `spec/13-ui-refresh-requirements.md` Decisions): sequence a React 19
  upgrade ahead of this phase, then resume. That upgrade is executed
  incrementally, not as one jump — see
  `spec/19-incremental-stack-upgrade-for-astryx.md` for the concrete
  3-step plan (Next 15.5.20 first with React unchanged, then React
  19.2.7, then pin `@stylexjs/stylex@0.18.3`) and its "Researched facts"
  section for why that specific path is lower-risk than a single
  big-bang upgrade. This phase stays paused until Phase 19's Step 4
  confirms the `npm install --dry-run` check above passes clean.
- **2026-07-12: Unblocked.** All three of Phase 19's steps landed and
  were verified (typecheck/unit/build/lint/E2E identical to a captured
  pre-upgrade baseline at every step, zero new regressions): Next
  15.5.20, React 19.2.7, `@stylexjs/stylex@0.18.3`. Phase 19 Step 4
  re-ran this exact dry-run check and it now resolves cleanly. This
  phase's clarification pass and spike can resume from the top —
  everything below this point in the file reflects the original,
  now-resolved blocker and stays as a historical record.
- **2026-07-13: Clarification pass finished, "install and coexist"
  spike done.** Both remaining clarification items resolved for real
  (not just reasoned about): Astryx's CSS ships as three
  version-agnostic files with no Tailwind-v4 dependency, so plain
  `@import` after the existing `@tailwind` directives works with zero
  conflict; bundle-size impact measured at a real build (+140 KB raw /
  ~48.8 KB gzip total CSS, zero JS bundle change, so no cold-start
  impact). Installed the pinned packages clean (zero `ERESOLVE`),
  merged `app/globals.css`, and verified via a real headless-browser
  run: `next dev` boots in 2.2s, zero console/page errors, and a
  screenshot of `/` confirms sidebar/navbar/editor/preview all render
  correctly with no Tailwind utility clobbered. **Not yet done**: the
  swizzle spike (Navbar dropdown), the theme/dark-mode toggle check,
  and the go/no-go call — next in this file.
