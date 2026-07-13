# Phase 9 — Multi-User / Multi-Instance Support

Requirement (added by user): the architecture should enable running
Dillinger for multiple users, not just a single personal deployment.

**Resolved (2026-07-10):** user confirmed **Option B — isolated deployment
per user/tenant, where each instance is single-user (single
tenant = single user, never shared)**. Implemented below.

## Option B — Isolated deployment per user/tenant (chosen, in progress)

Each user gets their own fully isolated Lambda function + Function URL,
provisioned from the same `infra/template.yaml`, parameterized by a
`TenantId`. Nothing is shared between tenants — separate function, separate
Function URL, separate log group, separate CloudFormation stack. This
stays intentionally simple because each instance only ever has one user:

- [x] Parameterize `infra/template.yaml` with a `TenantId` parameter, used
      to tag resources (`TenantId` tag). Multiple isolated stacks already
      fall out of CloudFormation's per-stack physical-resource naming just
      by deploying the same template under different `--stack-name`
      values (`dillinger-<tenant-id>`) — no per-resource name templating
      was needed beyond the tag.
- [x] Add `infra/provision-tenant.sh <tenant-id> [region]` — builds,
      deploys a stack named `dillinger-<tenant-id>`, then redeploys once
      more with `NEXT_PUBLIC_BASE_URL` set to the resulting Function URL
      (needed for that tenant's OAuth callbacks to resolve correctly).
      Wraps `sam build` + `sam deploy`; requires the Phase 1 credentials
      and SAM CLI. **Not yet run for real** — blocked on Phase 1
      credentials and the sandbox's Docker registry restriction (same
      blocker as Phase 3/4).
- [x] Add a lightweight tenant registry: `infra/tenants.json` (updated
      automatically by `infra/record-tenant.py`, called from
      `provision-tenant.sh` after each deploy) — no database needed since
      tenants are provisioned by an admin running the script, not via
      self-serve signup. Seeded empty; will fill in as tenants are
      provisioned.
