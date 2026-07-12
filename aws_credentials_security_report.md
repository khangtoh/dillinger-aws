# AWS Credential Security Review

Date: 2026-07-12

Scope: AWS credential creation and storage, local AWS CLI use, GitHub
Actions federation, Lambda application secrets, repository history, and
credential retirement. Credential values were never read, printed, or
written during this review.

## Executive summary

GitHub Actions correctly uses temporary AWS credentials via OIDC. The
committed and live role trust are restricted to the repository's `staging`
environment and the STS audience. No AWS access-key-shaped value or
private-key marker was found in Git history. Local AWS files were previously
confirmed owner-only (`~/.aws` mode 700; config and credentials mode 600).

One high-priority issue remains: the local default profile still resolves to
the long-lived `dillinger-aws-deploy` IAM user. A read-only STS call on
2026-07-12 proved that credential remains valid even though CI OIDC is live.
The key was not revoked because the local orchestrator still depends on it
and revocation requires an explicit operational cutover.

## Findings

### AWS-CRED-001: Active long-lived deploy key remains after OIDC migration

Severity: High

Evidence:

- `spec/01-aws-account-onboarding.md` says the key can be deleted once
  Phase 7 OIDC is live and records it in the local default profile.
- A read-only `sts:GetCallerIdentity` call resolved to the
  `dillinger-aws-deploy` IAM user, proving the credential is still active.

Impact: theft of the workspace or credentials file provides non-expiring
deployment access until the key is manually revoked. The policy is scoped,
but it can still mutate Dillinger deployment resources.

Required remediation:

1. Provision a federated named profile for operators using IAM Identity
   Center or another IdP and the least-privilege deploy policy.
2. Exercise all local deployment paths with
   `AWS_PROFILE=<federated-profile>`.
3. From an administrator session, inspect key last-used metadata and
   CloudTrail for the legacy user.
4. Deactivate the key, observe one expected execution window, then delete
   the key and IAM user.
5. Remove the legacy local profile; do not put a replacement in `[default]`.

AWS recommends temporary credentials and removal of unused credentials:

https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html

### AWS-CRED-002: Bootstrap guidance created static keys by default

Severity: High

Evidence before remediation:

- `infra/bootstrap/README.md` recommended `--create-access-key` and wrote
  it to `[default]`.
- `infra/bootstrap/bootstrap-account.sh` created the deploy IAM user on
  every bootstrap and could mint and persist its key.

Remediation applied:

- New bootstraps create only the policy, GitHub OIDC provider, and CI role.
- IAM user/key creation is now an explicit legacy escape hatch.
- The escape hatch requires a non-default named profile and emits a warning.
- Documentation directs operators to temporary federated sessions.
- Mocked tests cover the secure default and legacy guardrails.

Residual risk: the escape hatch still creates a non-expiring credential.
Such use needs a named owner, expiry, last-used review, and removal plan.

### AWS-CRED-003: OAuth secret plan used Lambda environment values

Severity: Medium

`spec/05-execution-oauth-secrets.md` previously made Lambda environment
variables the default for OAuth client secrets. Plaintext values passed
through deployment commands, CloudFormation parameters, or Lambda
configuration have a wider disclosure surface. Any `NEXT_PUBLIC_*` value
is browser-visible and must never contain secret material.

Remediation applied: Phase 5 now requires Secrets Manager, exact-ARN
`GetSecretValue` permission, server-side cached retrieval, rotation-aware
TTLs, and no secret values in templates, commands, GitHub variables, logs,
or public environment variables. Runtime implementation remains pending
until an OAuth provider is enabled.

https://docs.aws.amazon.com/lambda/latest/dg/with-secrets-manager.html

### AWS-CRED-004: Credential inventory requires a separate audit role

Severity: Low

The deploy user correctly lacks `iam:ListAccessKeys`; a read-only attempt
was denied. Credential review must be an administrator/security operation,
not part of deployment. Use a scheduled audit role to generate the IAM
credential report and review key age, status, and last-used data. Do not add
account-wide audit permissions to the deploy policy for convenience.

https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_getting-report.html

### AWS-CRED-005: Actions with AWS credential access use mutable tags

Severity: Medium

`.github/workflows/deploy-lambda.yml` references actions with major-version
tags such as `aws-actions/configure-aws-credentials@v4`. The credentials
action obtains the OIDC token, and later actions run while temporary AWS
credentials are exported. A compromised or moved tag could therefore expose
the deployment session.

Required remediation: pin every action in the deploy job to a verified
full-length commit SHA, retain a version comment, and let the configured
Dependabot GitHub Actions ecosystem propose updates. GitHub documents a full
commit SHA as the only immutable action reference:

https://docs.github.com/en/actions/reference/security/secure-use

### AWS-CRED-006: Staging environment protections need verification

Severity: Low

The workflow and IAM trust both name the `staging` environment, but its
branch restrictions and reviewer protections are not represented in this
repository. A read-only API check returned 404, so the review could not
verify those settings. Confirm the environment exists, restrict deployment
branches to `main`, and require review if staging mutations need an
approval gate.


## Verified controls

- GitHub Actions requests `id-token: write` only on the deploy job and uses
  OIDC instead of repository AWS keys.
- Committed and live trust require `aud=sts.amazonaws.com` and
  `sub=repo:khangtoh/dillinger-aws:environment:staging`.
- Env files, PEM files, local AWS context, SAM output, and orchestrator
  credential-state output are ignored; Docker excludes env files and Git.
- `.env.local.example` contains placeholders, not credential values.
- Git history contains no `AKIA`/`ASIA` access-key-shaped value and no
  private-key header marker based on repository-wide history scans.
- Provider secrets are consumed only by server routes and never use a
  `NEXT_PUBLIC_*` name.

## Completion criteria

This credential review is complete. Remediation is complete only after the
live key/user cutover and after Secrets Manager is implemented for each
enabled OAuth provider.

