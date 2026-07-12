# Phase 18 — UI Refresh Verification & Regression Testing

Goal: prove the whole UI-refresh initiative (Phases 14-17) actually works
end-to-end — in a real browser, against the live Lambda deployment, not
just green unit tests — and that it measurably closes the StackEdit gap
identified in Phase 13 Section C. Mirrors the role Phase 8 played for the
original Lambda migration.

Depends on: Phase 15 (component migration), Phase 16 (folders/tags), and
Phase 17's AI-1 + AI-3 (AI-2 has its own smoke test in Phase 17 and isn't
re-gated here). Assumes a live Function URL already exists per Phase 8/9.

## Working rules

- A task in this phase is only checked off against **observed behavior**
  (a screenshot, a passing test run, a measured number), same standard
  Phase 8 already set for this repo — not against "the code looks right."
- Run this phase against a real deployed tenant, not only local `npm run
  dev`, for at least the browser-behavior tasks — component-level UI bugs
  and Lambda-cold-start-affected UI bugs (e.g. a slow first paint hiding a
  layout shift) are different failure classes.

## Automated regression

- [ ] Run `npm run verify` (lint + typecheck + unit + E2E) on the fully
      merged UI-refresh branch; record pass/fail.
- [ ] Run `npx vitest run --coverage`; confirm coverage is at or above the
      CLAUDE.md baseline (98% statements / 91% branches / 99.5% functions
      / 98% lines) established before this initiative started. If any
      number regressed, add tests before checking this box, not after.
- [ ] Extend `tests/e2e/` with a scenario covering the full new-UI golden
      path in one flow: create a folder, create a document in it, tag it,
      use the toolbar to format text, use the command palette to trigger
      an AI action, toggle dark mode, export as PDF — one continuous
      Playwright spec, not scattered fragments, so a future regression in
      the *interaction* between features (not just each feature alone) is
      caught.
- [ ] Run the accessibility-focused checks already implicit in the
      component tests (`aria-*` assertions) across every migrated
      component from Phase 15; if this repo doesn't yet have an automated
      a11y audit tool (e.g. `axe-core`) wired into Playwright, add one as
      part of this task rather than relying on manual spot checks alone.

## Visual and theming verification

- [ ] Capture before/after screenshots (light and dark mode) for every
      component migrated in Phase 15, using the Phase 15 dark-mode
      screenshots as the "after" baseline for future visual-regression
      comparison.
- [ ] Manually verify the plum accent (or Phase 13-approved theme) renders
      consistently across all migrated components in both modes — no
      component silently falling back to an Astryx default color.
- [ ] Verify the theme selector added in Phase 15 persists across a full
      page reload and across a fresh browser session against the live
      Function URL (not just localhost).

## Live deployment verification

- [ ] Deploy the UI-refresh branch to the `staging` tenant (or a
      dedicated UI-refresh tenant if the user prefers not to touch
      `staging` — record which was used) via the existing CI/OIDC path
      (Phase 7), not a manual credential-based deploy.
- [ ] Open the live Function URL in a real browser (matching Phase 8's
      method) and confirm: the app loads, Monaco renders, the new toolbar
      and command palette are present and functional, folders/tags work,
      and no console errors or failed network requests occur.
- [ ] Measure cold-start and warm-request latency on the UI-refreshed
      build and compare against Phase 8's recorded baseline (Init
      Duration 1437ms cold, ~0.6s warm) — record any regression; a UI
      refresh should not meaningfully change server-side cold start, so a
      large delta is itself a finding worth investigating, not just
      logging.
- [ ] Exercise AI-3's in-editor AI actions against the live deployment
      end-to-end (not mocked), confirming the server route handler works
      under real Lambda invocation, not just in local dev.

## StackEdit-parity acceptance check

- [ ] Walk through Phase 13 Section C's gap list (folders, toolbar,
      scroll-sync, diagrams, command palette, theming) one item at a time
      against the live deployment and mark each **closed** or **not
      closed** with a one-line note — this is the concrete "did we beat
      StackEdit's UI" verdict the whole initiative was scoped to answer.
- [ ] If any item is **not closed**, decide whether it blocks calling this
      initiative complete or is deferred with a reason (route back to
      Phase 13's Decisions section if the deferral changes scope).

## Close-out

- [ ] Once every section above is green/closed, update `spec/README.md`:
      check off Phases 14-18, add a "UI refresh live" status line with
      the tenant URL and date, matching the existing "Dillinger is live on
      AWS Lambda" status-line convention.
- [ ] Record final coverage numbers, bundle-size delta (vs. Phase 14's
      baseline), and cold/warm latency numbers in the Results log below.

## Results log

_(append dated entries here, matching Phase 8's results-log format)_
