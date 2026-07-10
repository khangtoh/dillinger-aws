# Phase 9 — Multi-User / Multi-Instance Support

Requirement (added by user): the architecture should enable running
Dillinger for multiple users, not just a single personal deployment.

**"Multiple instances" is ambiguous between three real architectures with
very different scope.** Asked the user to pick via `AskUserQuestion` twice
(2026-07-10); the tool errored both times (transient issue, not a denial).
Defaulting to Option A below since it's the lowest-risk, lowest-cost path
and is a strict subset of what Options B/C would also need — proceeding
with it now rather than blocking the whole migration on this one open
question. **This default is not final — swap it out the moment the user
confirms which model they actually want.**

## Option A — Shared deployment, many concurrent users (default, in progress)

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

## Option B — Isolated deployment per user/tenant (not started)

Each user/org gets their own Lambda function + Function URL (and possibly
own custom domain, own data). This is a small SaaS control-plane, not a
port:
- A provisioning API/service that can create a new stack (via the same
  `infra/template.yaml`, parameterized per tenant) on signup.
- A tenant registry (e.g. DynamoDB) mapping user → their stack/URL.
- Some routing layer (e.g. `<tenant>.dillinger.example.com` via
  CloudFront + Route53 wildcard) so each tenant gets a stable URL.
- Teardown/cost-management story for idle tenants.

Only pursue this if the user explicitly wants tenant-level isolation
(e.g. compliance/data-residency requirements) — it multiplies the scope
of this project.

## Option C — Shared deployment with server-side per-user workspaces (not started)

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

## Resolution

_(fill in once the user confirms A, B, or C — or a variant)_
