# Switching AWS accounts (or standing up a new one)

Everything account-specific in this project lives in the AWS account
itself (IAM + deployed stacks), two GitHub repo variables, and two
committed registry files
(`infra/tenants.json`, `infra/desired-tenants.json`). Nothing else in
the repo cares which account it's pointed at — scripts resolve
account/region at runtime, and CI reads its role ARN from a variable.

The committed templates here are the **source of truth** for the IAM
setup. `deploy-policy.template.json` encodes six rounds of
AccessDenied-driven least-privilege refinement (history in
`spec/01-aws-account-onboarding.md`) — recreating it by hand in a new
account would mean rediscovering all of that.

> **Optional Buildkite CI:** the account can also trust a separate Buildkite OIDC role. The provider setup and activation runbook is in [`.buildkite/README.md`](../../.buildkite/README.md); its IAM trust template is `buildkite-ci-trust-policy.template.json`.


## Stand up a new account

```bash
# 0. Get temporary admin credentials for the TARGET account into a named
#    profile. Prefer IAM Identity Center or another federated login.
aws sso login --profile new-account-admin

# 1. Create/sync the IAM setup (idempotent - safe to re-run any time):
infra/bootstrap/bootstrap-account.sh ap-southeast-1 \
  --profile new-account-admin \
  --repo khangtoh/dillinger-aws

# 2. Point CI at the new account (values are printed by step 1):
gh variable set AWS_REGION --body "ap-southeast-1"
gh variable set AWS_DEPLOY_ROLE_ARN --body "arn:aws:iam::<new-account>:role/dillinger-ci-deploy"

# 3. Reset the per-account registry/state (they describe exactly ONE
#    account at a time - the active one):
echo '{"tenants": []}' > infra/tenants.json
rm -f infra/orchestrator/state/*.json
#    ...and adjust the region in infra/desired-tenants.json if changing.

# 4. Verify the OIDC deployment path:
gh workflow run deploy-lambda.yml

# 5. Record the new account/region in the gitignored spec/.aws-context.md.
```

Notes:
- The old account **keeps serving throughout** — nothing above touches
  it. Cut over consumers (bookmarked Function URLs, DNS once the custom
  domain exists) at your own pace.
- `bootstrap-account.sh` is also the **drift-sync** tool for the current
  account: edit a template, re-run it, and it publishes a new policy
  version / updates the role trust only where documents differ. Re-runs
  on an up-to-date account are complete no-ops.
- Tenant deploys require Docker, which the dev sandbox lacks — the CI
  workflow is the build path (`.github/workflows/README.md`).

## Human and local access

Use an IAM Identity Center or other federated named profile with a
permission set based on `deploy-policy.template.json`. Sessions must be
temporary and separate from the bootstrap administrator profile:

```bash
aws sso login --profile dillinger-operator
AWS_PROFILE=dillinger-operator infra/orchestrator/credential-guard.sh
AWS_PROFILE=dillinger-operator infra/orchestrator/run.sh
```

Do not store an AWS access key in the `default` profile. For a workload
that genuinely cannot use federation, `--create-access-key
dillinger-legacy-deploy` remains an explicit legacy escape hatch. Record
an owner and expiry, review access-key last-used data, and remove it as
soon as the workload can assume a role.

## Tear down the old account

```bash
infra/bootstrap/teardown-account.sh ap-southeast-1 --profile old-account-admin
```

Prints a full inventory (tenant stacks, gateway, SAM companion stack +
artifact bucket, ECR repos, log groups, IAM entities) and requires you
to type `delete` before touching anything. Deletion runs in dependency
order and purges the versioned SAM bucket first (CloudFormation can't
delete non-empty buckets). Flags:

- `--keep-iam` — delete only the deployed workloads; keep the IAM
  user/role/policy/OIDC provider so the account can be redeployed later
  without re-bootstrapping.
- `--yes` — skip the confirmation prompt (scripted migrations).

The OIDC provider is only deleted if **no other role** in the account
still trusts it — it may be shared with unrelated projects.

## Files here

| File | Purpose |
|---|---|
| `deploy-policy.template.json` | The least-privilege deploy policy, `__ACCOUNT__`/`__REGION__` placeholders. Attached to the CI role and, only when requested, the legacy deploy user. |
| `ci-trust-policy.template.json` | CI role trust: GitHub OIDC, pinned to this repo's `staging` environment (`__ACCOUNT__`/`__REPO__` placeholders). |
| `bootstrap-account.sh` | Idempotent create/drift-sync of policy, OIDC provider, and CI role. Creates a legacy IAM user only when explicitly requested. |
| `teardown-account.sh` | Inventoried, confirmed, ordered destroy of everything the project put in an account. |
| `test/` | Mocked-`aws` test suites for both scripts (`bootstrap.test.sh`, `teardown.test.sh`) — run them after any change here. |
