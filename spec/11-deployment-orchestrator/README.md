# Phase 11 — Credential-Isolated Deployment Orchestrator

## Why this exists

Every phase so far (4, 9, 10) assumed a human runs `provision-tenant.sh`
by hand, once credentials happen to be present, for one tenant at a time.
That doesn't scale to "check what's configured and make reality match it"
— which is what's actually needed for a Routine (or a human, or CI) to
safely re-run *the same command* on every firing and have it do the right
thing whether that's "nothing to do," "deploy 3 new tenants," or "one
tenant drifted, redeploy it."

This phase builds that: a small pipeline of independent, single-purpose
scripts under `infra/orchestrator/`, each reading the previous stage's
output instead of re-deriving it, so:

1. **Credential handling is isolated** — one script is the only thing
   that touches "do we have AWS access, and is it sufficient." Nothing
   else re-implements that check.
2. **"What should be deployed" is explicit config, not inferred** — a
   human-edited desired-state file, resolved against the multi-tenancy
   model decided in Phase 9, not hardcoded into deploy logic.
3. **State is checked before acting** — actual AWS state is compared
   against desired state (existence + a config-drift fingerprint) before
   anything is deployed, so re-runs are safe/idempotent and drifted
   tenants get caught, not just missing ones.
4. **Sync is a separate, explicit step** — deciding what's out of sync
   and actually deploying it are two different scripts, so "tell me
   what's wrong" and "fix it" aren't bundled into one unreviewable action.

End state: `infra/orchestrator/run.sh` becomes the one command a future
Routine firing (or the user, or CI) runs. It's safe to run repeatedly —
each stage is idempotent and stops early if an earlier stage isn't
healthy, rather than plowing ahead on bad data.

## Architecture

```
run.sh
  │
  ├─▶ credential-guard.sh   (Module A)
  │     reads: AWS CLI environment
  │     writes: state/credential-status.json
  │     "do we have AWS access, with the right permissions?"
  │
  ├─▶ resolve-model.sh      (Module B)
  │     reads: ../deployment-model.json, ../desired-tenants.json
  │     writes: state/desired-state.json
  │     "what SHOULD be deployed, per Phase 9's chosen model?"
  │     (pure local file reads - no AWS calls, no dependency on Module A)
  │
  ├─▶ check-state.sh        (Module C)
  │     reads: state/credential-status.json, state/desired-state.json
  │     writes: state/deployment-state.json
  │     "what's ACTUALLY deployed, and does it match desired-state?"
  │
  └─▶ sync.sh                (Module D)
        reads: state/deployment-state.json, state/credential-status.json
        calls: ../provision-tenant.sh, ../gateway/deploy-gateway.sh,
               verify-tenant.sh (post-deploy smoke test, added after
               initial build - see "Post-deploy verification" below)
        "make actual state match desired state, and confirm it's real"
```

