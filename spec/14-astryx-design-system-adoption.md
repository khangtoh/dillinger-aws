# Phase 14 — Astryx Design-System Adoption Spike

Goal: prove, on a throwaway branch, that Astryx can coexist with this
app's Next.js 14 + Tailwind 3.4.1 stack without regressing anything, then
make an explicit go/no-go call before any real component migrates
(Phase 15).

Depends on: Phase 13 decisions (design system = Astryx, coexists with
Tailwind, matches current plum brand unless told otherwise). **As of
2026-07-12, also depends on `spec/19-incremental-stack-upgrade-for-
astryx.md`** (the concrete, incremental execution plan for landing React
19 — see this file's Findings below and Phase 13's Decisions for why).
Do not resume the clarification pass or any spike task in this file
until Phase 19's Step 4 is checked off; that step re-runs the
`npm install --dry-run` check below to confirm the blocker is actually
cleared before this phase resumes.

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
- [ ] Confirm whether Astryx's CSS `@layer` approach conflicts with this
      repo's existing `app/globals.css` (`@tailwind base/components/
      utilities` + a `katex` import + hand-written `.preview-html` rules)
      — read the current file, not just Phase 13's summary, before writing
      the merged version. **Deprioritized — see Findings.** Worth noting
      without a full spike: the documented Astryx integration snippet
      (`@import 'tailwindcss/theme.css' layer(theme)`) is Tailwind v4
      CSS-first syntax; this repo runs Tailwind **3.4.1** with classic
      `@tailwind base/components/utilities` directives, so the published
      integration guide doesn't transfer as-is even setting the React
      blocker aside — a second, compounding integration cost.
- [ ] Confirm Astryx's bundle-size impact is compatible with this
      project's Lambda-image and cold-start budget documented in
      `ARCHITECTURE.md` (server bundle only grows with server-rendered
      component code, not client CSS, but record the actual added KB to
      `.next/static` so Phase 18 has a before/after baseline). **Not
      run — moot until the blocker below is resolved; a real build
      requires the package to actually install.**

## Spike: install and coexist — BLOCKED, do not start

Per this phase's own working rules ("if any P0 clarification task
surfaces a blocking incompatibility, stop... route it back to Phase 13's
Decisions section"), this section does not run. Evidence:

```
$ npm install @astryxdesign/core@0.1.4 @astryxdesign/theme-neutral@0.1.4 --dry-run
npm error code ERESOLVE
npm error Found: react@18.3.1 (node_modules/react, "^18" from the root project)
npm error Could not resolve dependency:
npm error   peer react@">=19.0.0" from @astryxdesign/core@0.1.4
```

Confirmed directly against this repo's real `package.json`
(`react: "^18"`, `react-dom: "^18"`, `next: "14.2.35"`) — not a
hypothetical. Next.js 14.2.35 does not carry stable React 19 support
(that lands with Next 15), so unblocking this would mean at minimum a
React 19 upgrade, and realistically the Next.js 14→15 major upgrade too
— which is exactly the "Move to a supported application stack" work item
already sitting open and unstarted in `spec/12-security-hardening.md`
("P0 - Move to a supported application stack"). The tasks below stay
unchecked until Phase 13's decision is revised (see that file's new
"Revision" section) and this phase is explicitly restarted.

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
