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
- [ ] Provision a first real tenant end-to-end once Phase 1 credentials
      exist, confirming: the stack deploys standalone, `tenants.json`
      gets the correct entry, and the Function URL serves that tenant.
- [ ] Provision a second tenant and confirm total isolation from the
      first: different Function URL, different log group, and (once
      Phase 5 OAuth is configured per-tenant) no shared cookies/secrets.
- [ ] Decide, once real usage exists, whether `FunctionUrlConfig.AuthType`
      should move from `NONE` (public-but-unguessable URL, current v1
      default) to `AWS_IAM` per-tenant for stricter access control —
      tracked here, not blocking initial rollout.
- [ ] Update `spec/07-execution-cicd.md` to either (a) keep CI deploying
      only a single default/staging tenant automatically and treat new
      real tenants as a manual `provision-tenant.sh` run, or (b) loop CI
      over all entries in `tenants.json` — decide once there's more than
      one real tenant to see which is actually useful.

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
- [ ] Document in `spec/README.md` that "multi-user" is satisfied by this
      option, once confirmed by the user.

#### Option C — Shared deployment with server-side per-user workspaces (not chosen)

One deployment, but documents are no longer purely client-side —
add lightweight auth + a persistence layer (S3 or DynamoDB) so the same
user can reach their documents from a different device/browser, while
still not needing full per-tenant infrastructure. Needs:
- [ ] Pick an auth mechanism (e.g. reuse one of the existing OAuth
      providers as "login," or add a dedicated one).
- [ ] Add a storage backend (S3/DynamoDB) keyed by user ID, replacing or
      supplementing localStorage.
- [ ] Migrate `stores/store.ts` persistence to sync with the backend
      instead of (or in addition to) localStorage.
