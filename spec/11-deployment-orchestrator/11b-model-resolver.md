# Sub-spec 11b — Deployment Model Resolver (Module B)

Read `spec/11-deployment-orchestrator/README.md` first for the overall
architecture and shared JSON contracts — this sub-spec only covers what's
specific to this module.

**You own (create/edit) only these files:**
- `infra/orchestrator/resolve-model.sh`
- `infra/deployment-model.json`
- `infra/desired-tenants.json`
- `infra/orchestrator/test/resolve-model.test.sh`

Do not touch any other file in the repo. If you think another file needs
to change, stop and say so instead of editing it — another sub-agent may
own it. In particular, do not touch `infra/tenants.json` (that's a
different, pre-existing file — Phase 9's actual-deployed-state registry —
not the one you're creating).

## What this module does

Pure local-file logic, **no AWS calls at all** — figures out "what should
be deployed" by reading two small human-edited config files and
normalizing/validating them into one clean descriptor for downstream
modules. This is deliberately separate from checking what's *actually*
deployed (that's Module C's job) — this module never touches the network.

## Behavior

1. If `infra/deployment-model.json` doesn't exist, create it with:
   ```json
   {
     "model": "isolated-single-tenant-per-instance",
     "gateway": { "enabled": true, "domain": "", "acmCertificateArn": "" }
   }
   ```
   (This should already exist as a committed file per the README's
   contract — treat "doesn't exist" as a defensive fallback, not the
   expected path, and still create it so the script never crashes on a
   fresh checkout.)
2. If `infra/desired-tenants.json` doesn't exist, treat it as
   `{"tenants": []}` (empty desired state is valid, not an error — it
   just means nothing should be deployed yet). Also create the file with
   that empty content if missing, same defensive-fallback reasoning as
   above.
3. Validate `deployment-model.json`:
   - `model` must be exactly `"isolated-single-tenant-per-instance"` for
     now. Any other value (including a typo) is a hard error — print a
     clear message naming the bad value and exit non-zero. Don't
     silently fall back to a default.
   - `gateway.enabled` must be a boolean.
   - `gateway.domain` / `gateway.acmCertificateArn` must be strings
     (empty string is valid — means "not configured yet").
4. Validate `desired-tenants.json`:
   - `tenants` must be an array (possibly empty).
   - Each entry needs `tenantId` matching `^[a-z0-9-]+$` (same pattern
     `provision-tenant.sh` already enforces — stay consistent) and a
     `region` string (non-empty).
   - Reject duplicate `tenantId`s with a clear error naming the
     duplicate.
5. Write `infra/orchestrator/state/desired-state.json`:
   ```json
   {
     "model": "isolated-single-tenant-per-instance",
     "gateway": { "enabled": true, "domain": "", "acmCertificateArn": "" },
     "tenants": [ { "tenantId": "acme", "region": "us-east-1" } ]
   }
   ```
   (This is just the two input files merged/normalized into one file —
   there's no derived computation here beyond validation.)
6. Print a one-line summary, e.g.:
   `Desired state: isolated-single-tenant-per-instance model, gateway enabled, 2 tenant(s) configured`
7. Exit `0` on valid config (including the legitimately-empty-tenants
   case). Non-zero with a specific, actionable stderr message for every
   validation failure in step 3-4 — a future user debugging a typo in
   `desired-tenants.json` should immediately know what's wrong from the
   error text alone.

## Tests

Write `resolve-model.test.sh` (plain bash, consistent with this repo's
style, no new test framework dependency) that, using temporary
directories/files (don't touch the real committed
`infra/deployment-model.json` / `infra/desired-tenants.json` while
testing — copy them to a scratch location or use env var/argument
overrides if you add one for testability):

1. Valid config (one tenant) → asserts exit `0` and the resulting
   `desired-state.json` contains that tenant.
2. Empty `desired-tenants.json` → asserts exit `0` and an empty
   `tenants` array in the output (this must NOT be treated as an error).
3. Invalid `model` value (e.g. `"something-else"`) → asserts non-zero
   exit and a stderr message naming the bad value.
4. Duplicate `tenantId` → asserts non-zero exit and a stderr message
   naming the duplicate.
5. Invalid `tenantId` (e.g. contains uppercase or spaces) → asserts
   non-zero exit.

Print a clear PASS/FAIL summary; exit non-zero if any assertion failed.
Run it yourself and confirm it actually passes before considering this
done — report the output.

## Definition of done

- [ ] `infra/orchestrator/resolve-model.sh` exists, is executable, passes
      `bash -n`.
- [ ] `infra/deployment-model.json` committed with the exact default
      content in step 1 above.
- [ ] `infra/desired-tenants.json` committed with `{"tenants": []}` — do
      **not** invent example tenants in the committed file, only in your
      test fixtures.
- [ ] `resolve-model.test.sh` exists, is executable, and **passes when
      you run it**.
- [ ] Commit your changes locally (do not push — the coordinating
      session will merge and push) with a clear commit message.
