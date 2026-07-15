# Phase 12 - Security Hardening and Operational Closure

Goal: close the remaining repository, AWS account, deployment, and
operational findings before this project is described as production-secure.

Depends on: Phase 7 (OIDC deployment), Phase 8 (live staging verification),
Phase 10 (CloudFront gateway), and Phase 11 (deployment orchestrator).

Source reviews:

- `security_best_practices_report.md`
- `security_remediation_report.md`
- `aws_credentials_security_report.md`
- `SECURITY.md`

## Working rules

- Complete P0 tasks before onboarding another production tenant.
- Never record secret values, access-key IDs, account IDs, session tokens,
  OAuth tokens, or unredacted credential reports in this repository.
- Record only the date, control result, resource type, and redacted evidence.
- Mark a cloud task complete only after checking live AWS or GitHub state.
- Use a named temporary-credential profile for every human AWS command.
- Require a second person to approve destructive credential deletion.
- Document any accepted risk with an owner, reason, expiry date, and review
  date; "accepted indefinitely" is not a valid disposition.

## P0 - Retire long-lived AWS credentials

- [x] Make account bootstrap create only the policy, OIDC provider, and CI
      role by default.
- [x] Require an explicit non-default profile for the legacy access-key
      escape hatch.
- [x] Verify the live GitHub OIDC role requires audience
      `sts.amazonaws.com` and the `staging` environment subject.
- [ ] Choose the human temporary-access method: IAM Identity Center is the
      default; document a different federated method only if required.
- [ ] Create a least-privilege operator permission set from
      `infra/bootstrap/deploy-policy.template.json`.
- [ ] Assign the operator user/group to the target AWS account and permission
      set.
- [ ] Configure a named local profile with `aws configure sso`; do not use
      `default`.
- [ ] Update `credential-guard.sh` to normalize STS assumed-role ARNs to IAM
      role ARNs before policy simulation.
- [ ] Add mocked tests for credential guard behavior with an assumed-role
      identity.
- [ ] Run `aws sts get-caller-identity` with the named profile and confirm
      the principal is an assumed role, not an IAM user.
- [ ] Run `credential-guard.sh` with the named profile and record pass/fail
      without recording account or principal identifiers.
- [ ] Run the orchestrator check path with the named profile and confirm it
      does not fall back to `[default]`.
- [ ] Use an administrator/audit role to inspect the legacy key's status,
      creation date, and last-used service/date.
- [ ] Review CloudTrail for legacy-user activity over the agreed lookback
      window and identify every remaining caller.
- [ ] Obtain explicit approval for the credential cutover and deletion.
- [ ] Deactivate the legacy access key without deleting it.
- [ ] Exercise one complete expected deployment/reconciliation cycle using
      only temporary credentials.
- [ ] Confirm no failed automation attempted to use the deactivated key.
- [ ] Delete the deactivated access key.
- [ ] Detach the deploy policy from and delete the legacy IAM user.
- [ ] Remove the legacy `[default]` entry from the local credentials file.
- [ ] Confirm AWS credential environment variables are unset in routine and
      interactive shells.
- [ ] Confirm the deploy workflow still assumes its role through OIDC.
- [ ] Update Phase 1 status and the credential review with dated redacted
      closure evidence.

## P0 - Move to a supported application stack