Modules A and B have no dependency on each other and can be built/tested
in parallel. C depends on both A's and B's *output schemas* (not their
code) - it only ever reads their JSON files, so it can also be built in
parallel once the schemas below are fixed. D depends on C's output schema
the same way. Because every module talks to the next only through a JSON
file on disk (never by importing another module's internals), all four
can be implemented independently against the contracts in this document
without touching each other's files.

## File ownership (avoids merge conflicts across parallel sub-agents)

| Sub-spec | Owns (creates/edits) | Must NOT touch |
|---|---|---|
| 11a (Module A) | `infra/orchestrator/credential-guard.sh`, `infra/orchestrator/test/mock-aws-*.sh`, `infra/orchestrator/test/credential-guard.test.sh` | everything else |
| 11b (Module B) | `infra/orchestrator/resolve-model.sh`, `infra/deployment-model.json`, `infra/desired-tenants.json`, `infra/orchestrator/test/resolve-model.test.sh` | everything else |
| 11c (Module C) | `infra/orchestrator/check-state.sh`, `infra/orchestrator/test/check-state.test.sh` | everything else |
| 11d (Module D) | `infra/orchestrator/sync.sh`, `infra/gateway/deploy-gateway.sh`, `infra/orchestrator/test/sync.test.sh` | everything else |
| 11e (integration, done after A-D land) | `infra/orchestrator/run.sh`, spec cross-links, `infra/orchestrator/lib/config-hash.sh` consumers | — |
| 11f (post-deploy verification, added after 11a-11e) | `infra/orchestrator/verify-tenant.sh`, `infra/orchestrator/test/verify-tenant.test.sh`, plus wiring into `sync.sh`/`sync.test.sh` | — |

## Post-deploy verification (11f)

A gap identified after the initial four-module build: `sync.sh` only
proved the deploy *command* exited 0 (CloudFormation says the stack
completed) — nothing confirmed the resulting Function URL was actually
serving Dillinger. A stack can finish "successfully" while the app itself
is crash-looping, missing an env var, or timing out on cold start.

`infra/orchestrator/verify-tenant.sh <tenant-id> <function-url>` closes
this: after `sync.sh` successfully deploys/redeploys a tenant, it looks
up that tenant's Function URL from `infra/tenants.json` (written by
`provision-tenant.sh`/`record-tenant.py`) and runs two checks —
`GET /` expects 2xx, `GET /<unknown-route>` expects 404 — reporting
`success (verified)` vs `deployed, verification FAILED` in the sync
summary. A verification failure counts toward `sync.sh`'s non-zero exit,
same as a deploy failure, but does **not** mark the tenant `FAILED` the
way a CloudFormation failure does (a plain re-sync might fix a transient
issue like cold-start timing) — it's `check-state.sh`'s config-hash
comparison, not verification status, that ever sets `FAILED`.

This is a lightweight smoke test, not the full `spec/08-testing.md`
checklist (browser rendering, editor interactivity, OAuth flows still
need a human or Playwright) — it only proves the Lambda function is
reachable and responding sanely, automating the first bullet of Phase 8
("Smoke test: `curl -I <Function URL>` returns 200") and part of Phase
9's "confirming... the Function URL serves that tenant" tenant-
provisioning check, for every tenant, every sync, not just the first one.

Tested with a mocked `curl` (`verify-tenant.test.sh`, 8 tests covering
pass, each individual check's failure mode, and a simulated connection
failure) and through `sync.sh`'s own control-flow tests (`sync.test.sh`,
extended with 11 new assertions covering: verified success, verification
failure after a successful deploy, and the defensive case where a tenant
has no recorded Function URL). Also re-verified the full `run.sh` chain
end-to-end with one tenant (not just the zero-tenant case from the
original 11e verification) — the sync summary correctly showed
`success (verified)` and the mock call log confirmed `verify-tenant.sh`
fired with the correct URL immediately after the deploy succeeded.

`infra/orchestrator/lib/config-hash.sh` (the shared hashing helper) and
the `--tags DillingerConfigHash=...` addition to `provision-tenant.sh`
are pre-existing shared contracts, written once, before any sub-spec
starts (see "Pre-work" below) — no sub-agent needs to touch them.

## Pre-work (done once, before any sub-spec starts)

- [x] `infra/orchestrator/lib/config-hash.sh`: a `compute_config_hash()`
      bash function, `sha256sum` over a template file's contents plus its
      sorted parameter overrides. Sourced by anything that needs to
      compute or compare a deploy's config fingerprint.
- [x] `infra/provision-tenant.sh`: computes the tenant's config hash and
      passes `--tags "DillingerConfigHash=<hash>" "Project=dillinger-aws"
      "TenantId=<tenant-id>"` to `sam deploy`, so the hash lands as a
      **stack-level tag** (readable via
      `aws cloudformation describe-stacks ... Stacks[0].Tags`, not a
      per-resource tag) — this is what Module C compares against.

## Shared JSON contracts

