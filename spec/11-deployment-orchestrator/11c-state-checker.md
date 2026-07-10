# Sub-spec 11c — Deployment State Checker (Module C)

Read `spec/11-deployment-orchestrator/README.md` first for the overall
architecture and shared JSON contracts — this sub-spec only covers what's
specific to this module.

**You own (create/edit) only these files:**
- `infra/orchestrator/check-state.sh`
- `infra/orchestrator/test/check-state.test.sh`
- `infra/orchestrator/test/mock-aws-check-state.sh`

Do not touch any other file in the repo. If you think another file needs
to change, stop and say so instead of editing it — another sub-agent may
own it.

## What this module does

Compares **desired state** (Module B's output) against **actual AWS
state** and produces a per-tenant + gateway status, without making any
changes itself (deciding vs. acting are separate modules — see README).

Module A (`credential-guard.sh`) and Module B (`resolve-model.sh`) may or
may not exist yet as actual scripts when you do this work — code against
their **documented JSON output schemas** in the README, not their
scripts. Read the schemas for `state/credential-status.json` and
`state/desired-state.json` there.

## Config hash — how drift is detected

Source `infra/orchestrator/lib/config-hash.sh` (already exists — written
as shared pre-work, don't recreate it) and use its `compute_config_hash`
function. For each tenant, the "current local hash" is:
```
compute_config_hash "<repo-root>/infra/template.yaml" "TenantId=<tenant-id>"
```
(Exactly two arguments to the template hash: the template file, and the
single `TenantId=<id>` override — `provision-tenant.sh` was updated as
project pre-work to tag every deploy with this same hash formula under
the stack tag key `DillingerConfigHash`, so this must match exactly or
every real deploy will show up as falsely drifted.)

For the gateway, the equivalent is:
```
compute_config_hash "<repo-root>/infra/gateway/template.yaml" "GatewayDomain=<domain>" "AcmCertificateArn=<arn>"
```
using the `gateway.domain`/`gateway.acmCertificateArn` values from
`desired-state.json`. Note: as of this sub-spec, nothing deploys the
gateway with this exact tagging convention yet (Module D is building
`deploy-gateway.sh`, in parallel with you) — that's fine, your job is
just to compute the hash and compare it against whatever tag is actually
present (or report `NOT_DEPLOYED`/no tag found, which is a normal,
correct result until Module D's script exists and has been run for real).

## Behavior

1. Read `infra/orchestrator/state/credential-status.json`. If missing, or
   `credentialsPresent` is `false`, or `permissionsOk` is `false`: print a
   clear stderr message ("run credential-guard.sh first" /
   "credentials present but missing required permissions, see
   credential-status.json") and exit non-zero **without calling any AWS
   API**. (`permissionsOk: null`, i.e. "unknown," is allowed to proceed —
   only a confirmed `false` blocks this module.)
2. Read `infra/orchestrator/state/desired-state.json`. If missing, print
   "run resolve-model.sh first" and exit non-zero.
3. For each tenant in `desired-state.json.tenants`:
   - Run `aws cloudformation describe-stacks --stack-name dillinger-<tenantId> --region <tenant's region>`.
   - If the call fails with a "does not exist" style error (check the
     real AWS CLI's actual error text/exit behavior for a missing stack —
     it's a `ClientError` with `"does not exist"` in the message, not
     just a generic non-zero exit that could mean something else) →
     `status: "NOT_DEPLOYED"`, `functionUrl: null`, `reason: null`.
   - If it succeeds: read `Stacks[0].StackStatus` and
     `Stacks[0].Tags`. If `StackStatus` contains `"FAILED"` or
     `"ROLLBACK"` → `status: "FAILED"`, `reason` = the actual
     `StackStatus` value. Otherwise, find the `DillingerConfigHash` tag;
     compare it to the freshly computed local hash. Match →
     `status: "IN_SYNC"`. Mismatch (or tag entirely missing, e.g. a
     pre-Phase-11 stack deployed before tagging existed) →
     `status: "DRIFTED"`, `reason` explaining what didn't match (include
     both hash values truncated to ~8 chars each for readability, not the
     full 64-char hash). For `IN_SYNC`/`DRIFTED`, also read
     `Stacks[0].Outputs` for the `FunctionUrl` output value.
   - Any other AWS error (throttling, permissions surprise, etc.) →
     `status: "FAILED"`, `reason` = the error message. Don't let one
     tenant's API error abort the whole run — catch it, record it, move
     to the next tenant.
4. If `desired-state.json.gateway.enabled` is `true`: do the same check
   against stack name `dillinger-gateway`, using the gateway hash formula
   above, and the gateway's own Output (`DistributionDomainName`, per
   `infra/gateway/template.yaml`'s existing Outputs block — check that
   file for the exact output key name rather than assuming). If
   `gateway.enabled` is `false`, omit the `gateway` key from the output
   JSON entirely (not `null` — actually absent).
5. Write `infra/orchestrator/state/deployment-state.json` per the
   README's schema, and print a one-line-per-tenant human summary, e.g.:
   ```
   acme: NOT_DEPLOYED
   beta: DRIFTED (config hash mismatch)
   gateway: IN_SYNC
   ```
6. Exit `0` if the check ran to completion (regardless of what it found —
   drift and missing deployments are normal results, not script
   failures). Non-zero only for the "couldn't even start" cases in steps
   1-2, or if every single tenant check hit an unexpected error (vs. a
   normal not-deployed/in-sync/drifted result).

## Tests

Write `mock-aws-check-state.sh`, a fake `aws` that intercepts
`cloudformation describe-stacks` and, based on `--stack-name`, returns
different canned responses so your test can cover all four statuses:
- `dillinger-notdeployed` → simulate the "stack does not exist" error.
- `dillinger-insync` → return a stack with `StackStatus:
  UPDATE_COMPLETE` and a `DillingerConfigHash` tag that you'll make match
  what `compute_config_hash` actually produces for that tenant (compute
  it once by hand/by running the function, hardcode the result into the
  mock — document how you got that value in a comment so it's
  reproducible if the template ever changes).
- `dillinger-drifted` → same shape but a deliberately wrong
  `DillingerConfigHash` tag value.
- `dillinger-failed` → `StackStatus: UPDATE_ROLLBACK_FAILED`.

Write `check-state.test.sh` that:
1. Writes fixture `credential-status.json` (credentialsPresent: true,
   permissionsOk: true) and `desired-state.json` (tenants: the four
   above, one per status case) into a scratch state directory.
2. Runs `check-state.sh` with the mock `aws` first in `PATH`, asserts
   exit `0`, and asserts each tenant in the resulting
   `deployment-state.json` has exactly the expected status.
3. Separately, asserts that running `check-state.sh` with a fixture
   `credential-status.json` showing `credentialsPresent: false` exits
   non-zero **and does not invoke the mock `aws` at all** (you can check
   this by having the mock append to a log file and asserting the log is
   empty/unchanged after this case — proves the early-exit guard actually
   works, not just that it returns the right code by coincidence).

Print a clear PASS/FAIL summary; exit non-zero if any assertion failed.
Run it yourself and confirm it actually passes before considering this
done — report the output.

## Definition of done

- [x] `infra/orchestrator/check-state.sh` exists, is executable, passes
      `bash -n`.
- [x] Mock `aws` script and `check-state.test.sh` exist, are executable,
      and the test **passes when you run it**. Built by a background
      sub-agent, merged into `claude/dillinger-aws-lambda-jsfoye`, and
      re-run independently after merge (13/13 passed) rather than
      trusting the agent's own report. Correctly read
      `infra/gateway/template.yaml`'s actual `Outputs:` key
      (`DistributionDomainName`) instead of assuming it, per this
      sub-spec's instruction.
- [x] Committed and merged (commit `247ade1`, merged in `77ed8c3`,
      pushed).
