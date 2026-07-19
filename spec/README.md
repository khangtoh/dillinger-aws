# Dillinger on AWS Lambda — Spec Index

Goal: run [Dillinger](https://github.com/joemccann/dillinger) (a Next.js 14
markdown editor, currently deployed to Vercel with no Docker involved today)
on **AWS Lambda**, packaged as a container image so it executes inside
Lambda's Firecracker microVM runtime
(see https://aws.amazon.com/lambda/lambda-microvms/), instead of any
Docker-host/ECS/EC2-style deployment.

## How this spec set works

- Every numbered file under `spec/` is a phase. Every phase is a flat checklist of
  **atomic tasks** — each should be completable in under ~5 minutes.
  Unnumbered files such as `spec-summary-status.md` are process definitions or
  supporting records, not implementation phases.
- Check a box (`- [x]`) only once the task is actually done and, where
  applicable, verified.
- Every completed, partial, blocked, or documentation-only task handoff must
  include the canonical `Spec Summary/Status` report defined in
  [`spec-summary-status.md`](spec-summary-status.md).
- Work phases in order: a phase's tasks assume prior phases are checked off.
- A scheduled agent picks up the next unchecked box, does it, verifies it,
  updates its checkbox and required Results/status records, produces the
  mandatory `Spec Summary/Status` handoff, commits, and moves on — repeating until
  `spec/08-testing.md` is fully checked and a live Function URL is recorded
  below.

**Architecture deep dive:** [`ARCHITECTURE.md`](../ARCHITECTURE.md) —
how the Docker image becomes a Firecracker microVM, cold-start anatomy
with real measurements, and why per-tenant functions are the isolation
model.

**Is a goal actually done?**
[`goal-completion-check.md`](goal-completion-check.md) — a reusable
prompt that traces a stated goal through requirements → mapped spec
phases → actual checkbox state, instead of answering from impression.
Use it before telling anyone something ships.

**How must agents report spec status?**
[`spec-summary-status.md`](spec-summary-status.md) — the canonical phase and
component/deliverable tables, counting rules, closing evidence fields, and
mandatory completion procedure for every agent handoff.

**What actually happened, session by session?**
[`agent-session-ledger.md`](agent-session-ledger.md) — a dated log of
what each agent session did, decided, and left running (distinct from
the spec files, which are requirements/checklists, not narrative).
Read this first when resuming after a break; append a new entry when
closing one out.

## Phases

Status column legend (defined in
[`spec-summary-status.md`](spec-summary-status.md)): ✅ complete ·
🟡 partial · ⬜ not started · ⛔ blocked. Progress is `checked/total`
boxes in the phase file; keep both in sync when checking boxes.

| # | File | Purpose | Status | Blocking dependency |
|---|------|---------|--------|----------------------|
| 1 | [01-aws-account-onboarding.md](01-aws-account-onboarding.md) | Get working AWS credentials in this environment | ✅ 8/8 | **User action required** |
| 2 | [02-architecture-plan.md](02-architecture-plan.md) | Decide how Dillinger maps onto Lambda | ✅ 10/10 | None (design only) |
| 3 | [03-execution-containerize.md](03-execution-containerize.md) | Build the Lambda-compatible container image | 🟡 6/8 | Phase 2 |
| 4 | [04-execution-infra.md](04-execution-infra.md) | Provision AWS infra (ECR, Lambda, Function URL) | 🟡 9/10 | Phase 1 + 3 |
| 5 | [05-execution-oauth-secrets.md](05-execution-oauth-secrets.md) | Wire up optional cloud-storage OAuth integrations | ⬜ 0/8 | Phase 4 (optional/stretch) |
| 6 | [06-execution-pdf-export.md](06-execution-pdf-export.md) | Handle Puppeteer/Chromium PDF export on Lambda | ✅ 7/7 | Phase 4 (optional/stretch) |
| 7 | [07-execution-cicd.md](07-execution-cicd.md) | Automate build+deploy on push | ✅ 6/6 | Phase 4 |
| 8 | [08-testing.md](08-testing.md) | Verify the deployment actually works | 🟡 10/12 | Phase 4 |
| 9 | [09-multi-tenancy.md](09-multi-tenancy.md) | Multi-user: isolated single-tenant instance per user | 🟡 8/14 | Phase 4 |
| 10 | [10-gateway.md](10-gateway.md) | Single entry gateway routing to each tenant | 🟡 8/12 | Phase 9 |
| 11 | [11-deployment-orchestrator/README.md](11-deployment-orchestrator/README.md) | Credential-isolated validate → resolve → check → sync pipeline | ✅ 2/2 | Phase 9 + 10 |
| 12 | [12-security-hardening.md](12-security-hardening.md) | Close repository, AWS, credential, and operational security findings | 🟡 14/129 | Phase 7 + 8 + 10 + 11 |
| 13 | [13-ui-refresh-requirements.md](13-ui-refresh-requirements.md) | UI-refresh requirements and evaluations: current UI audit, Astryx evaluation, StackEdit gap analysis, product-direction decision, AI-native scope (design only) | ✅ 7/7 | None (builds on the live Phase 1-12 milestone) |
| 14 | [14-astryx-design-system-adoption.md](14-astryx-design-system-adoption.md) | Spike Astryx alongside Tailwind; explicit go/no-go gate | ✅ 22/22 | Phase 13 (unblocked 2026-07-12 — Phase 19 landed Next 15.5.20/React 19.2.7/StyleX 0.18.3, dry-run install confirmed clean). **Complete, Go call recorded 2026-07-13.** |
| 15 | [15-ui-component-migration.md](15-ui-component-migration.md) | Migrate components to Astryx; ship toolbar, scroll-sync, diagrams, command palette, theming | ✅ 36/36 | Phase 14 (Go) |
| 16 | [16-notes-information-architecture.md](16-notes-information-architecture.md) | Folders/tags/search on top of the client-only document model | 🟡 4/19 | Phase 13 (data model); Phase 15 (sidebar surface) |
| 17 | [17-ai-agent-native-features.md](17-ai-agent-native-features.md) | Real AI-native product features: document API contract, in-editor AI actions, follow-on MCP server | ⬜ 0/23 | Phase 13; AI-3 needs Phase 15's command palette |
| 18 | [18-ui-verification-and-testing.md](18-ui-verification-and-testing.md) | Prove the UI refresh works live, includes the clean visual rebrand, and closes the StackEdit gap | ⛔ 0/17 | Phase 15 + 16 + 17 (AI-1/AI-3) + 20 |
| 19 | [19-incremental-stack-upgrade-for-astryx.md](19-incremental-stack-upgrade-for-astryx.md) | Incrementally land Next 15.5.20, then React 19.2.7, then StyleX 0.18.3 — Astryx's actual minimum requirements | 🟡 35/43 | None (executes Phase 12's stack-upgrade item); unblocks Phase 14 |
| 20 | [20-clean-visual-rebrand.md](20-clean-visual-rebrand.md) | Replace the legacy Dillinger palette, typography, shell, component styling, and Markdown presentation with an owned visual system | 🟡 6/44 | Phase 14 + 15; blocks Phase 18 visual acceptance |