- [x] Provision a first real tenant end-to-end once Phase 1 credentials
      exist, confirming: the stack deploys standalone, `tenants.json`
      gets the correct entry, and the Function URL serves that tenant.
      Done 2026-07-11: tenant `staging` deployed via CI (the sandbox
      can't build the image — see `.github/workflows/README.md`),
      registered in `tenants.json` and `desired-tenants.json`, browser-
      verified serving (Phase 8). `run.sh` confirms IN_SYNC and no-ops.
      Use `infra/orchestrator/run.sh` (add the tenant to
      `infra/desired-tenants.json` first) rather than calling
      `provision-tenant.sh` directly — as of Phase 11f, `run.sh`
      automatically verifies "the Function URL serves that tenant" as
      part of the sync (see `spec/11-deployment-orchestrator/README.md`),
      so this box and the verification are the same action now.
- [x] Provision a second tenant and confirm total isolation from the
      first: different Function URL, different log group, and (once
      Phase 5 OAuth is configured per-tenant) no shared cookies/secrets.
      Done 2026-07-12 by the automated tenant-lifecycle workflow
      (`.github/workflows/tenant-lifecycle.yml`, run 29179251742): a
      second tenant (`lt29179251742`) was provisioned alongside
      `staging`, got its own distinct Function URL, and both served 200
      simultaneously; log groups are structurally per-stack (each
      tenant's stack owns its own `AWS::Logs::LogGroup`). OAuth
      cookie/secret isolation still pends Phase 5 being configured at
      all. The tenant was then deprovisioned with zero leaked stacks —
      this check is now repeatable anytime via
      `gh workflow run tenant-lifecycle.yml`.
- [x] Provision a second **persistent** (non-throwaway) tenant alongside
      `staging` and confirm the account can actually sustain it. Done
      2026-07-12 via `deploy-branch-tenant.yml`: found the account's
      Lambda concurrency quota is tight enough that a second tenant at
      the template's default `MaxTenantConcurrency=2` fails
      CloudFormation creation outright (AWS's mandatory ≥10-unit
      unreserved-concurrency floor — see `ARCHITECTURE.md`'s "Reserved
      concurrency and the microVM pool" for the full mechanism and the
      exact error). `MaxTenantConcurrency=1` was tried next and **failed
      identically** — the diagnostic that this account's quota has zero
      headroom for any additional reservation, not just insufficient
      headroom for a large one (math in ARCHITECTURE.md puts the
      account's total quota at roughly 12). Resolved by dropping
      reserved concurrency for this tenant entirely
      (`MaxTenantConcurrency=0`, now a valid value —
      `ReservedConcurrentExecutions` is omitted from the CloudFormation
      resource rather than set to a degenerate `0`, and the
      concurrency-cap alarm is skipped alongside it), so the tenant
      draws from the account's shared unreserved pool instead of
      fighting for a reservation. Deliberate for this dev stage: with a
      small number of low-traffic tenants and a quota this tight,
      reserved concurrency's isolation guarantee has no one to protect
      against yet and only costs headroom the account doesn't have.
      `staging`'s own reservation (`2`) is untouched. Revisit (re-enable
      a positive `MaxTenantConcurrency` per tenant) once the account's
      quota is raised via AWS Service Quotas, or real concurrent
      external users make the isolation guarantee worth it again.
- [ ] Decide, once real usage exists, whether `FunctionUrlConfig.AuthType`
      should move from `NONE` (public-but-unguessable URL, current v1
      default) to `AWS_IAM` per-tenant for stricter access control —
      tracked here, not blocking initial rollout.
- [x] Update `spec/07-execution-cicd.md` to either (a) keep CI deploying
      only a single default/staging tenant automatically and treat new
      real tenants as a manual `provision-tenant.sh` run, or (b) loop CI
      over all entries in `tenants.json`. **Went with (a)**:
      `.github/workflows/deploy-lambda.yml` deploys only a fixed
      `staging` tenant; real user tenants stay a manual
      `provision-tenant.sh` run. Revisit (b) only if there end up being
      enough real tenants that manual provisioning becomes a bottleneck.

### Superseded options (kept for reference)

The two alternatives considered before the user's decision:

#### Option A — Shared deployment, many concurrent users (not chosen)

One Lambda deployment serves everyone concurrently. This requires almost
no extra work on top of Phases 1–8, because:
- Lambda already scales horizontally per-request — concurrent users are
  handled natively, no code changes needed.
- Dillinger already keeps document state client-side (Zustand +
  localStorage), so two users hitting the same Function URL never share
  or collide over document state — each browser is already its own
  "instance" from the app's point of view.
- OAuth integrations (GitHub/Dropbox/etc., Phase 5) are already scoped
  per-user via cookies set in each user's own browser session.

Tasks:
- [ ] Confirm Lambda reserved/provisioned concurrency isn't needed for v1
      (default: on-demand concurrency, no reserved minimum) — revisit if
      real usage shows cold-start pain under load.
- [ ] Load-test with a handful of concurrent synthetic sessions after
      Phase 8 deploys, confirming no server-side state leaks between them
      (e.g. one session's OAuth cookie never appears in another's
      response).
- [x] Document in `spec/README.md` that "multi-user" is satisfied by this
      option, once confirmed by the user.

#### Option C — Shared deployment with server-side per-user workspaces (not chosen)

One deployment, but documents are no longer purely client-side —
add lightweight auth + a persistence layer (S3 or DynamoDB) so the same
user can reach their documents from a different device/browser, while
still not needing full per-tenant infrastructure. Needs:
      Done — `spec/README.md`'s Status section documents the model and
      the live first tenant; the deep-dive rationale (Firecracker
      boundary as the tenant boundary) is in `ARCHITECTURE.md`.
- [ ] Pick an auth mechanism (e.g. reuse one of the existing OAuth
      providers as "login," or add a dedicated one).
- [ ] Add a storage backend (S3/DynamoDB) keyed by user ID, replacing or
      supplementing localStorage.
- [ ] Migrate `stores/store.ts` persistence to sync with the backend
      instead of (or in addition to) localStorage.