- [x] Select a currently supported Next.js major using the official support
      policy and record the target version. **Decision (2026-07-15):**
      current app version 14.2.35 reached end-of-life 2025-10-26 (no
      security patches). Next.js 16 is Active LTS (full support: features,
      bug fixes, security); Next.js 15 is Maintenance LTS (security-only)
      until 2026-10-21. Target: **Next.js 16** (latest stable at decision
      time: `16.2.10`), with React/React DOM 19 (Next 16's required peer).
      Source: https://nextjs.org/support-policy
- [ ] Create a dedicated framework-upgrade branch.
- [ ] Update Next.js, React, React DOM, ESLint configuration, and compatible
      type packages together.
- [ ] Regenerate the lockfile from the reviewed dependency set.
- [ ] Run the official Next.js codemods required for the selected major.
- [ ] Resolve compile and runtime API changes without weakening CSP, CSRF,
      OAuth-state, validation, or export sanitization controls.
- [ ] Run TypeScript checks on a clean dependency install.
- [ ] Run the complete unit test suite on a clean dependency install.
- [ ] Run a production Next.js build.
- [ ] Run browser tests for editor, preview, CSP, upload, and export behavior.
- [ ] Run OAuth start/callback negative tests for every implemented provider.
- [ ] Build the Lambda container image and scan it before deployment.
- [ ] Deploy the upgrade to staging through the OIDC workflow.
- [ ] Smoke-test the Function URL and CloudFront path after deployment.
- [ ] Record rollback instructions and the last known-good image digest.

## P1 - Harden CI/CD credential exposure

- [ ] Resolve each third-party GitHub Action tag to a verified commit from
      the action's official repository.
- [ ] Pin every action in the security and deploy jobs to a full commit SHA
      and retain the release version in an inline comment.
- [ ] Pin the AWS SAM CLI install to an explicitly reviewed version.
- [ ] Confirm Dependabot continues to propose GitHub Actions updates after
      SHA pinning.
- [ ] Enable the repository/organization policy requiring full-SHA action
      references where available.
- [ ] Verify the GitHub `staging` environment exists using an account with
      repository administration access.
- [ ] Restrict the `staging` environment to the `main` deployment branch.
- [ ] Decide whether staging requires reviewers and record the decision.
- [ ] Require the security job before the deploy job and protected-branch
      merge.
- [ ] Run the workflow once and confirm the AWS role session is short-lived.
- [ ] Confirm no AWS access-key secrets exist at repository, environment, or
      organization scope.
- [ ] Preserve the SBOM and deployment metadata for the agreed retention
      period.

## P1 - Restrict the public AWS origin and control abuse

- [ ] Record the decision that CloudFront is the only intended public entry
      point, or document why direct Function URL access remains necessary.
- [ ] Prototype Lambda Function URL OAC against one staging tenant before
      changing the shared gateway.
- [ ] Replace direct `request.origin` mutation in the prototype with
      `cf.updateRequestOrigin()` and `originAccessControlConfig` type
      `lambda`.
- [ ] Verify a browser GET succeeds through the OAC prototype.
- [ ] Verify a JSON POST with `x-amz-content-sha256` succeeds through the
      OAC prototype.
- [ ] Test multipart image upload through OAC and document how the browser
      supplies the exact payload hash including the multipart boundary.
- [ ] Record an architecture decision for OAC or a reviewed alternative if
      required browser POST/upload behavior cannot satisfy OAC signing.
- [ ] Require security review before accepting any alternative that leaves
      the Function URL publicly invokable.
- [ ] Add a CloudFront Origin Access Control for the Lambda Function URL.
- [ ] Change the Lambda Function URL auth type from `NONE` to `AWS_IAM`.
- [ ] Add resource-policy permissions for only the CloudFront service
      principal and exact distribution source ARN.
- [ ] Update bootstrap/deploy permissions with only the actions required for
      OAC and Function URL policy management.
- [ ] Add infrastructure tests for OAC signing and Function URL auth.
- [ ] Deploy the origin restriction to staging.
- [ ] Confirm direct unsigned Function URL requests fail.
- [ ] Confirm CloudFront editor, API, upload, OAuth, and PDF paths still work.
- [ ] Attach an AWS WAF web ACL to the CloudFront distribution.
- [ ] Add a rate-based WAF rule for expensive API and PDF traffic.
- [ ] Add managed WAF rules only after testing false positives in count mode.
- [ ] Configure an SNS alarm destination and pass `AlarmTopicArn`.
- [ ] Confirm error, throttle, duration, and concurrency alarms notify the
      destination.
- [ ] Create an AWS Budget with a real notification recipient.
- [ ] Test the budget notification path without recording recipient details.

## P1 - Establish AWS account security baselines

- [ ] Confirm the root user has phishing-resistant MFA and no access keys.
- [ ] Confirm AWS account security contacts and alternate contacts are
      current.
- [ ] Generate an IAM credential report using an audit role.
- [ ] Confirm no unexpected IAM users or active long-lived keys exist.
- [ ] Record a recurring credential-report review owner and cadence.
- [ ] Enable IAM Access Analyzer for external access findings.
- [ ] Review and resolve or time-bound every Access Analyzer finding.
- [ ] Confirm a multi-Region CloudTrail trail retains management events in a
      protected log destination beyond default event history.
- [ ] Enable CloudTrail log-file validation when using an S3 trail.
- [ ] Confirm CloudTrail, audit-log, and alarm retention meet the incident
      response requirement.
- [ ] Decide whether GuardDuty and Security Hub are required for this account.
- [ ] Enable the approved detective controls and configure finding delivery.
- [ ] Enable ECR enhanced scanning for repositories matching `dillinger*`.
- [ ] Push a staging image and wait for the initial scan to finish.
- [ ] Triage all critical/high image findings or record time-bound exceptions.
- [ ] Add an EventBridge/notification path for new critical ECR findings.

## P1 - Implement application secret lifecycle

- [ ] Decide which OAuth providers are enabled; mark Phase 5 N/A if none are
      required.
- [ ] Define one Secrets Manager naming convention per tenant and provider.
- [ ] Create provider secrets without passing values on a command line.
- [ ] Put only secret names/ARNs and non-secret client IDs in Lambda
      configuration.
- [ ] Grant each tenant execution role `secretsmanager:GetSecretValue` only
      for its exact secret ARNs.
- [ ] Grant `kms:Decrypt` only if a customer-managed key is used, scoped to
      that key and Secrets Manager.
- [ ] Implement server-only secret retrieval with bounded in-memory or
      extension caching.
- [ ] Add tests proving secret values never reach browser bundles, API error
      bodies, logs, or environment dumps.
- [ ] Define rotation and rollback procedures for every enabled provider.
- [ ] Perform one non-production secret rotation without redeploying code.
- [ ] Move any production API key into the approved secret store.
- [ ] Add API key IDs, scopes, expiry, and overlapping-key rotation if the v1
      API is enabled.

## P2 - Verify isolation and runtime controls

- [ ] Provision a second non-production tenant using the standard workflow.
- [ ] Confirm tenant Function URLs, Lambda functions, execution roles, log
      groups, and gateway routes are distinct.
- [ ] Confirm OAuth cookies from one tenant are not sent to the other tenant.
- [ ] Confirm provider cache entries cannot cross tenant boundaries.
- [ ] Confirm one tenant cannot read or mutate the other's gateway route.
- [ ] Confirm concurrency exhaustion in one tenant does not consume the
      other's reserved concurrency.
- [ ] Confirm logs identify a tenant without containing documents, tokens,
      authorization headers, cookies, or secret values.
- [ ] Execute the isolation procedure in `SECURITY.md` and record redacted
      results.
- [ ] Deprovision the temporary tenant and verify all owned resources are
      removed.

## P2 - Complete security operations

- [ ] Create a credential-exposure runbook covering disable, rotate, audit,
      redeploy, and notification steps.
- [ ] Create an OAuth token/client-secret compromise runbook.
- [ ] Create a tenant containment and deprovisioning runbook.
- [ ] Create a vulnerable-image rollback and redeployment runbook.
- [ ] Define security log, SBOM, image, and CloudTrail evidence retention.
- [ ] Define vulnerability severity SLAs and exception expiry rules.
- [ ] Assign owners for AWS account, application, CI/CD, and incident tasks.
- [ ] Schedule dependency, image, credential, and IAM policy reviews.
- [ ] Add a route-security checklist for every new API handler.
- [ ] Update the threat model for CloudFront OAC, WAF, Secrets Manager, OIDC,
      browser storage, PDF Chromium, and per-tenant isolation.

## Final verification gate

- [ ] Run `git diff --check`, TypeScript, unit, browser, infrastructure, and
      shell tests from a clean checkout.
- [ ] Run production dependency and container vulnerability scans.
- [ ] Verify live security headers through both CloudFront and the origin
      failure path.
- [ ] Verify the OIDC trust, GitHub environment policy, deploy role policy,
      Function URL policy, WAF association, alarms, budget, ECR scanning,
      CloudTrail, and Access Analyzer in live state.
- [ ] Reconcile every finding in all three security reports to Resolved,
      Accepted with expiry, or Not Applicable.
- [ ] Obtain a second-person review of P0/P1 evidence and accepted risks.
- [ ] Update `SECURITY.md` and this phase with the final review date.
- [ ] Declare production security closure only when every P0 and P1 item is
      complete and no accepted High finding remains.

## Authoritative references

- AWS IAM security best practices:
  https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html
- AWS CLI IAM Identity Center profiles:
  https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html
- CloudFront OAC for Lambda Function URLs:
  https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-lambda.html
- CloudFront Functions dynamic origin and OAC configuration:
  https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/helper-functions-origin-modification.html
- Lambda and Secrets Manager:
  https://docs.aws.amazon.com/lambda/latest/dg/with-secrets-manager.html
- Amazon ECR enhanced scanning:
  https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-scanning-enhanced.html
- GitHub Actions secure use:
  https://docs.github.com/en/actions/reference/security/secure-use
- Next.js support policy:
  https://nextjs.org/support-policy

