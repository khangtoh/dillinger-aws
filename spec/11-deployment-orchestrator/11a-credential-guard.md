# Sub-spec 11a — Credential Guard (Module A)

Read `spec/11-deployment-orchestrator/README.md` first for the overall
architecture and shared JSON contracts — this sub-spec only covers what's
specific to this module.

**You own (create/edit) only these files:**
- `infra/orchestrator/credential-guard.sh`
- `infra/orchestrator/test/mock-aws-no-creds.sh`
- `infra/orchestrator/test/mock-aws-with-creds.sh`
- `infra/orchestrator/test/credential-guard.test.sh`

Do not touch any other file in the repo. If you think another file needs
to change, stop and say so instead of editing it — another sub-agent may
own it.

## What this module does

The single place that answers "do we have AWS access, and is it enough to
do this project's job." Nothing else in the orchestrator re-implements
this check — `check-state.sh` and `sync.sh` (other modules) will read
`infra/orchestrator/state/credential-status.json`, not call AWS
themselves to figure this out.

## Required permission set to check

Mirror this exactly from `spec/01-aws-account-onboarding.md`'s
least-privilege policy — don't invent a different list:

| Action | Resource pattern |
|---|---|
| `lambda:CreateFunction`, `lambda:UpdateFunctionCode`, `lambda:GetFunction`, `lambda:CreateFunctionUrlConfig`, `lambda:InvokeFunction` | `arn:aws:lambda:<region>:<account>:function:dillinger-*` |
| `ecr:CreateRepository`, `ecr:PutImage` | `arn:aws:ecr:<region>:<account>:repository/dillinger*` |
| `ecr:GetAuthorizationToken` | `*` (this action is account-wide in IAM, doesn't accept a scoped resource) |
| `iam:CreateRole`, `iam:PassRole`, `iam:AttachRolePolicy`, `iam:PutRolePolicy`, `iam:GetRole` | `arn:aws:iam::<account>:role/dillinger-*` |
| `logs:CreateLogGroup`, `logs:PutRetentionPolicy` | `arn:aws:logs:<region>:<account>:log-group:/aws/lambda/dillinger*` |
| `cloudformation:CreateStack`, `cloudformation:UpdateStack`, `cloudformation:DescribeStacks` | `arn:aws:cloudformation:<region>:<account>:stack/dillinger-*/*` |
| `cloudfront:CreateFunction`, `cloudfront:CreateDistribution` | `*` (CloudFront is a global service; these actions don't support resource-level scoping in most cases — use `*`) |

`<region>` and `<account>` are filled in from the identity/region
resolved in step 1-2 below, not hardcoded.

## Behavior

1. Run `aws sts get-caller-identity --output json`. If it fails (non-zero
   exit, or any error), write `credential-status.json` with
   `credentialsPresent: false`, `identity: null`, empty
   `permissionsChecked`, `permissionsOk: false`, and the error message in
   `errors`. Exit `1`.
2. On success, parse `Account`, `Arn`, `UserId` from the JSON response
   into `identity`. Resolve `region` from (in order) `AWS_REGION` env var,
   `AWS_DEFAULT_REGION` env var, then `aws configure get region`; if none
   set, leave `region: null` and skip permission checks entirely (record
   an entry in `errors` explaining permission checks were skipped because
   no region is configured) — don't guess a region.
3. For each action/resource pair above, call
   `aws iam simulate-principal-policy --policy-source-arn <identity.arn>
   --action-names <action> --resource-arns <resource>` (batch multiple
   action-names in one call when they share the same resource pattern, to
   cut down on API calls — `simulate-principal-policy` supports an array
   for `--action-names`). Parse each result's `EvalDecision`
   (`"allowed"` maps to `EvalDecision == "allowedForAll" || EvalDecision
   == "allowed"` per the actual API shape — check real `aws` CLI docs
   output format, don't guess the JSON key names blind since this matters
   for correctness).
4. **Handle the case where `simulate-principal-policy` itself is denied**
   (the caller might not have `iam:SimulatePrincipalPolicy`): catch that
   specific failure, add one entry to `errors` explaining permissions
   could not be pre-verified and will only be discovered at actual deploy
   time, and set `permissionsOk: null` (not `false` — this is "unknown,"
   not "confirmed missing") in that case. Document this distinction
   clearly since it changes exit code (see below).
5. Write `infra/orchestrator/state/credential-status.json` per the schema
   in the README, and print one summary line to stdout, e.g.:
   `Credentials OK (account 123456789012, region us-east-1) - all 7 permission checks passed`
   or `Credentials present but missing 2/7 required permissions - see credential-status.json`.
6. Exit codes: `0` = `credentialsPresent: true` and `permissionsOk` is
   `true` or `null` (unknown-but-not-confirmed-missing counts as "proceed
   cautiously," not "blocked" — downstream modules decide what to do with
   `null`). `1` = `credentialsPresent: false`. `2` = `credentialsPresent:
   true` and `permissionsOk: false`.

## Tests (write these, make them pass, don't just assert they "should" work)

Create two mock `aws` scripts under `infra/orchestrator/test/`:

- `mock-aws-no-creds.sh`: intercepts `sts get-caller-identity` and exits
  non-zero with a realistic error message on stderr (mimic
  `Unable to locate credentials...`), like the real CLI does when
  unconfigured.
- `mock-aws-with-creds.sh`: intercepts `sts get-caller-identity` and
  returns a canned successful JSON identity; intercepts
  `iam simulate-principal-policy` and returns `EvalDecision: allowed` for
  every action **except** make one specific action (your choice, document
  which) return `implicitDeny`, so the test can assert the "missing
  permissions" path is detected correctly, not just the all-allowed path.

Write `credential-guard.test.sh`: a small bash test runner (no new
external test framework dependency - plain bash + `python3 -c` or
straightforward string/exit-code assertions is fine, consistent with
this repo's existing plain-bash script style) that:
1. Runs `credential-guard.sh` with `mock-aws-no-creds.sh` first in PATH,
   asserts exit code `1` and `credentialsPresent: false` in the output
   JSON.
2. Runs it again with `mock-aws-with-creds.sh` first in PATH, asserts
   exit code `2` (since your mock includes one denied action),
   `credentialsPresent: true`, and that the specific denied action you
   chose appears in `missingPermissions`.
3. Prints a clear PASS/FAIL summary and exits non-zero if any assertion
   failed (so this is CI-able later, even though nothing runs it in CI
   yet).

Run the test yourself and confirm it actually passes before considering
this done — paste/report the output.

## Definition of done

- [ ] `infra/orchestrator/credential-guard.sh` exists, is executable,
      passes `bash -n` syntax check.
- [ ] Both mock `aws` scripts exist and are executable.
- [ ] `credential-guard.test.sh` exists, is executable, and **passes when
      you run it**.
- [ ] Script and tests follow this repo's existing style (see
      `infra/provision-tenant.sh`, `infra/register-tenant-route.sh` for
      reference: `#!/usr/bin/env bash`, `set -euo pipefail`, usage comment
      block, no unexplained magic).
- [ ] Commit your changes locally (do not push — the coordinating session
      will merge and push) with a clear commit message.
