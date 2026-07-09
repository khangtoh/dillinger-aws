# Phase 7 — CI/CD

Goal: pushes to the deploy branch automatically rebuild and redeploy the
Lambda function, without long-lived AWS keys stored in GitHub.

Depends on: Phase 4 (manual deploy already works once).

- [ ] Create an IAM role trusted for GitHub Actions OIDC
      (`token.actions.githubusercontent.com`), scoped to this repo, with
      permissions limited to ECR push + Lambda update-function-code +
      `sam deploy`'s CloudFormation needs.
- [ ] Add `.github/workflows/deploy-lambda.yml`: on push to the deploy
      branch, assume the OIDC role, `sam build`, `sam deploy` (or
      build+push to ECR and `aws lambda update-function-code` if not using
      SAM for CI).
- [ ] Store the AWS account ID/region/role ARN as GitHub Actions repo
      variables/secrets (not raw access keys).
- [ ] Trigger a test push and confirm the workflow run succeeds end-to-end.
- [ ] Confirm the Function URL serves the newly deployed change after the
      workflow completes (e.g. bump a visible version string and check
      it's live).
