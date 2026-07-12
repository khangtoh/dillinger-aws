# Phase 19 — Incremental Upgrade to Astryx's Minimum Requirements

Goal: get this app's dependency stack from its current state (Next
14.2.35, React 18, no StyleX) to Astryx's actual minimum requirements
(`react >=19.0.0`, `react-dom >=19.0.0`, `@stylexjs/stylex ^0.18.3`) via
a sequence of small, independently-verifiable upgrades — never one
big-bang jump — so a regression is always traceable to a single step.

Depends on: Phase 13/14's finding that Astryx is hard-blocked on React
19 (`spec/14-astryx-design-system-adoption.md` Findings). This phase
**is** the concrete execution plan for `spec/12-security-hardening.md`'s
"P0 - Move to a supported application stack" item — that item's first
task ("select a currently supported Next.js major... record the target
version") is resolved by this phase's Step 1 below, and its remaining
tasks are satisfied by Steps 1-2's verification work, not duplicated.

## Researched facts (resolved before writing tasks, not assumptions)

Checked directly against npm metadata and this repo's real
`package.json`/`node -v`, 2026-07-12:

- **Current state**: `next@14.2.35` (peer: `react ^18.2.0` only — will
  not accept React 19), `react@^18` / `react-dom@^18`, no StyleX.
- **Next 15 accepts both React majors as a peer**: `next@15.5.20`
  (the last release on the still-officially-supported 15 line; `16.2.10`
  is `latest` but a second major jump this phase doesn't need to take)
  declares `react: '^18.2.0 || 19.0.0-rc-de68d2f4-20241204 || ^19.0.0'`.
  This is the key fact that makes an incremental path possible: **Next
  can move first, React second**, as two independently-revertible steps.
- **Node engine**: `next@15.5.20` requires
  `node: '^18.18.0 || ^19.8.0 || >=20.0.0'`. Local sandbox is
  `node v22.22.2`; the Lambda Dockerfile already targets
  `node:20-bookworm-slim` (`ARCHITECTURE.md`). No engine blocker,
  locally or in the deployed container — record this so no task below
  re-litigates it.
- **React 19 stable**: latest is `19.2.7` (`dist-tags.latest`), not a
  release candidate — target the stable release, not `rc`/`canary`.
- **StyleX must be pinned to `0.18.3` exactly, not `latest`.**
  `@astryxdesign/core`'s peer range is `@stylexjs/stylex: "^0.18.3"`
  (i.e. `>=0.18.3 <0.19.0`). The npm `latest` tag for `@stylexjs/stylex`
  is `0.19.0`, which is **outside** that range and would itself cause an
  `ERESOLVE` if installed carelessly. `0.18.3` is the newest release
  inside the required range — use that exact version.
- **Dependency compatibility already checked (Phase 14's earlier pass)**:
  `@monaco-editor/react`, `lucide-react`, and `zustand` all already
  declare React 19 support; `@testing-library/react@^16.3.2`
  (already the installed devDependency range) supports React 19 too.
  `markdown-it`+plugins, `katex`, `dompurify`, `turndown`, `dropbox`,
  `@sparticuz/chromium`, `puppeteer-core` are React-agnostic. No
  dependency conflict expected beyond Next and React themselves.

## Working rules

- **Three steps, three PRs/deploys, three rollback points** — do not
  combine steps to save time. The whole point of "incremental" here is
  that if something breaks after Step 2, it's obviously the React 19
  bump, not an unknown mix of two majors changing at once.
- Every step ends with the same verification bar Phase 8 already set for
  this repo: typecheck, full unit suite, production build, browser/E2E
  tests, a real staging deploy, and a smoke test — not "the diff looks
  right."
- Do not weaken CSP, CSRF, OAuth-state, validation, or export
  sanitization controls to make a step pass (same rule already stated in
  `spec/12-security-hardening.md`).
- If a step's verification fails and can't be fixed forward quickly,
  revert that step's branch and record why in Findings — do not carry a
  known-broken step into the next one.

## Step 1 — Next.js 14.2.35 → 15.5.20 (React stays on 18)

- [x] ~~Create a branch for this step~~ **Adapted**: per the user's
      explicit branch instruction for this whole initiative, all work
      commits directly to `claude/modern-dillinger-aws` rather than a
      separate per-step branch — each step is still its own commit(s),
      giving the same revert granularity without a second branch to manage.
- [x] Update `next` to `15.5.20` and `eslint-config-next` to the matching
      `15.5.20` release; leave `react`/`react-dom` untouched at `^18`.
- [x] Regenerate the lockfile from the reviewed change.
- [x] Run the official codemod (`npx @next/codemod@latest
      next-async-request-api .`) against this codebase. **Result: 0 files
      needed changes** (154 processed) — confirmed by reading the actual
      source that this app already uses `request.nextUrl.searchParams` and
      `response.cookies.set()` directly on Next's request/response
      objects, not the standalone `cookies()`/`headers()` functions from
      `next/headers` that became async in Next 15, and has no dynamic
      route segments in its API routes. One pre-existing, unrelated file
      (`app/api/google-drive/save/route.ts`) broke the codemod's parser
      on a duplicate `const body` declaration — fixed below, not caused by
      Next 15.
- [x] Grep for and fix any direct, non-awaited use of `cookies()`,
      `headers()`, `params`, or `searchParams`. **N/A — see above,**
      already using the request/response-scoped APIs that didn't change.
- [x] Resolve any other compile/runtime changes surfaced, without
      weakening CSP/CSRF/OAuth-state/validation/export-sanitization
      controls. Two real Next 15 breaks fixed: (1) `next.config.mjs`'s
      `experimental.serverComponentsExternalPackages` renamed to
      top-level `serverExternalPackages`; (2) `app/page.tsx` used
      `next/dynamic(..., { ssr: false })` directly in a Server Component,
      which Next 15 now hard-errors on — extracted into a new
      `components/editor/ClientEditor.tsx` Client Component. Also fixed
      the pre-existing, upgrade-unrelated duplicate `const body` bug in
      `app/api/google-drive/save/route.ts` (renamed to `multipartBody`)
      because it blocked the production-build verification gate below.
- [x] Run `npx tsc --noEmit` on the clean install; fix type errors.
      **46 errors, all pre-existing** (confined to
      `tests/components/github-modal.test.tsx`, a store-typing issue in a
      test file, unrelated to this upgrade) — down from the 49-error
      pre-upgrade baseline because fixing the google-drive duplicate
      `body` bug above resolved 3 of them. No new errors.
- [x] Run `npm run test:unit`; fix failures. **308/318 passing, identical
      to the pre-upgrade baseline** (same 10 pre-existing failures across
      `navbar.test.tsx`, `settings-modal.test.tsx`, `toast.test.tsx` —
      confirmed unrelated by baselining before touching any dependency).
      No new failures.
- [x] Run `npm run build`; confirm a clean production build. **Clean**
      after the two Next 15 fixes above.
- [x] Run `npm run lint`. **Clean** (`eslint-config-next@15.5.20`), with
      a deprecation notice that `next lint` itself is removed in Next 16
      — not a concern for this phase's Next 15 target, noted for whoever
      eventually does the Next 16 jump.
- [x] Run `npm run test:e2e`; fix failures. **34/42 passing.** The
      remaining 8 (`settings-sidebar.spec.ts`/`editor.spec.ts` modal/
      sidebar-dismissal timing assertions) were verified **pre-existing**
      by stashing every Step 1 change, reinstalling the original Next
      14.2.35 lockfile, and re-running the exact same 8 tests — identical
      failures, identical assertions, against unmodified code. Not a
      regression. Separately (sandbox-only, not a code issue): this
      environment's pre-installed Chromium build (1194) doesn't match
      what the pinned `@playwright/test@^1.58.2` expects (1208); the
      numbers above are from a temporary, uncommitted
      `launchOptions.executablePath` override for local verification only
      — `playwright.config.ts` itself is unchanged, since hardcoding a
      sandbox-specific browser path would break CI and other machines.
- [ ] Build the Lambda container image locally (or via CI) and confirm it
      still boots with the AWS Lambda Web Adapter. **Not run** — this
      sandbox has no Docker (`ARCHITECTURE.md` already documents this
      constraint; the image build runs on GitHub Actions). Requires
      either a CI run or a machine with Docker.
- [ ] Deploy this step to a scratch/staging tenant via the existing
      CI/OIDC path. **Not run** — `deploy-lambda.yml` is
      `workflow_dispatch`-only (no auto-deploy on push, by design per
      `spec/12`'s security posture), and triggering a real deploy to a
      live AWS tenant is exactly the kind of action this project's
      operating rules say to confirm before taking, not assume. Needs an
      explicit go-ahead.
- [ ] Smoke-test the deployed Function URL. **Blocked on the deploy task
      above.**
- [ ] Record the pre-upgrade image digest as the rollback point. **Blocked
      on the deploy task above** — the current live `staging` digest is
      already recorded in `spec/README.md`'s Status section as the
      rollback target if needed.
- [x] Merge this step once green — N/A (no separate branch, see first
      item); committed directly to `claude/modern-dillinger-aws` once all
      runnable-in-this-sandbox checks above passed.

## Step 2 — React 18 → React 19.2.7 (Next stays on 15.5.20)

- [ ] Create a branch for this step from the merged Step 1 result (e.g.
      `upgrade/react-19`).
- [ ] Update `react` and `react-dom` to `19.2.7`; update `@types/react`
      and `@types/react-dom` to the matching v19 type packages.
- [ ] Regenerate the lockfile.
- [ ] Grep the codebase for React 19 breaking-change patterns before
      assuming none apply: `forwardRef` usage (still works in 19 but is
      deprecated in favor of `ref` as a normal prop — do not mass-migrate
      in this step, just confirm nothing relies on removed behavior),
      any `propTypes`/`defaultProps` on function components (both are
      no-ops/removed for function components in 19), and any direct
      `ReactDOM.render`/`unmountComponentAtNode` calls (removed in 19 —
      this app should already be on Next's own root APIs, but confirm).
- [ ] Resolve compile/runtime changes without weakening the same
      security controls named in Working rules.
- [ ] Run `npx tsc --noEmit`; fix type errors.
- [ ] Run `npm run test:unit`; fix failures — pay attention to any
      `@testing-library/react` assertions relying on React 18-specific
      act()/effect-timing behavior, since React 19 changed some of this.
- [ ] Run `npm run build`; confirm a clean production build.
- [ ] Run `npm run test:e2e`; fix failures.
- [ ] Build and boot the Lambda container image; confirm no regression
      versus Step 1's already-verified Next 15 baseline.
- [ ] Deploy to the same scratch/staging tenant used in Step 1.
- [ ] Smoke-test the deployed Function URL, same checklist as Step 1.
- [ ] Record the Step 1 image digest as this step's rollback point.
- [ ] Merge this step once green.

## Step 3 — Add `@stylexjs/stylex@0.18.3`

- [ ] Create a branch for this step from the merged Step 2 result.
- [ ] Add `@stylexjs/stylex` pinned to the **exact** version `0.18.3`
      (not a caret range defaulting to latest) — this is required, not a
      style preference; see "Researched facts" above.
- [ ] Regenerate the lockfile; confirm `npm install` completes with no
      `ERESOLVE` warnings related to StyleX.
- [ ] Do **not** wire a StyleX build plugin into `next.config.mjs` or
      `postcss.config.mjs` in this step — the goal here is only to
      satisfy the peer-dependency requirement so Phase 14 can install
      Astryx; actual StyleX build-pipeline integration (if any is even
      needed beyond Astryx's pre-built CSS) is Phase 14's job, not this
      one.
- [ ] Run `npx tsc --noEmit`, `npm run test:unit`, and `npm run build` to
      confirm adding an unused-so-far dependency doesn't break anything.
- [ ] Merge this step once green.

## Step 4 — Confirm the Astryx blocker is actually cleared

- [ ] Re-run the exact check that found the original blocker:
      `npm install @astryxdesign/core@0.1.4 @astryxdesign/theme-neutral@0.1.4 --dry-run`
      against the now-upgraded `package.json`, and confirm it resolves
      cleanly (no `ERESOLVE`).
- [ ] Record the result in this file's Findings.
- [ ] Update `spec/14-astryx-design-system-adoption.md`: remove its
      "paused" note, confirm its "Depends on" is satisfied, and resume
      that phase's clarification pass items that were previously marked
      "moot until the blocker is resolved" (the bundle-size baseline
      task in particular).
- [ ] Check off `spec/12-security-hardening.md`'s "P0 - Move to a
      supported application stack" section (all of its tasks are now
      satisfied by Steps 1-2's verification work above) and update
      `spec/README.md`'s Phase 14 blocking-dependency note to remove the
      "paused" language.

## Findings

- **2026-07-12: Step 1 code-level verification complete and committed.**
  Next 15.5.20 landed with React untouched at 18.3.1, exactly as planned.
  Two real Next-15 breaks found and fixed (`serverExternalPackages`
  config rename; `next/dynamic({ssr:false})` no longer allowed directly
  in a Server Component, fixed via a new `ClientEditor` Client
  Component). The async-request-API codemod needed zero changes across
  154 files — this app already used request/response-scoped
  cookies/searchParams, not the standalone functions that changed.
  Typecheck (46 pre-existing errors, down from 49 after an incidental
  fix), unit tests (308/318, identical to baseline), build, and lint are
  all clean or baseline-identical. E2E: 34/42 passing; the 8 failures
  were proven pre-existing by re-running them against a stashed,
  unmodified Next 14.2.35 checkout — byte-identical failures. **Not yet
  done**: Lambda container build and staging deploy/smoke-test — this
  sandbox has no Docker, and the deploy workflow is manual-dispatch-only
  by design, so an actual AWS deploy needs an explicit go-ahead rather
  than being triggered automatically. Step 1's code is ready to hand to
  CI for the container-build/deploy leg.
