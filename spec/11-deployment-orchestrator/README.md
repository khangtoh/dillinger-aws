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
        calls: ../provision-tenant.sh, ../gateway/deploy-gateway.sh
        "make actual state match desired state"
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

| File | Module | Can start immediately? |
|---|---|---|
| [11a-credential-guard.md](11a-credential-guard.md) | A | Yes |
| [11b-model-resolver.md](11b-model-resolver.md) | B | Yes |
| [11c-state-checker.md](11c-state-checker.md) | C | Yes (codes against A/B's JSON schemas above, doesn't need their actual scripts to exist) |
| [11d-sync-orchestrator.md](11d-sync-orchestrator.md) | D | Yes (codes against C's JSON schema above) |
| 11e (integration) | run.sh + doc cross-links | After A-D land (done directly, not as a separate sub-agent) |
