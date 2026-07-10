# Phase 7 — CI/CD

Goal: CI can rebuild and redeploy a "staging" tenant on demand, without
long-lived AWS keys stored in GitHub.

Depends on: Phase 4 (manual deploy already works once).

- [x] Add `.github/workflows/deploy-lambda.yml`: assumes an OIDC role
      (`aws-actions/configure-aws-credentials`), installs the SAM CLI, and
      runs `infra/provision-tenant.sh staging` against a fixed "staging"
      tenant (CI never auto-provisions *new*, real user tenants — that
      stays a manual `provision-tenant.sh` run, see `spec/09`). Includes a
      smoke test step and commits the updated `infra/tenants.json` back.
- [x] **Trigger policy decision:** defaulted to `workflow_dispatch`
      (manual-only) rather than `push`-triggered, since this job runs real
      `sam deploy` calls against real AWS infra and that shouldn't fire
      automatically without an explicit decision from the user. To switch
      to automatic deploys on push to `main`, change the `on:` block to
      `push: branches: [main]`; to keep it automatic but gated, add an
      `environment: production` key to the `deploy` job pointing at a
      GitHub Environment configured with required reviewers.
- [ ] Create an IAM role trusted for GitHub Actions OIDC
      (`token.actions.githubusercontent.com`), scoped to this repo, with
      permissions limited to ECR push + Lambda update-function-code +
      `sam deploy`'s CloudFormation needs (same shape as the Phase 1
      least-privilege policy, but with the trust policy scoped to the
      GitHub OIDC provider instead of an IAM user).
- [ ] Store the AWS account ID/region/role ARN as GitHub Actions repo
      variables (`AWS_REGION`, `AWS_DEPLOY_ROLE_ARN`) — not raw access
      keys.
- [ ] Manually run the workflow (`workflow_dispatch`) once and confirm it
      succeeds end-to-end.
- [ ] Confirm the staging Function URL serves the deployed change after
      the workflow completes.
