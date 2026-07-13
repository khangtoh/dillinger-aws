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
