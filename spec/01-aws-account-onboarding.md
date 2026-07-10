# Phase 1 — AWS Account Onboarding

Goal: this environment has working AWS credentials that can create/manage
Lambda, ECR, IAM, and CloudWatch Logs resources.

**Decision (2026-07-10, pending explicit user confirmation — asked twice,
tool errored both times, defaulting to this recommendation and proceeding;
override any time):** use a **dedicated least-privilege IAM user with a
static access key**, not AWS SSO. Reasoning: this environment runs an
hourly, unattended Routine (see `spec/README.md`) that needs to keep
deploying between firings without a human present to click through an SSO
device-login URL every time a short-lived session token expires. A scoped
IAM user avoids that stall. Once Phase 7 CI/CD is live (GitHub Actions
OIDC), this key stops being needed for ongoing deploys and can be deleted
— it only has to survive the initial bootstrap.

This phase still requires a human action (only the user can create the IAM
user/key in their own AWS account) — flag it and wait rather than guessing
further than the recommendation above.

- [x] Check whether the AWS CLI is installed (`aws --version`); install it
      if missing. Installed via `pip3 install --break-system-packages
      awscli` (`aws-cli/1.45.45`) since the official installer's download
      host is behind the same CDN restriction blocking Docker pulls in
      this sandbox, but PyPI is allowlisted. Also installed
      `aws-sam-cli` (1.163.0) the same way, needed for Phase 4/9/10
      deploys. Both templates now pass `sam validate --lint` for real
      (not just YAML parsing) — `infra/template.yaml` and
      `infra/gateway/template.yaml` are confirmed valid SAM/CloudFormation.
      `sam build` on `infra/template.yaml` gets past template resolution
      and fails only at the known-blocked Docker Hub pull (same as Phase
      3), confirming the SAM build pipeline itself is wired correctly.
- [ ] User creates a dedicated IAM user (e.g. `dillinger-aws-deploy`) in
      their AWS account with this least-privilege policy (draft — refine
      once real ARNs/resource names are known):
      - `lambda:*` scoped to `arn:aws:lambda:<region>:<account-id>:function:dillinger-*`
      - `ecr:*` scoped to a repo named `dillinger*`
      - `iam:CreateRole`, `iam:AttachRolePolicy`, `iam:PassRole`,
        `iam:GetRole`, `iam:PutRolePolicy` scoped to role names matching
        `dillinger-*` (Lambda's execution role)
      - `logs:*` scoped to `/aws/lambda/dillinger*` log groups
      - `cloudformation:*` scoped to a stack named `dillinger-aws*` (SAM
        deploys via CloudFormation)
      - `s3:*` scoped to the SAM deployment artifacts bucket
      No wildcard `*:*` / `AdministratorAccess` — this key should not be
      able to touch anything outside this project.
- [ ] User creates an access key for that IAM user and provides
      `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` to this environment
      (never commit them to the repo).
- [ ] Confirm with the user: target AWS account ID and preferred AWS
      region (e.g. `us-east-1`).
- [ ] Run `aws configure` (or set `AWS_ACCESS_KEY_ID` /
      `AWS_SECRET_ACCESS_KEY` / `AWS_DEFAULT_REGION` env vars) to populate
      credentials for this session.
- [ ] Verify credentials work: `aws sts get-caller-identity` succeeds and
      returns the expected account ID.
- [ ] Record the confirmed account ID, region, and credential method in
      `spec/.aws-context.md` (create it, and make sure it's gitignored —
      it must never contain the actual secret key) for later phases to
      reuse.
- [ ] Confirm with the user whether a budget/billing alarm should be set up
      before deploying (recommended, not blocking).
