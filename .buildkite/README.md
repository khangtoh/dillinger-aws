# Buildkite CI and deployment

For the user-facing setup and activation runbook, see [`docs/buildkite.md`](../docs/buildkite.md).

`infra/ci-provider.json` is the single committed selector. Set its
`provider` to `buildkite` in a reviewed commit to activate Buildkite;
`github` is the default. GitHub Actions skips its CI/deploy jobs when
Buildkite is selected, while Buildkite's bootstrap job uploads no active
jobs when GitHub is selected.

## One-time setup

1. Create a Buildkite pipeline from `.buildkite/pipeline.yml` on a
   Buildkite agent with Docker, Node.js 20, Python 3.12/pip, curl, and Git.
   The agent must also support Buildkite OIDC; configure its GitHub
   integration/webhook.
2. Set non-secret pipeline environment variables:

   ```text
   AWS_REGION=ap-southeast-1
   AWS_DEPLOY_ROLE_ARN=arn:aws:iam::<account-id>:role/dillinger-buildkite-deploy
   ```

3. Create an AWS IAM OIDC provider with URL
   `https://agent.buildkite.com` and audience `sts.amazonaws.com`.
4. Render `infra/bootstrap/buildkite-ci-trust-policy.template.json` with
   the AWS account ID plus the Buildkite organization slug/immutable ID and
   pipeline slug. Use it for a `dillinger-buildkite-deploy` role and attach
   the existing `dillinger-deploy-policy` managed policy.
5. Configure the Buildkite checkout credential to push
   `infra/tenants.json` to the source branch when it changes. Use a
   repository-scoped GitHub App installation or deploy key; do not store an
   AWS access key.

The trust template permits only the selected Buildkite organization and
pipeline from `main`. The pipeline supplies organization, pipeline, and
branch STS session tags for CloudTrail.

## Pipeline behavior

The active pipeline runs the same typecheck, unit-test, production-audit,
and SBOM steps as GitHub Actions. Its `main` deployment is a manual block:
it assumes AWS through OIDC, calls `infra/provision-tenant.sh staging`,
smoke-tests the Function URL, uploads deployment metadata, and writes back
the tenant registry.

Keep the selector at `github` while performing the one-time setup. Once
the Buildkite role is verified, change it to `buildkite` and approve one
staging deployment. Revert it to `github` for immediate rollback.
