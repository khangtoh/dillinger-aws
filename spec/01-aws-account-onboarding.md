# Phase 1 — AWS Account Onboarding

Goal: this environment has working AWS credentials that can create/manage
Lambda, ECR, IAM, and CloudWatch Logs resources. Prefer AWS CLI login
(`aws configure sso` / `aws sso login`) over long-lived static access keys.

This phase requires a human decision and cannot be completed by an agent
alone — flag it and wait rather than guessing.

- [ ] Check whether the AWS CLI is installed (`aws --version`); install it
      if missing.
- [ ] Ask the user which credential method they want to use in this
      environment:
      - AWS IAM Identity Center / SSO (`aws configure sso`) — preferred
      - Static IAM user access keys (`aws configure`) — fallback if SSO
        isn't set up
      - Credentials injected as environment variables by the platform
- [ ] Confirm with the user: target AWS account ID, preferred AWS region
      (e.g. `us-east-1`), and that the IAM principal has (or can be granted)
      permissions for Lambda, ECR, IAM role creation, and CloudWatch Logs.
- [ ] Run the chosen `aws configure ...` flow to populate
      `~/.aws/config` / `~/.aws/credentials`.
- [ ] Verify credentials work: `aws sts get-caller-identity` succeeds and
      returns the expected account ID.
- [ ] Record the confirmed account ID, region, and credential method in
      `spec/.aws-context.md` (create it) for later phases to reuse.
- [ ] Confirm with the user whether a budget/billing alarm should be set up
      before deploying (recommended, not blocking).