## Status

- [x] **Dillinger is live on AWS Lambda** — Function URL:
  `https://iepu7ka2gyaxnyhhnldynzgxgy0yonzr.lambda-url.ap-southeast-1.on.aws/`
  (tenant `staging`, stack `dillinger-staging`, ap-southeast-1; deployed
  2026-07-11 via CI, browser-verified end-to-end incl. live preview and
  PDF export — see `spec/08-testing.md` results log).
- Overall phase progress: see individual files.
- Phase 1 bootstrap (`spec/01-aws-account-onboarding.md`): **operational,
  security closure pending** — OIDC deployment is live and new bootstraps
  no longer create IAM users by default. The active legacy deploy key must
  move to temporary federated access and be deleted under Phase 12.
- Security hardening (`spec/12-security-hardening.md`): **open** — the
  prioritized closure backlog for credentials, supported dependencies,
  CI/CD, CloudFront origin access, WAF, AWS account controls, secret
  lifecycle, tenant isolation, and incident operations.
- Multi-user model (`spec/09-multi-tenancy.md`): **resolved** — one
  isolated Lambda deployment per user (`infra/provision-tenant.sh`), never
  shared. First real tenant (`staging`) provisioned 2026-07-11 via CI;
  a second tenant (isolation proof) is the next multi-tenancy milestone.
