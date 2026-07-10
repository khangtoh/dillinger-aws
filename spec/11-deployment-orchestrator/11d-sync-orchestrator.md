# Sub-spec 11d — Sync Orchestrator (Module D)

Read `spec/11-deployment-orchestrator/README.md` first for the overall
architecture and shared JSON contracts — this sub-spec only covers what's
specific to this module.

**You own (create/edit) only these files:**
- `infra/orchestrator/sync.sh`
- `infra/gateway/deploy-gateway.sh` (new — doesn't exist yet; the gateway
  has a template but no deploy script so far)
- `infra/orchestrator/test/sync.test.sh`

Do not touch any other file in the repo, including
`infra/provision-tenant.sh` (already updated as project pre-work to tag
deploys with a config hash — read it for reference/style, don't edit it)
and `infra/gateway/template.yaml` (read it, don't edit it). If you think
another file needs to change, stop and say so instead of editing it.

## What this module does

The only module that actually changes AWS infrastructure. Given Module
C's "what's out of sync" report, it deploys/redeploys exactly what's
needed — nothing decides *whether* to deploy here, that already happened
in `check-state.sh`; this module just executes.

**This cannot be tested against real AWS in this sandbox** (no
credentials, and Docker builds are blocked — see Phase 1/3 for why). Test
control flow only, using stub `provision-tenant.sh`/`deploy-gateway.sh`
invocations swapped in via `PATH`, per the Tests section below. Do not
attempt to run this against real AWS.

## Part 1: `infra/gateway/deploy-gateway.sh` (new script)

The gateway (`infra/gateway/template.yaml`) has never had a deploy
script — Phase 10 only documented manual `sam deploy` commands. Write one
now, mirroring `infra/provision-tenant.sh`'s structure and style
(`#!/usr/bin/env bash`, `set -euo pipefail`, usage comment block, same
`compute_config_hash` sourcing pattern):

```
Usage: infra/gateway/deploy-gateway.sh [aws-region]
```

Behavior:
1. Region defaults the same way `provision-tenant.sh` does
   (`${1:-${AWS_DEFAULT_REGION:-us-east-1}}`).
2. Read `gateway.domain` and `gateway.acmCertificateArn` from
   `infra/orchestrator/state/desired-state.json` (Module B's output —
   code against the schema in the README; that file should exist by the
   time this actually runs for real, since `sync.sh` only calls this
   after Module C has already run, which itself requires Module B to
   have run first).
3. Compute the config hash: `compute_config_hash
   infra/gateway/template.yaml "GatewayDomain=<domain>"
   "AcmCertificateArn=<arn>"` (source
   `infra/orchestrator/lib/config-hash.sh`, same as
   `provision-tenant.sh` does — don't reimplement hashing).
4. `sam build --template-file template.yaml` from `infra/gateway/`.
5. `sam deploy --stack-name dillinger-gateway --region <region>
   --capabilities CAPABILITY_IAM --parameter-overrides
   "GatewayDomain=<domain>" "AcmCertificateArn=<arn>" --tags
   "DillingerConfigHash=<hash>" "Project=dillinger-aws"
   --no-confirm-changeset --no-fail-on-empty-changeset`. If `domain` is
   empty, omit it from `--parameter-overrides` entirely rather than
   passing an empty string (let the template's own `Default: ""` apply —
   passing `GatewayDomain=` explicitly is different from not passing it
   at all in some SAM CLI versions, be deliberate about this).
6. Print the resulting `DistributionDomainName` output (via
   `aws cloudformation describe-stacks`, same pattern as
   `provision-tenant.sh` fetching `FunctionUrl`) and a success message.

## Part 2: `infra/orchestrator/sync.sh`

1. Re-read `infra/orchestrator/state/credential-status.json` as a
   defense-in-depth check (Module C already gated on this, but this
   script performs real side effects, so check again rather than trust a
   possibly-stale caller): if `credentialsPresent` is not `true` or
   `permissionsOk` is `false`, refuse to proceed, exit non-zero, no
   deploys attempted.
2. Read `infra/orchestrator/state/deployment-state.json` (Module C's
   output — code against the README's schema).
3. For each tenant with `status` `NOT_DEPLOYED` or `DRIFTED`: call
   `infra/provision-tenant.sh <tenantId> <region>` (the existing,
   already-working script — do not duplicate its deploy logic here, just
   invoke it). For `status` `IN_SYNC`: skip, no action. For `status`
   `FAILED`: **do not auto-retry** — a failed stack usually needs human
   investigation (bad template change, quota limit, etc.), and blindly
   re-running `sam deploy` against a `ROLLBACK_FAILED` stack can make
   things worse. Just report it prominently in the summary.
4. If the `gateway` key is present in `deployment-state.json` and its
   `status` is `NOT_DEPLOYED` or `DRIFTED`: call
   `infra/gateway/deploy-gateway.sh <region>` (use any tenant's region as
   the gateway's region, or a sensible default if there are no tenants
   yet — document your choice). Same `FAILED` → report-don't-retry rule.
5. After each individual deploy call, catch failures per-tenant (don't
   let one tenant's deploy failure abort the whole run) — record
   success/failure per tenant in the summary.
6. Print a clear summary table at the end: tenant ID, status before sync,
   action taken (`deployed` / `redeployed` / `skipped (in sync)` /
   `skipped (failed, needs manual attention)`), and outcome
   (`success`/`failed`) for anything actually attempted.
7. Exit `0` only if every attempted deploy succeeded and there were no
   pre-existing `FAILED` tenants being skipped. Non-zero if any deploy
   attempt failed, or if any tenant was skipped due to `FAILED` status
   (surfacing that "something needs human attention" via exit code, not
   just log text).

## Tests

Since this cannot hit real AWS, test **control flow only**:

Write stub replacements for `provision-tenant.sh` and
`deploy-gateway.sh` used only inside the test (do not modify the real
scripts) — e.g. copy them into a scratch `PATH` directory as scripts that
just log their arguments to a file and touch a marker file
`deployed-<tenantId>` or `deployed-gateway`, simulating success; add a
second variant that exits non-zero, simulating a failed deploy.

Write `sync.test.sh` that:
1. Writes a fixture `deployment-state.json` with one `NOT_DEPLOYED`
   tenant, one `IN_SYNC` tenant, one `DRIFTED` tenant, one `FAILED`
   tenant, and a `DRIFTED` gateway. Writes a fixture
   `credential-status.json` showing healthy credentials.
2. Runs `sync.sh` with the success-stub scripts in `PATH`. Asserts: the
   `NOT_DEPLOYED` and `DRIFTED` tenants' marker files exist (deploy was
   attempted), the `IN_SYNC` tenant's marker does **not** exist (correctly
   skipped), the `FAILED` tenant's marker does **not** exist (correctly
   not auto-retried), and the gateway marker exists. Asserts non-zero
   exit (because a `FAILED` tenant was present).
3. Separately, re-run with a `deployment-state.json` containing only
   `IN_SYNC` entries (no gateway) — asserts exit `0` and that neither
   stub script was invoked at all (nothing to do).
4. Separately, asserts the credential-status gate: a fixture
   `credential-status.json` with `credentialsPresent: false` → `sync.sh`
   exits non-zero and neither stub script is invoked (check via the log
   file being empty), proving the defense-in-depth check actually works.

Print a clear PASS/FAIL summary; exit non-zero if any assertion failed.
Run it yourself and confirm it actually passes before considering this
done — report the output.

## Definition of done

- [x] `infra/gateway/deploy-gateway.sh` exists, is executable, passes
      `bash -n`, follows the existing script style. Correctly mirrors
      `provision-tenant.sh`'s config-hash tagging and the "omit empty
      parameter overrides entirely" rule from this sub-spec.
- [x] `infra/orchestrator/sync.sh` exists, is executable, passes
      `bash -n`.
- [x] `sync.test.sh` exists, is executable, and **passes when you run
      it**. Built by a background sub-agent, merged into
      `claude/dillinger-aws-lambda-jsfoye`, and re-run independently
      after merge (18/18 assertions passed) rather than trusting the
      agent's own report.
- [x] Committed and merged (commit `6f1dfbf`, merged in `e4aee8f`,
      pushed).
