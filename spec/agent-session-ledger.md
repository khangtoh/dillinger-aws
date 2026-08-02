# Agent Session Ledger

A running record of what an agent session actually did on this repo —
decisions made, state changed, automation left running — so the next
session (human or agent) can resume without re-deriving context or
re-litigating settled calls. Append a new dated entry per session; never
rewrite history in an earlier entry (if something changes, add a note,
don't edit the old record).

This is a log, not a spec. Requirements and task checklists live in
`spec/*.md`; this file is "what happened and why," cross-referencing
those files rather than duplicating their content.

---

## Session: 2026-07-10 → 2026-07-13 (branch `claude/modern-dillinger-aws`)

### Scope of this session

Two chained initiatives, both on top of an already-live Phase 1-12
milestone (Dillinger running on AWS Lambda, `spec/01`-`spec/12`,
completed in an earlier session):

1. **CI/CD and multi-tenancy hardening** on the existing Lambda
   deployment (branch-tenant deploys, reserved-concurrency cleanup,
   deployment-URL verifiability).
2. **A new UI-refresh initiative** (`spec/13`-`spec/19`): evaluate and
   adopt the [Astryx](https://github.com/facebook/astryx) design system,
   land new editor UX to beat StackEdit, and scope real AI-native product
   features — all UI/product-surface only, no changes to `infra/` or the
   Lambda/multi-tenancy model.

### What got done, in order

1. **Wrote the full spec set for the UI-refresh initiative**
   (`spec/13` through `spec/18`, plus `spec/README.md` updates) —
   requirements/evaluations, Astryx adoption spike plan, component
   migration plan, notes/IA plan, AI-native features plan, verification
   plan. Design-only at this point; committed and pushed.

2. **Started Phase 14's clarification pass**, immediately hit a real
   blocker: Astryx requires `react >=19.0.0` / `@stylexjs/stylex ^0.18.3`
   (confirmed via `npm view`, every published version back to `0.0.15` —
   not a recent bump), but this repo was on Next 14.2.35 / React 18.
   Phase 14 was marked **No-go, paused** and routed back to
   `spec/13-ui-refresh-requirements.md` for a decision revision — see
   that file's "Revision 2026-07-12" section for the recorded resolution
   (sequence a React 19 upgrade first, then resume Phase 14).

3. **Wrote and executed `spec/19-incremental-stack-upgrade-for-astryx.md`**
   — a 3-step incremental upgrade (Next 15.5.20, unchanged React → React
   19.2.7 → pin `@stylexjs/stylex@0.18.3`), each step independently
   verified (typecheck/unit/build/lint/E2E against a captured
   pre-upgrade baseline, zero regressions at any step) rather than one
   big-bang jump. Confirmed the app runs via its actual
   Lambda-equivalent entrypoint (`node .next/standalone/server.js`).
   This unblocked Phase 14.

4. **Built and shipped real CI/CD infrastructure** for this branch,
   independent of the UI-refresh work:
   - `.github/workflows/deploy-branch-tenant.yml` — push-triggered
     (not `workflow_dispatch`, which requires the workflow file to
     already exist on the default branch — a real constraint discovered
     mid-session), explicit branch allowlist, deploys this branch to its
     own persistent Lambda tenant (`branch-claude-modern-dillinger-aws`)
     separate from `staging`.
   - Dropped `ReservedConcurrentExecutions` for dev-stage tenants
     (`MaxTenantConcurrency=0`) — documented in `ARCHITECTURE.md`'s new
     "Reserved concurrency and the microVM pool" section why (AWS
     requires ≥10 units unreserved account-wide; doesn't make sense to
     reserve capacity in dev).
   - Self-healing pre-flight in `infra/provision-tenant.sh`: deletes a
     stack stuck in `ROLLBACK_COMPLETE`/`ROLLBACK_FAILED` before retrying
     deploy, rather than requiring manual intervention.
   - Deployment-URL verifiability: both deploy workflows now publish a
     Job Summary and an uploadable `deployment-info-<tenant-id>.json`
     artifact, so an engineer can confirm the live URL from the CI run
     alone, without needing AWS console access.
   - This branch's tenant is confirmed live and deployed
     (`branch-claude-modern-dillinger-aws`, see
     `infra/tenants.json` / CI run history for the current URL).

5. **Wrote `spec/goal-completion-check.md`** — a reusable prompt that
   traces a stated goal through requirements (spec Decisions sections) →
   mapped spec phases → actual `- [x]`/`- [ ]` checkbox counts, producing
   a MET/PARTIALLY MET/NOT MET verdict instead of an impression. Linked
   from `spec/README.md`. Used twice this session to produce accurate,
   evidence-based status reports.

6. **Resumed and completed Phase 14** (the Astryx swizzle spike),
   ending in an explicit **Go** call. Full detail, including every real
   integration gap found and fixed, lives in
   `spec/14-astryx-design-system-adoption.md`'s dated Findings — the
   short version:
   - Swizzled Astryx's `DropdownMenu` (`components/astryx/DropdownMenu/`)
     and reimplemented `Navbar.tsx`'s export dropdown with it.
   - Found and fixed a real gap in the earlier "install and coexist"
     spike: `<Theme theme={neutralTheme}>` was never mounted, so
     Astryx's `@scope`d theme CSS variables never resolved. Fixed in
     `components/providers/Providers.tsx`.
   - Found this repo had never wired up a **StyleX compiler** (only the
     runtime package) — Astryx's own official Next.js integration
     packages (`@stylexjs/nextjs-plugin`, `@stylexjs/webpack-plugin`) are
     stale (last published 2025-03, 7 minors behind the stylex runtime
     version Astryx requires). Wired `@stylexjs/unplugin@0.19.0` into
     both `next.config.mjs` (webpack) and `vitest.config.ts` (vite)
     instead — the current, version-matched integration path.
   - Found two swizzle-CLI import gaps that had to be fixed by hand in
     the swizzled files: cross-file theme-token imports must come from
     an import specifier ending in `.stylex`
     (`@astryxdesign/core/theme/tokens.stylex`, not the barrel
     `@astryxdesign/core/theme`) for StyleX's babel plugin to resolve
     them; and `@astryxdesign/core/BaseProps` isn't part of the
     package's public export map at all, so it was recreated locally.
   - Found jsdom doesn't implement the native Popover API Astryx's
     menus use for light-dismiss; copied Astryx's own test-suite shim
     into `vitest.setup.ts`, adapted `tests/components/navbar.test.tsx`
     accordingly, and verified the one behavior jsdom genuinely can't
     test (outside-click dismiss) via a real Playwright/Chromium check
     instead.
   - Final verification: 317/318 unit tests pass (1 skipped, jsdom
     limitation, covered by the live browser check instead),
     typecheck/lint/build all clean, real-browser check confirms
     keyboard behavior exceeds the original (adds arrow-key nav +
     typeahead) and real Astryx theming renders (neutral-gray accent,
     confirmed **not** plum — expected, unchanged from the clarification
     pass).
   - **Carry-forward costs recorded for Phase 15**: the unplugin wiring
     + two import-fixup patterns above are now solved once, reusable for
     every future swizzle; a custom Astryx theme file is still required
     from day one to match the plum brand.

7. **Set up persistent, cross-session automation** to keep driving the
   UI-refresh initiative forward without supervision — see
   "Active automation" below.

### Current state as of session end (2026-07-13)

| Item | Status |
|---|---|
| Phase 1-12 (Lambda migration) | Live — see `spec/README.md` Status |
| Phase 13 (UI-refresh requirements) | Done, including a recorded revision |
| Phase 14 (Astryx adoption spike) | **Done — Go** (2026-07-13) |
| Phase 15 (component migration) | **Not started** — unblocked, next up |
| Phase 16-18 | Not started |
| Phase 19 (stack upgrade) | Done; live-tenant deploy of the upgraded stack still pending a CI run |
| Branch CI/CD | Live, green (`deploy-branch-tenant.yml`, tenant `branch-claude-modern-dillinger-aws`) |
| Working tree | Clean; latest commit `affaada` pushed to `origin/claude/modern-dillinger-aws` |

### Active automation

- **Routine** `trig_012CyNx99MoV9CYVGu61y1hw` ("Dillinger UI-refresh goal
  check + advance"), hourly (`0 * * * *`, the platform minimum — 30 min
  was requested but rejected server-side), **fresh session per fire**
  (so it survives independent of any one chat session's lifetime).
  Each firing: runs the `spec/goal-completion-check.md` methodology
  against the Phase 15-18 goal, and if there's a clear unblocked next
  atomic task, does it (verified — tests/typecheck/build/real-browser
  check, not just "looks right"), checks it off, commits, and pushes to
  `claude/modern-dillinger-aws`. Stops and flags rather than guesses on
  any genuine user decision. Replaces an earlier stale hourly Routine
  that had drifted to targeting the already-completed Lambda-migration
  goal on a different branch (deleted this session).
- No `CronCreate`-based (session-scoped) jobs are active — an earlier
  20-minute session-scoped loop did not survive across sessions, which
  is why the above was moved to a persistent Routine instead.

### Recommended next goal (not yet confirmed by the user)

Phase 15 is large (7 sections: clarification pass, Toast/Skeleton/
KeyboardShortcuts, Navbar, Sidebar/modals, UI-6 theming, UI-2 toolbar,
UI-3 scroll-sync, UI-4 diagrams, UI-5 command palette, full regression).
Per Phase 15's own working rule ("migrate one component group at a
time"), the recommended first `/goal` scope is:

> Phase 15's clarification pass and the "Toast, Skeleton,
> KeyboardShortcuts" migration group are complete: the diagram-library
> decision is recorded, Toast/Skeleton/KeyboardShortcuts are migrated to
> Astryx primitives, their tests pass, and the corresponding checkboxes
> in `spec/15-ui-component-migration.md` are checked.

Not yet set as an active session Stop-hook `/goal` — the user was
mid-decision on this when the session closed.

### Open items / things to watch

- `[stylex] No CSS asset found to inject into. Skipping.` warning
  appears at both `next dev` and `next build` time. Investigated and
  found **not** to block real rendering for the one swizzled component
  in this session (real-browser check confirmed styles render), but
  worth re-confirming once Phase 15 swizzles many more components — the
  warning could start mattering at scale even though it didn't here.
- Dark-mode/theming is **not unified**: Tailwind's `darkMode: "class"`
  and Astryx's `<Theme mode>` are independent mechanisms, and this app
  has no actual global dark-mode toggle today (only a scoped
  `enableNightMode` setting for the Monaco editor + preview pane). Phase
  15's UI-6 section is where this needs real design decisions, not just
  wiring.
- Phase 19's upgraded stack (Next 15.5.20/React 19.2.7/StyleX 0.18.3)
  has not yet been deployed to the live `staging` tenant via
  `deploy-lambda.yml` — only build-verified locally and deployed to the
  per-branch tenant. Needs a CI run against `staging` before Phase 18
  (UI verification) can claim the upgrade is live for real users.
- Security hardening (`spec/12-security-hardening.md`) remains open —
  unrelated to the UI-refresh work but still the largest unresolved
  backlog in the repo per `spec/README.md`'s Status section.

### How to resume

1. Read `spec/README.md` for the phase index and Status section (always
   the fastest way back into current state).
2. Read this file's "Current state" table above.
3. If picking up Phase 15: read `spec/15-ui-component-migration.md` in
   full — it's a flat, atomic checklist, start at the first unchecked
   box.
4. If the Routine above is still enabled, it may already have made
   progress since this entry was written — check
   `spec/15-ui-component-migration.md`'s checkboxes and recent commit
   history on `claude/modern-dillinger-aws` before assuming nothing has
   moved.

---

## Session: 2026-07-19 (visual-direction requirements correction)

### Decision

The user clarified that `claude/modern-dillinger-aws` was intended to
produce a clean visual break from legacy Dillinger, abandoning the existing
theme, style, and colors. Phase 13 had recorded the opposite assumption—keep
the plum accent and current brand—and Phases 14-15 faithfully carried that
assumption into the implementation. The branch therefore modernized
components and editor behavior without delivering the intended rebrand.

The preserve-plum/current-brand requirement is now explicitly superseded.
The product retains its name, behavior, accessibility bar, Astryx foundation,
and Phase 13 UI/AI/product decisions; only the visual direction is replaced.

### Specification changes

- Added `spec/20-clean-visual-rebrand.md`, the authoritative replacement
  visual spec. It summarizes Phases 13-19, maps what remains valid, defines
  the new editorial-workspace direction, prohibits legacy tokens/colors,
  and provides atomic foundation, shell, surface, accessibility, responsive,
  screenshot, cleanup, deployment, and definition-of-done tasks.
- Added dated extraction/supersession notices to Phases 13, 14, and 15 while
  retaining their original wording and completed findings as historical
  evidence of why the first migration preserved the old appearance.
- Revised Phase 18 so Phase 20 is a blocking dependency and detailed visual
  acceptance is sourced from Phase 20, then re-verified against the live
  Function URL in Phase 18.
- Updated `spec/README.md`, `spec/goal-completion-check.md`, and `CLAUDE.md`
  so future work follows the latest dated decision instead of treating old
  and replacement visual requirements as simultaneously active.

### Current state and resume point

- Phase 20 is specified but **not started**; none of its checkboxes are marked
  complete and no UI implementation was changed in this requirements pass.
- The currently deployed branch tenant still shows the legacy Dillinger
  visual identity and is not acceptance evidence for the rebrand.
- Phase 15's behavior and primitive migration remain complete. Phase 18 is
  blocked on Phases 16, 17, and 20 before final live acceptance.

### Verification

- Documentation-only validation completed with diff and cross-reference checks.
- No numbered phase checkbox changed during this requirements correction.

---

## Session: 2026-07-19 (canonical spec-status reporting standard)

### Decision

The phase/component status format accepted by the user is now the repository's
canonical agent handoff format. Every agent must produce a section named
`Spec Summary/Status` before reporting a task complete or closing after partial,
blocked, implementation, or documentation progress.

### Specification process changes

- Added `spec-summary-status.md` as the authoritative definition and template.
- Added the mandatory completion rule to `../AGENTS.md` and `../CLAUDE.md`.
- Updated `README.md` and `goal-completion-check.md` to route all task and goal
  reporting through the canonical format.
- Recorded the decision here so future sessions can distinguish the requirement
  from an optional presentation preference.

### Spec Summary/Status

| Phase | Scope | Progress | Status |
|---|---|---:|---|
| [Process (unphased)](spec-summary-status.md) | Agent spec-status reporting | N/A | Complete; no numbered phase checkbox changed |

| Component or deliverable | Implementation status | Verification or remaining work |
|---|---|---|
| Canonical reporting standard | Defined with required tables, status rules, closing fields, and a copyable template | Schema, examples, and whitespace verified |
| Agent instruction | Mandatory rules added to `AGENTS.md` and `CLAUDE.md` | Repository-root discoverability verified |
| Spec workflow | Index and completion audit route to the canonical standard | Links and exact table terminology verified |
| Session evidence | Decision and resume state recorded in this ledger | Complete; final working-tree state remains to be handed off |

**Overall:** The reporting requirement is defined and wired into all agent-facing spec workflow documents; no product phase status changed.

**Evidence:** Documentation diff, link/cross-reference search, and `git diff --check`.

**Change state:** Uncommitted on `claude/modern-dillinger-aws`.

---

## Session: 2026-07-19 (Phase 20 clarification baseline)

### Decision and work completed

Phase 20 execution began with the dependency-safe clarification/baseline slice.
The legacy deployment is now captured as historical evidence, all theme debt is
inventoried, the final screenshot contract is explicit, and the proposed
palette has automated contrast evidence. A responsive static shell prototype
is ready for user confirmation before component migration begins.

### Current state and resume point

- Six of seven clarification tasks are complete; Phase 20 is 6/44 overall.
- The remaining clarification task is explicit approval of the desktop/mobile
  static shell direction under `artifacts/phase20/prototype/`.
- Runtime implementation has not started. Begin the owned theme/token
  foundation only after the prototype direction is confirmed.
- Project dependencies could not be installed in this environment: npm hit two
  cache rename failures and then allocator corruption. Evidence capture used
  the system Python Playwright client against the live branch tenant.

### Spec Summary/Status

| Phase | Scope | Progress | Status |
|---|---|---:|---|
| [20](20-clean-visual-rebrand.md) | Clean visual rebrand | 6/44 | Partial; baseline/audit complete, prototype approval and implementation pending |

| Component or surface | Functional status | Clean-rebrand status |
|---|---|---|
| Legacy editor shell | Existing behavior unchanged; deterministic live captures completed | Documented as `before` evidence only |
| Theme/token foundation | Existing neutral theme and Tailwind behavior inventoried | Not started; full removal map recorded |
| Desktop/mobile shell | Static responsive prototype rendered | Ready for explicit direction approval |
| Routes and overlays | Existing states enumerated and open states captured | Complete `after` screenshot matrix defined |

**Overall:** Phase 20 is partial at 6/44; clarification evidence is complete except prototype approval, and no runtime rebrand has been implemented.

**Evidence:** `artifacts/phase20/` screenshots, audit, route/state matrix, passing adjusted contrast checker, and Python syntax check.

**Change state:** Uncommitted on `claude/modern-dillinger-aws`.

---

## Session: 2026-07-19 (Phase 20 owned theme/token foundation)

### Decision and work completed

Continuing Phase 20 confirmed the desktop/mobile prototype direction and moved
the runtime off the legacy Dillinger visual identity. One owned semantic source
now drives a custom Astryx theme and Tailwind utilities; Vercel's self-hosted
Geist package supplies the root Sans/Mono variables. Global canvas, focus,
preview, styled-export, and Open Graph colors now use the replacement palette.

All rendered legacy utility consumers were mechanically migrated to semantic
names rather than compatibility aliases. A prebuild prevention script makes the
removal enforceable. It passes across 123 application-source files.

### Current state and resume point

- Phase 20 is 14/44. Clarification is complete and seven of eight foundation
  tasks are checked.
- Resume at the unchecked foundation unit-test task: the node-only suite exists,
  but Vitest could not start because repeated npm/Bun installs left transitive
  package directories empty under Proot. Re-run it in a healthy dependency
  tree before checking the task.
- After the mode suite passes, proceed to structural application-shell redesign;
  current call sites use the owned palette but are not yet accepted as the new
  Navbar/Sidebar/editor composition.
- Concurrent Phase 16 folder/tag/search files appeared during this session and
  were preserved untouched; their schema-related typecheck findings are not
  Phase 20 regressions.

### Spec Summary/Status

| Phase | Scope | Progress | Status |
|---|---|---:|---|
| [20](20-clean-visual-rebrand.md) | Clean visual rebrand | 14/44 | 🟡 Foundation implemented; unit execution and structural surface migration remain |

| Component or surface | Functional status | Clean-rebrand status |
|---|---|---|
| Owned theme and tokens | Custom Astryx theme, semantic Tailwind bridge, light/dark values, and build-time prevention implemented | Foundation code complete; Vitest execution remains open |
| Theme modes | Existing persisted light/dark/system behavior routes through one helper and owned theme | Pure unit coverage added; runner could not start in the damaged dependency tree |
| Global/document defaults | Root Geist variables, canvas/text/focus, preview, styled export, and Open Graph palette migrated | Token migration landed; full document/route visual acceptance remains open |
| Application shell | Existing behaviors and Astryx primitives preserved; legacy utility names removed | Structural Navbar/Sidebar/editor redesign has not started |

**Overall:** Phase 20 is partial at 14/44; the owned visual foundation is implemented, while test-run proof and the visible shell/surface redesign remain the immediate dependencies.

**Evidence:** the core Phase 20 foundation passed an isolated TypeScript compile before later install attempts damaged `node_modules`; the final dependency-free Bun parse/bundle passed for seven Phase 20 entry modules; `npm run check:legacy-theme` passed across 123 files; palette/control-border contrast checker and `git diff --check` passed; repository-wide typecheck reported only unrelated existing/concurrent errors.

**Change state:** Uncommitted on `claude/modern-dillinger-aws`.

---

## Session: 2026-07-19 (Phase 20 application-shell composition)

### Decision and work completed

Phase 20 continued past the unavailable foundation test runner instead of
treating the dependency-tree defect as a stop condition. The approved
modern-editorial prototype is now represented in the application source:
the shell composition changed, rather than only recoloring legacy elements.

- The Navbar now uses a restrained Dillinger wordmark, compact primary
  controls, and progressive disclosure for secondary editor actions.
- The Sidebar and DocumentList now form a surfaced 288px library with owned
  provider/action states, selection, metadata, empty/overflow treatment, and
  available Phase 16 folder/tag state.
- DocumentTitle, the grouped/mobile-overflow formatting strip, labelled
  editor/preview panes, a mobile Write/Preview switcher, focus mode, and
  drag/drop are one coherent workspace treatment.
- Monaco and preview surfaces now resolve from owned tokens; the default
  document no longer renders the retired placeholder palette.

### Current state and resume point

- Phase 20 is 21/44. Seven application-shell implementation tasks are checked;
  the three-viewport rendered verification task remains open.
- Resume with a healthy dependency tree, render the shell at 1440×900,
  768×1024, and 390×844 in light/dark modes, fix any layout findings, and
  only then check the viewport task.
- The foundation theme-mode test remains implemented but unexecuted. After
  shell viewport proof, continue through document presentation, overlays,
  secondary states, route consistency, accessibility, and visual acceptance.
- Concurrent Phase 16 schema/store/search work remains present and was not
  reverted; the shell consumes its folder/tag state without claiming Phase 16
  UI completion.

### Spec Summary/Status

| Phase | Scope | Progress | Status |
|---|---|---:|---|
| [20](20-clean-visual-rebrand.md) | Clean visual rebrand | 21/44 | 🟡 Foundation and structural application shell implemented; rendered acceptance and remaining surfaces/tests remain |

| Component or surface | Functional status | Clean-rebrand status |
|---|---|---|
| Navbar and title | Existing sidebar, import/export, preview, settings, and rename/status behaviors remain wired; updated Navbar test parses | New wordmark, hierarchy, action grouping, owned states, and compact responsive controls implemented; rendered viewport proof remains |
| Sidebar and documents | Create/save/delete, provider modals, selection, folder/tag metadata, empty and overflow states are wired | New library surface, section hierarchy, provider badges, selection, and action hierarchy implemented; browser regression remains |
| Formatting toolbar | All nine insertion actions and dismiss behavior remain wired | Grouping, separators, owned hover/focus treatment, and horizontal mobile access implemented |
| Editor and preview | Monaco, scroll-sync, preview collapse, file drop, and zen keyboard behavior remain wired; mobile pane tabs added | Labelled framed panes, owned divider/surfaces, mobile recomposition, focus mode, and drop treatment implemented; three-viewport screenshots remain |
| Theme modes | Owned light/dark/system path and unit suite remain present | Unit execution is still open because the dependency tree is unavailable |

**Overall:** Phase 20 is partial at 21/44; the clean-break shell is implemented in source, with rendered viewport proof and the remaining document/overlay/accessibility/live-acceptance work still required.

**Evidence:** dependency-free Bun parse/bundle passed for eight shell modules plus the Navbar test; `npm run check:legacy-theme` passed across 123 rendered-source files; `git diff --check` passed. Full unit/build/browser runs remain unavailable because `node_modules` is absent after the documented Proot install failures.

**Change state:** Uncommitted on `claude/modern-dillinger-aws`.

---

## Session: 2026-07-20 (Phase 20 final local acceptance)

### Decision and work completed

The full clean visual rebrand is implemented and locally accepted. The branch
now presents an owned slate/indigo editorial workspace rather than the legacy
charcoal/mint Dillinger composition, while retaining Astryx primitives and the
existing editor/product behavior.

- Completed the preview, overlay, secondary-state, content-route, error/404,
  responsive, accessibility, motion, theme persistence, and cleanup work.
- Added the owned mode-selection tests, prohibited-theme prebuild gate,
  computed-style and axe browser assertions, 320px/keyboard/system-mode
  scenarios, full route/state capture runner, contrast audit, and 126-image
  evidence matrix.
- Regression review fixed contrast and scroll-region findings, Monaco shortcut
  capture/contribution/theme/lifecycle issues, and preview scroll-origin
  normalization; legacy browser assertions now traverse the rebranded shell.
- Updated root and component contributor notes to make the owned token/theme
  layer authoritative and forbid legacy styling.

### Verification and resume point

- Green: lint; typecheck; 123-file legacy-theme gate; contrast audit;
  production build; 33/33 Vitest files (381 passed, one intentional skip,
  91.77% statement / 92.12% line coverage); 43/43 repository E2E; 5/5 Phase
  20 E2E; 126 screenshots across 39 IDs; representative human visual review.
- Phase 20 is 42/44. Only branch CI/OIDC deployment proof and the dependent
  phase-index completion checkbox remain.
- Next: commit/push the verified worktree, monitor the branch deployment,
  verify the live Function URL, then record the run/URL in Phases 20 and 18,
  close Phase 20 at 44/44, update the index/ledger, and push the closure commit.

### Spec Summary/Status

| Phase | Scope | Progress | Status |
|---|---|---:|---|
| [20](20-clean-visual-rebrand.md) | Clean visual rebrand | 42/44 | 🟡 Local implementation and acceptance complete; branch CI/OIDC deployment proof and final index closure remain |
| [18](18-ui-verification-and-testing.md) | Live UI verification | 0/17 | ⛔ Still blocked on the Phase 20 live handoff plus its existing Phase 16/17 dependencies |

| Component or surface | Functional status | Clean-rebrand status |
|---|---|---|
| Theme and tokens | Owned light/dark/system theme, SSR cookie, live media reaction, semantic bridge, and legacy gate pass | Complete locally; contrast matrix passes |
| Shell and document | Editor, preview, scroll-sync, paste, shortcuts, responsive pane controls, import/export, and document workflows pass | Complete locally across shell, preview, focus, drop, mobile, and document states |
| Overlays and routes | Menus, command palette, dialogs, provider states, toasts, content routes, 404/error/loading/offline states pass | Complete locally across owned overlay and route treatments |
| Accessibility and evidence | Keyboard, reduced motion, 320px, theme persistence, and axe scenarios pass | 126-image matrix and before/after verdict complete; live deployment evidence pending |

**Overall:** Phase 20 is locally accepted at 42/44; CI/OIDC deployment and live verification are the only remaining phase requirements.

**Evidence:** lint/typecheck/build/legacy/contrast pass; Vitest 381 passed + 1 skipped with coverage; Playwright 43 + 5 passed; 126-image matrix and representative visual review.

**Change state:** Uncommitted on `claude/modern-dillinger-aws`.

---

## Session: 2026-07-20 (Phase 20 deployment and completion)

### Decision and work completed

Phase 20's locally accepted rebrand was deployed and independently verified on
the dedicated branch tenant. The result is now handed to Phase 18 without
claiming completion of Phase 18's separate functional/AI/performance scope.

- CI/OIDC run 29725965083 deployed implementation commit `c6941cf` and passed
  the security, SAM deployment, HTTP 200 smoke, artifact, and registry steps.
- Live Function URL:
  `https://3tfsfijqedt62hf3vfdfxwunua0rkjgo.lambda-url.ap-southeast-1.on.aws/`.
- Four focused production-app browser scenarios pass live; the reusable Python
  verifier passes six result groups and records four viewport screenshots,
  fresh-session dark SSR, owned computed tokens, no legacy computed matches,
  no overflow, live 404, and zero console/network failures.
- Phase 20's last two tasks, Results log, artifact guide, phase index, and the
  Phase 18 handoff are updated from the observed deployment evidence.

### Spec Summary/Status

| Phase | Scope | Progress | Status |
|---|---|---:|---|
| [20](20-clean-visual-rebrand.md) | Clean visual rebrand | 44/44 | ✅ Complete, deployed, and live-verified |
| [18](18-ui-verification-and-testing.md) | Live UI verification | 6/17 | 🟡 Phase 20 visual/deployment slice accepted; broader functional, AI, performance, and parity work remains |

| Component or surface | Functional status | Clean-rebrand/live status |
|---|---|---|
| CI/OIDC deployment | Security, SAM, smoke, artifact, and tenant-registry steps pass | Dedicated branch Function URL serves the rebrand |
| Theme and tokens | Light/dark/system, cookie, SSR, Monaco reaction, and command paths pass live | Owned values/Geist/Astryx identity present; sampled legacy values absent |
| Shell and responsive workspace | Monaco, toolbar, palette, folder/tag presentation, and 404 render live | Desktop light/dark, tablet, mobile, and 320px checks pass without overflow |
| Visual evidence | Canonical 126-image local matrix remains the full regression baseline | Four live screenshots and manifest handed to Phase 18; clean-break verdict recorded |

**Overall:** Phase 20 is complete at 44/44 and live on the dedicated branch tenant. Phase 18 is partial at 6/17 because its non-visual initiative checks remain open.

**Evidence:** CI/OIDC run 29725965083; HTTP 200 deployment artifact; live focused browser scenarios; six-group live verifier; 126 canonical plus four live screenshots; zero live console/network failures.

**Change state:** Implementation commit `c6941cf` is pushed; completion documentation and live evidence are pending the closure commit on `claude/modern-dillinger-aws`.

---

## Session: 2026-08-02 (dual CI provider selection)

- Added a versioned `infra/ci-provider.json` selector. `github` remains the default; switching it to `buildkite` activates Buildkite and gates all GitHub Actions test/deploy/lifecycle jobs off.
- Added Buildkite bootstrap and active pipeline definitions, including the same test, audit, SBOM, manual staging-deploy, smoke-test, deployment-artifact, and tenant-registry write-back path.
- Added a Buildkite OIDC trust-policy template constrained to one organization, one pipeline, and `main`; the external Buildkite organization identifiers, OIDC provider, role, and checkout write credential remain administrator setup steps documented in `.buildkite/README.md`.
- Verified selector behavior, shell syntax, YAML/JSON parsing, and whitespace. No deployment or AWS mutation was run.
- Added `docs/buildkite.md`, a user-facing prerequisite, AWS OIDC, activation, verification, scope, and rollback guide; linked it from the root README and Buildkite implementation notes.