- Single entry gateway (`spec/10-gateway.md`): **deployed and live**
  (2026-07-10, the project's first real AWS deploy) — stack
  `dillinger-gateway` in us-east-1, serving at
  `dy1136w4wv8qd.cloudfront.net`; unknown-tenant 404 verified at the
  edge. Custom domain still blocked on a domain name (wildcard
  cert/DNS). Request-path docs: `infra/gateway/README.md`.
- Deployment orchestrator (`spec/11-deployment-orchestrator/`): **built
  and end-to-end verified with mocks** — `infra/orchestrator/run.sh` is
  now the one command to validate credentials, resolve desired state,
  check actual AWS state, and sync the difference. Built by four parallel
  background sub-agents (one per module), each merged and independently
  re-verified rather than trusted on report alone. **Now proven against
  real AWS**: `run.sh` deployed the gateway (2026-07-10), and with
  `staging` declared in `desired-tenants.json` it reports everything
  IN_SYNC and no-ops on re-run (2026-07-11). Three region-assumption
  bugs found and fixed during first real multi-region use (gateway is
  always us-east-1; tenants elsewhere).

## Non-goals for v1

- No self-hosted database — Dillinger already keeps state client-side
  (Zustand + localStorage), so none is needed on AWS either.
- OAuth cloud-storage sync (GitHub/Dropbox/Google Drive/OneDrive/Bitbucket)
  and PDF export are **optional** features layered on top of a working
  editor; they must not block the "app is running on Lambda" milestone.

## Phase 13-20: UI refresh, product direction, and clean visual rebrand

With the app live on Lambda, Phase 13 opens a second initiative: a UI
refresh built on the [Astryx](https://github.com/facebook/astryx) design
system, new editor UX intended to beat StackEdit's UI (folders, toolbar,
scroll-sync, diagrams, command palette, real theming), and real AI-native
product features (a stable document API contract, in-editor AI actions,
a follow-on MCP server) replacing what today is only marketing copy on
`/ai`. See [13-ui-refresh-requirements.md](13-ui-refresh-requirements.md)
for the full evaluation and recorded decisions, including the explicit
call to scope this as a multi-document manager (StackEdit-class), not a
full notes-management-app pivot — that's deferred as a separately-scoped
v2. A 2026-07-19 decision corrects Phase 13's original visual assumption:
the current plum/charcoal Dillinger theme is replaced, not preserved. The
requirements and extraction map are in
[20-clean-visual-rebrand.md](20-clean-visual-rebrand.md). None of Phases
14-20 change the Lambda packaging or multi-tenancy/gateway model from
Phases 1-12, apart from using the existing CI path to verify deployments.

In short: Phase 13 defined product and UX requirements; Phase 14 proved the
Astryx foundation; Phase 15 migrated components and added editor UX; Phase 16
owns folders/tags/search; Phase 17 owns AI-native behavior; Phase 18 owns
end-to-end live acceptance; Phase 19 supplied Astryx's required application
stack; and Phase 20 now owns the complete visual replacement that was missing
from the original requirement set.

- [ ] **UI refresh and clean visual rebrand live** — Phase 15 and Phase 19
      complete; Phases 16-18 and 20 remain open. Phase 13's product/UX
      decisions were recorded 2026-07-12 and its visual direction was revised
      2026-07-19 to replace the old Dillinger theme. **Phase 19 complete**
      (2026-07-12): incrementally landed Next 15.5.20 → React 19.2.7 →
      `@stylexjs/stylex@0.18.3`, each step fully verified (typecheck,
      unit, build, lint, E2E — all identical to a captured pre-upgrade
      baseline, zero regressions found at any step) and the app confirmed
      running via its actual Lambda-equivalent entrypoint
      (`node .next/standalone/server.js`). **Phase 14 complete, Go**
      (2026-07-13): swizzle spike (Navbar export dropdown via Astryx's
      `DropdownMenu`), theming, and dark-mode checks all done and
      verified in a real browser, not just jsdom — see
      `spec/14-astryx-design-system-adoption.md`'s Findings for the full
      tally. Its StyleX wiring/import fixups remain authoritative; its old
      carry-forward note to build a custom theme matching the plum brand is
      historical and superseded by Phase 20's owned replacement theme.
      **Phase 15 is unblocked.**
      **Phase 15 in progress** (2026-07-13): clarification pass done
      (UI-3 scroll-sync confirmed already fully wired end-to-end,
      UI-4 diagram library decided — `mermaid`, pure-JS deps, client-only
      dynamic import, no Lambda packaging impact) and the lowest-risk
      "Toast, Skeleton, KeyboardShortcuts" migration group is complete:
      Toast and KeyboardShortcuts now use Astryx's `Toast`/`Dialog`
      primitives (`useToast()`'s call signature and Toast's container
      role/aria unchanged; KeyboardShortcuts' shortcut-list content
      unchanged), Skeleton intentionally left hand-rolled Tailwind (see
      `spec/15-ui-component-migration.md` for why). The **Navbar group is
      also complete**: the export dropdown was already on the real
      (non-spike) Astryx `DropdownMenu`, and the remaining buttons
      (import, image insert, preview toggle, zen mode, settings,
      shortcuts) now use Astryx's `Button`/`ToggleButton`, preserving
      every `aria-label`/`aria-pressed` (the preview toggle's
      `aria-pressed` and icon swap are computed by `ToggleButton` itself
      instead of hand-set). Full unit suite green (317 passed / 1
      pre-existing skip), typecheck/lint clean, real-browser-verified
      (Playwright) with zero new console errors on both groups.
      **Phase 15 complete** (2026-07-13): Sidebar and every remaining
      modal (Settings, Delete-confirm, GitHub/Dropbox/Google Drive/
      OneDrive/Bitbucket) now on Astryx `Collapsible`/`Dialog`/
      `AlertDialog`/`Layout` primitives; UI-6 real light/dark/system
      theming wired end-to-end (a genuinely latent dark-mode text-
      legibility bug, present since Phase 14 but never visible until
      dark mode was actually reachable, was found and fixed along the
      way); UI-2 formatting toolbar and UI-5 command palette both ship,
      sharing one `TOOLBAR_ACTIONS` source of truth; UI-3 scroll-sync
      confirmed already correct (no code change needed); UI-4 Mermaid
      diagrams ship, deliberately skipping DOMPurify for mermaid's own
      generated SVG only (documented, scoped trade-off — mermaid's
      `securityLevel: "strict"` already sanitizes it, and DOMPurify
      itself can't preserve SVG `<foreignObject>` content). Full
      regression pass: lint/typecheck clean, unit 344 passed (1
      pre-existing skip), E2E 42/43 passed — the one failure needs
      Monaco to load, which this sandbox's blocked CDN prevents
      regardless of app code (documented in
      `spec/15-ui-component-migration.md`, expected to pass with normal
      network access). Coverage (91.85%/75.34%/92.81%/92.17%) matches
      the true pre-Phase-15 baseline — the 98%/91%/99.5%/98% figure
      documented in `CLAUDE.md` predates Phase 14's own additions and
      was already stale before this phase started. **Visual decision revised
      2026-07-19:** Phase 15's functionality and primitive migrations remain,
      but its retained legacy palette and overrides are now explicit Phase 20
      migration debt. Phase 20 is not started, so the current deployment is
      not evidence of the requested rebrand. Separately, the Lambda container
      build and staging deploy for the Phase 19 stack upgrade still needs the
      CI path before that upgrade reaches `staging`. Update this line with the
      tenant URL and date once Phases 18 and 20 close out.

## Non-goals for the UI-refresh initiative (Phase 13-20)

- Full notes-management-app depth (backlinks, graph view, full-text body
  search, daily notes) — deferred to a separately-scoped v2 per Phase 13
  Section D; this initiative ships folders + tags + title/tag search only.
- Real-time collaborative editing — structurally in tension with the
  stateless, per-tenant-isolated Lambda architecture; flagged as an open
  question for the user in Phase 13, not assumed in scope.
- Any change to `infra/`, the Lambda container packaging, the gateway, or
  the multi-tenancy model — this initiative is UI/product-surface only,
  built on top of the Phase 1-12 runtime unchanged.
