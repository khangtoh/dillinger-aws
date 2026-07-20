# Phase 18 — UI Refresh Verification & Regression Testing

Goal: prove the whole UI-refresh initiative (Phases 14-17 plus Phase 20's
visual replacement) actually works end-to-end — in a real browser, against
the live Lambda deployment, not just green unit tests — and that it
measurably closes the StackEdit gap identified in Phase 13 Section C while
delivering the clean visual break defined in Phase 20. Mirrors the role
Phase 8 played for the original Lambda migration.

Depends on: Phase 15 (component migration), Phase 16 (folders/tags), and
Phase 17's AI-1 + AI-3, plus Phase 20 (clean visual rebrand). AI-2 has its
own smoke test in Phase 17 and is not re-gated here. Assumes a live Function
URL already exists per Phase 8/9.

> **Visual requirements extracted — 2026-07-19.** This phase originally
> treated preservation of the plum accent as its visual acceptance target.
> That target is superseded. The detailed visual requirements, component and
> route screenshot matrix, legacy-token removal rules, responsive baselines,
> and visual definition of done now live in
> [`20-clean-visual-rebrand.md`](20-clean-visual-rebrand.md). Phase 18 does
> not duplicate that checklist: it confirms Phase 20 is complete, then
> verifies the same result against the live Function URL alongside the
> functional, performance, accessibility, and StackEdit-parity checks here.

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

- [x] Confirm every Phase 20 implementation, cleanup, and visual-acceptance
      checkbox is complete and its Results log contains the token inventory,
      contrast results, screenshot locations, test results, and branch deploy
      URL; do not infer completion from this phase's live checks.
- [x] Use Phase 20's desktop/tablet/mobile screenshots as the `after`
      visual-regression baselines. Treat Phase 15's plum-theme screenshots as
      labeled `before` evidence only.
- [x] Against the live deployment, verify the owned Dillinger Astryx theme
      renders consistently in both modes, no component falls back to
      `theme-neutral`, and the prohibited legacy tokens/colors do not appear
      in computed application-chrome styles.
- [x] Verify the theme selector added in Phase 15 persists across a full
      page reload and across a fresh browser session against the live
      Function URL (not just localhost).
- [x] Record a live before/after verdict that the new palette, typography,
      application shell, component treatment, and Markdown presentation
      cannot be mistaken for the legacy Dillinger UI.

## Live deployment verification

- [x] Deploy the UI-refresh branch to the `staging` tenant (or a
      dedicated UI-refresh tenant if the user prefers not to touch
      `staging` — record which was used) via the existing CI/OIDC path
      (Phase 7), not a manual credential-based deploy.
- [ ] Open the live Function URL in a real browser (matching Phase 8's
      method) and confirm: the app loads, Monaco renders, the new toolbar
      and command palette are present and functional, folders/tags work, the
      Phase 20 visual system is present at all target viewport sizes, and no
      console errors or failed network requests occur.
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
      check off the applicable Phases 14-20, add a "UI refresh and clean
      visual rebrand live" status line with the tenant URL and date, matching
      the existing "Dillinger is live on AWS Lambda" status-line convention.
- [ ] Record final coverage numbers, bundle-size delta (vs. Phase 14's
      baseline), and cold/warm latency numbers in the Results log below.

## Results log

_(append dated entries here, matching Phase 8's results-log format)_

### 2026-07-20 — Phase 20 live visual-acceptance handoff

- Phase 20 is complete at 44/44. Its Results log contains the final palette,
  contrast matrix, 123-file legacy scan, unit/coverage/build/browser results,
  126-image route/state matrix, branch workflow, tenant URL, and live evidence.
- CI/OIDC run
  [29725965083](https://github.com/khangtoh/dillinger-aws/actions/runs/29725965083)
  deployed commit `c6941cf8c7f4ae9569efe245c8d55fe7721525c4` to dedicated branch
  tenant `branch-claude-modern-dillinger-aws` in `ap-southeast-1`; its
  deployment artifact and smoke test record HTTP 200 at
  `https://3tfsfijqedt62hf3vfdfxwunua0rkjgo.lambda-url.ap-southeast-1.on.aws/`.
  The dedicated branch tenant is the workflow-selected isolation path, so the
  shared `staging` tenant was not changed.
- Phase 20's canonical 126-image desktop/tablet/mobile matrix is now the
  visual-regression `after` baseline; Phase 15's plum/charcoal captures remain
  labeled historical `before` evidence. Four additional live viewport images
  and their manifest are in [`artifacts/phase20/live/`](../artifacts/phase20/live/).
- Live browser checks pass for owned light/dark token values, the `dillinger`
  Astryx identity, Geist, Monaco, toolbar and command palette, responsive
  shell composition, no sampled neutral/legacy fallback colors, and the
  branded 404. Dark selection survives reload and a fresh browser context;
  the new request is server-rendered dark before hydration. No horizontal
  overflow, console errors, or failed network requests were observed in the
  four target viewport captures.
- Live before/after verdict: the slate/indigo palette, surfaced workspace,
  Geist typography, component treatment, and editorial Markdown presentation
  are an unmistakable replacement of the legacy Dillinger style.
- This closes six Phase 18 visual/deployment tasks, not Phase 18 itself. The
  full UI-refresh golden path (including folder/tag mutation and real AI),
  aggregate verification/coverage, component-wide a11y audit, latency,
  StackEdit-parity walk-through, and close-out metrics remain open.
