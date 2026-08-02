# Deploy with Buildkite

This project can use either GitHub Actions or Buildkite for CI and staging
deployments. The active provider is the committed value in
[`infra/ci-provider.json`](../infra/ci-provider.json):

```json
{ "provider": "github" }
```

Change the value to `buildkite` in a reviewed commit to move CI and the
staging deploy path to Buildkite. Switching it back to `github` is the
rollback procedure. Only one provider is active at a time.

## Before you start

You need:

- A Buildkite organization and a Buildkite agent with Docker, Node.js 20,
  Python 3.12/pip, Git, curl, and Buildkite OIDC support.
- A Buildkite GitHub integration for `khangtoh/dillinger-aws`, with
  permission to push the updated tenant registry back to the branch.
- AWS administrator access to the deployment account. The deployment role
  itself is deliberately not allowed to create IAM providers or roles.
- The Buildkite organization slug, immutable organization ID, and pipeline
  slug. Buildkite exposes these in pipeline/job metadata and its API.

Do not create or store an AWS access key in Buildkite. The deployment uses
short-lived AWS credentials minted through OIDC.

## Configure Buildkite

1. Create a pipeline for this repository with the bootstrap definition:

   ```text
   .buildkite/pipeline.yml
   ```

2. Configure these non-secret pipeline environment variables, substituting
   the target account:

   ```text
   AWS_REGION=ap-southeast-1
   AWS_DEPLOY_ROLE_ARN=arn:aws:iam::<account-id>:role/dillinger-buildkite-deploy
   ```

3. Ensure the agent checkout credential has repository contents-write
   permission. A narrowly scoped GitHub App installation or deploy key is
   appropriate. This is required because a successful deployment records
   the resulting Function URL in `infra/tenants.json`.

## Configure AWS OIDC

1. In the target AWS account, create an IAM OIDC provider:

   - Provider URL: `https://agent.buildkite.com`
   - Audience: `sts.amazonaws.com`

2. Copy
   [`infra/bootstrap/buildkite-ci-trust-policy.template.json`](../infra/bootstrap/buildkite-ci-trust-policy.template.json)
   and replace every placeholder with the AWS account ID and Buildkite
   organization/pipeline identifiers.

3. Create an IAM role named `dillinger-buildkite-deploy` using that rendered
   trust policy. Attach the existing `dillinger-deploy-policy` managed
   policy.

The trust policy restricts role assumption to the chosen organization,
pipeline, and `main` branch. The Buildkite pipeline sends those values as
AWS session tags, making the deployment traceable in CloudTrail. For the
current provider and trust-policy requirements, see Buildkite’s
[OIDC with AWS guide](https://buildkite.com/docs/pipelines/security/oidc/aws).

## Activate and verify

1. Leave the selector set to `github` and trigger a Buildkite build. It
   should report that it did not upload active jobs; this confirms the
   inactive path is safe.
2. Commit and push this change:

   ```json
   { "provider": "buildkite" }
   ```

3. The active Buildkite pipeline runs dependency installation, type checks,
   unit tests, a production dependency audit, and SBOM generation.
4. On `main`, approve the manual **Deploy staging** block. It assumes the
   OIDC role, deploys the `staging` tenant, smoke-tests its Function URL,
   uploads deployment metadata, and updates the tenant registry.
5. Confirm the job artifact reports a successful smoke test and verify the
   Function URL independently.

## Scope and rollback

Buildkite currently covers the standard checks and the manually approved
`main` → `staging` deployment. GitHub-only branch-tenant and lifecycle
workflows stay disabled while Buildkite is selected; switch the selector
back to `github` before using those workflows.

To roll back from Buildkite, commit:

```json
{ "provider": "github" }
```

Keep the GitHub OIDC role and repository variables until Buildkite has
successfully deployed and the team has agreed to retire the fallback.
