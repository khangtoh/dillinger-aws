# CI/CD: how the deploy pipeline is set up and why

One workflow, `deploy-lambda.yml`, rebuilds and redeploys the fixed
**staging** tenant on demand. For the decision history see
[spec/07-execution-cicd.md](../../spec/07-execution-cicd.md); this file
documents the as-built design.

## Why CI is the build path at all

The development sandbox this project is driven from has **no Docker**,
so the Lambda container image can't be built locally there. GitHub's
runners can build it, which makes this workflow the primary way the
image ever gets built and pushed — not just an automation nicety. A
human with Docker + the deploy credentials can still run
`infra/provision-tenant.sh` directly; CI and humans share that same
script, so there is exactly one deploy code path to keep correct.

## Authentication design: OIDC, no stored keys

```
GitHub Actions job
  │ requests an OIDC token from GitHub
  │ (aud: sts.amazonaws.com, sub: repo:khangtoh/dillinger-aws:<ref>)
  ▼
AWS IAM OIDC provider  token.actions.githubusercontent.com
  │ sts:AssumeRoleWithWebIdentity
  ▼
IAM role  dillinger-ci-deploy
  trust policy target: sub equals
                repo:khangtoh/dillinger-aws:environment:staging
  permissions: the same customer-managed dillinger-deploy-policy
               attached to the human deploy user
```

Three properties this buys:

1. **No long-lived secrets in GitHub.** The only things stored in the
   repo settings are non-secret *variables* (`AWS_REGION`,
   `AWS_DEPLOY_ROLE_ARN`). Credentials are minted per-job and expire
   with it.
2. **Repo-scoped trust.** No other repository (including forks — fork
   PRs never get `id-token: write` here) can assume the role; the trust
   policy's `sub` condition must pin it to
   `repo:khangtoh/dillinger-aws:environment:staging`.
3. **One permission surface.** The role reuses `dillinger-deploy-policy`
   — the exact policy the human deploy user has (least-privilege,
   scoped to `dillinger-*` resources; see
   `spec/01-aws-account-onboarding.md` for its version history). A
   permission fix made for one principal automatically applies to the
   other, and CI can never do anything a human deploy couldn't.

## What the workflow does

1. **Security gate** — lockfile install, TypeScript, unit tests, production
   dependency audit, and a CycloneDX SBOM artifact.
2. **Checkout + OIDC auth + install SAM CLI** (Python 3.12, pip). The deploy
   job only runs from `main` and uses the `staging` GitHub Environment.
3. **`infra/provision-tenant.sh staging <region>`** — the same script
   used for any tenant: `sam build` (Docker build of the Next.js
   standalone image + Lambda Web Adapter), `sam deploy` with
   `--resolve-image-repos --resolve-s3` (SAM manages the ECR repo and
   artifact bucket), then a second deploy pass that sets
   `NEXT_PUBLIC_BASE_URL` to the Function URL the first pass created
   (OAuth callbacks need the real URL, which isn't known until after
   the first deploy).
4. **Smoke test** — curls the staging Function URL from
   `infra/tenants.json` and fails the run on any non-2xx/3xx status, so
   a deploy that technically succeeded but serves errors still fails CI.
5. **Commit `infra/tenants.json` back** if the registry changed.

## Trigger policy: manual only (deliberate)

`workflow_dispatch` only — every run costs real AWS mutations, and
nobody has decided that pushes should do that automatically. Run it
with:

```bash
gh workflow run deploy-lambda.yml
gh run watch          # or: gh run list --workflow=deploy-lambda.yml
```

To make it automatic later: either switch `on:` to
`push: branches: [main]`, or keep it push-triggered but add
`environment: production` to the job and configure that GitHub
Environment with required reviewers for an approval gate.

## Scope boundary: CI only touches staging

CI redeploys the one fixed `staging` tenant to prove the pipeline
works. It never provisions new user tenants — that stays an explicit
human action (`infra/provision-tenant.sh <tenant>` or declaring the
tenant in `infra/desired-tenants.json` and running
`infra/orchestrator/run.sh`; see `spec/09-multi-tenancy.md` and
`spec/11-deployment-orchestrator/`).

## Recreating this in another account

The OIDC provider, role, trust policy, and permission policy are all
created by `infra/bootstrap/bootstrap-account.sh` from committed
templates — see `infra/bootstrap/README.md`. The two repo variables are
the only GitHub-side wiring.

## Setup log

- 2026-07-10: OIDC provider + `dillinger-ci-deploy` role created; repo
  variables set; first run built the image successfully (first-ever
  build of the container) but failed at `sam deploy` for lack of
  `--resolve-s3` — fixed in `provision-tenant.sh` and re-run.