All files live under `infra/orchestrator/state/` (gitignored — runtime
output, not source) unless noted. All scripts: `#!/usr/bin/env bash`,
`set -euo pipefail`, a usage comment block at the top (matching the style
of `infra/provision-tenant.sh`), print one human-readable summary line to
stdout in addition to writing their JSON file, and use exit codes as
documented per module (0 = "ran successfully," which is not the same as
"everything is in sync" — check the JSON for that).

### `infra/deployment-model.json` (committed, human-edited)

```json
{
  "model": "isolated-single-tenant-per-instance",
  "gateway": {
    "enabled": true,
    "domain": "",
    "acmCertificateArn": ""
  }
}
```

`model` is currently always `"isolated-single-tenant-per-instance"`
(Phase 9's resolved choice) — the field exists so a future model change
doesn't require rewriting the orchestrator, but only that one value is
implemented today. `gateway.domain`/`acmCertificateArn` map directly to
`infra/gateway/template.yaml`'s `GatewayDomain`/`AcmCertificateArn`
parameters (both blank until Phase 10's open domain question is answered).

### `infra/desired-tenants.json` (committed, human-edited)

```json
{
  "tenants": [
    { "tenantId": "acme", "region": "us-east-1" }
  ]
}
```

This is **intent** ("these tenants should exist"), distinct from
`infra/tenants.json` (Phase 9's existing file, which is **actual
last-known state**, auto-written by `provision-tenant.sh` after a
successful deploy). Start this file with an empty `tenants` array —
don't invent example tenants.

### `state/credential-status.json` (Module A output)

```json
{
  "timestamp": "2026-07-10T12:00:00Z",
  "credentialsPresent": true,
  "identity": { "account": "123456789012", "arn": "arn:aws:iam::...", "userId": "..." },
  "region": "us-east-1",
  "permissionsChecked": [
    { "action": "lambda:CreateFunction", "resourceArn": "arn:aws:lambda:us-east-1:123456789012:function:dillinger-*", "allowed": true }
  ],
  "permissionsOk": true,
  "missingPermissions": [],
  "errors": []
}
```

Exit codes: `0` = credentials present and `permissionsOk: true`. `1` =
`credentialsPresent: false`. `2` = credentials present but
`permissionsOk: false` (see `missingPermissions`). The file is still
written in all three cases — callers read the file, not just the exit
code, for details.

### `state/desired-state.json` (Module B output)

```json
{
  "model": "isolated-single-tenant-per-instance",
  "gateway": { "enabled": true, "domain": "", "acmCertificateArn": "" },
  "tenants": [ { "tenantId": "acme", "region": "us-east-1" } ]
}
```

Exit `0` on valid config (including a legitimately empty tenant list).
Non-zero with a clear stderr message on malformed JSON, an unrecognized
`model` value, or a `tenantId` that fails `^[a-z0-9-]+$`.

### `state/deployment-state.json` (Module C output)

```json
{
  "timestamp": "2026-07-10T12:05:00Z",
  "tenants": [
    {
      "tenantId": "acme",
      "region": "us-east-1",
      "status": "NOT_DEPLOYED",
      "functionUrl": null,
      "reason": null
    },
    {
      "tenantId": "beta",
      "region": "us-east-1",
      "status": "DRIFTED",
      "functionUrl": "https://xyz.lambda-url.us-east-1.on.aws/",
      "reason": "stack DillingerConfigHash tag (abc123) does not match current local template hash (def456)"
    }
  ],
  "gateway": {
    "status": "IN_SYNC",
    "distributionDomainName": "d123.cloudfront.net",
    "reason": null
  }
}
```

`status` is one of: `NOT_DEPLOYED`, `IN_SYNC`, `DRIFTED`, `FAILED`
(stack exists but its `StackStatus` contains `FAILED` or `ROLLBACK`).
`gateway` block is present only if `desired-state.json`'s
`gateway.enabled` is `true`. Exit `0` if the check itself completed
(regardless of what it found — "3 tenants need deploying" is a normal
result, not a script error); non-zero only if the check couldn't run at
all (bad input files, AWS API unreachable).

## Testing strategy (mandatory - this is real code, not just spec prose)

Nothing in this phase can be tested against real AWS in this sandbox (no
credentials, and Docker builds are blocked - see Phase 1/3). Every module
must instead be tested with a **mocked `aws` CLI**: a fake `aws`
executable (a bash script switching on `"$1 $2"`) placed early in `PATH`
during test runs, returning canned JSON matching real `aws` CLI output
shapes for the specific subcommands that module calls. Each sub-spec
below lists exactly which `aws` subcommands its module calls, and what
the mock needs to simulate (including the "credentials missing" and
"permission denied" cases, not just the happy path). Do not skip this —
"I wrote the script" is not "I verified the script," per this project's
standing rule of testing real behavior, not just marking boxes done.

## Sub-specs

| File | Module | Status |
|---|---|---|
| [11a-credential-guard.md](11a-credential-guard.md) | A | **Done** — built by a background sub-agent, merged, independently re-verified (6/6 tests) |
| [11b-model-resolver.md](11b-model-resolver.md) | B | **Done** — built by a background sub-agent, merged, independently re-verified (6/6 tests) |
| [11c-state-checker.md](11c-state-checker.md) | C | **Done** — built by a background sub-agent, merged, independently re-verified (13/13 tests) |
| [11d-sync-orchestrator.md](11d-sync-orchestrator.md) | D | **Done** — built by a background sub-agent, merged, independently re-verified (18/18 tests) |
| 11e (integration) | `run.sh` + doc cross-links | **Done** — see below |

## Integration (11e)

`infra/orchestrator/run.sh` chains all four modules
(`credential-guard.sh` → `resolve-model.sh` → `check-state.sh` →
`sync.sh`), stopping early with a specific message if any stage isn't
healthy, otherwise exiting with `sync.sh`'s own exit code. Also checks
`jq` and `aws` are on `PATH` up front, since three of the four modules
depend on `jq` (a project-wide dependency this phase introduced —
confirmed present in this environment, `jq-1.7`).

Verified end-to-end with a comprehensive mock (`aws` + stub
`provision-tenant.sh`/`deploy-gateway.sh`), against the real committed
`infra/deployment-model.json`/`infra/desired-tenants.json` (0 tenants,
gateway enabled) — not a synthetic fixture:

- **Happy path**: all 4 stages ran, correctly detected the gateway as
  `NOT_DEPLOYED`, and `sync.sh` correctly invoked the stub
  `deploy-gateway.sh` → exit `0`.
- **No credentials**: stopped after stage 1 with a clear message → exit
  `1`, stages 2-4 never ran.
- **Credentials present, one permission denied**: stopped after stage 1
  → exit `2`, stages 2-4 never ran.

One real bug was caught by this end-to-end test (not by `bash -n`, which
passed on the buggy version): `run.sh`'s original `REPO_ROOT`
computation used `/..` (one level up), correct for scripts living
directly in `infra/`, but `run.sh` itself lives one level deeper in
`infra/orchestrator/`, so it resolved to a doubled, nonexistent
`infra/infra/orchestrator/` path and every stage failed with "No such
file or directory." Fixed by computing `ORCH_DIR` directly from the
script's own location instead of going through an unnecessary
`REPO_ROOT` indirection. Left as a reminder in this doc that "passes
`bash -n`" only proves syntax validity, never correctness — the
mandatory testing rule above applies to integration code too, not just
the four modules.

**Not yet run against real AWS** — no credentials exist yet (Phase 1).
The moment they do, `infra/orchestrator/run.sh` is the one command to
run; it supersedes manually running `provision-tenant.sh` per tenant
(Phase 4/9) or `deploy-gateway.sh` by hand (Phase 10) for anything
already captured in `infra/desired-tenants.json` /
`infra/deployment-model.json` — those manual scripts still work
standalone (e.g. for a one-off tenant not yet added to desired state),
`run.sh` just makes "keep everything declared in sync" a single safe,
repeatable command.
