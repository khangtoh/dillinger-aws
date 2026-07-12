# Security Model and Operations

This document defines the security invariants for the Dillinger Lambda port.
It complements `security_best_practices_report.md`, which tracks review findings.

## Scope and assumptions

- One tenant maps to one CloudFormation stack, Lambda function, Function URL,
  log group, OAuth configuration, and CloudFront tenant route.
- Documents remain in browser storage unless a user explicitly connects a
  provider. Browser storage is untrusted input and is not a secret store.
- Lambda Firecracker isolation is one layer. It does not replace application
  authentication, CSRF controls, input validation, rate limits, or IAM policy.
- The public Function URL is an intentional exposure until a CloudFront-only
  origin design is deployed. Treat every route as internet reachable.

## Trust boundaries

1. The browser holds local documents and sends untrusted Markdown, HTML, files,
   provider identifiers, and filenames to the application.
2. Provider OAuth tokens are held only in HttpOnly, Secure-in-production,
   SameSite cookies. They must never enter client JavaScript or logs.
3. Route handlers exchange those tokens with GitHub, Dropbox, Google Drive,
   OneDrive, and Bitbucket over fixed HTTPS origins.
4. PDF generation executes untrusted document content in Chromium inside the
   tenant Lambda. JavaScript and network access must remain disabled.
5. CloudFront Functions and KVS select a tenant origin. They are routing
   controls, not an authorization boundary while Function URLs remain public.
6. GitHub Actions obtains short-lived AWS credentials through OIDC. The AWS
   role trust and permissions are external state and must be audited separately.

## Route policy

| Route class | Authentication | Required controls |
| --- | --- | --- |
| App shell and static assets | Public | CSP and browser security headers |
| OAuth start/callback | Public | Canonical callback URL, random one-time state cookie |
| Provider list/status GET | Provider cookie | Runtime query validation, fixed provider origin, no-store |
| Provider file/save/unlink POST | Provider cookie | Exact configured Origin plus `X-Dillinger-Request`, runtime schemas, size limits |
| Browser export/import/upload | Public | Runtime schemas, size limits; PDF/upload also require same-origin marker |
| `/api/v1/*` | Bearer API key | Constant-time key check, runtime schemas, size limits, no-store |
| `/api/v1/openapi` | Public documentation | No secrets or internal configuration |

## Production invariants

- `NEXT_PUBLIC_BASE_URL` must be the exact public tenant origin used by the
  browser and OAuth callbacks. Do not derive callbacks from request `Host`.
- `DILLINGER_TRUSTED_ORIGINS`, when used, must contain only comma-separated
  origins controlled by the operator. Do not use wildcards.
- `DILLINGER_API_KEY` must be a random value from a secret manager, not a
  repository or `NEXT_PUBLIC_*` value. Rotate it after suspected disclosure.
- Third-party advertising is disabled unless
  `NEXT_PUBLIC_ENABLE_THIRD_PARTY_ADS=true` is explicitly accepted as a risk.
- Keep Lambda reserved concurrency enabled. Raising it changes the abuse and
  cost ceiling and requires review.
- Supply an SNS topic through `AlarmTopicArn`; an alarm without an action is
  evidence only and does not notify an operator.
- Keep direct Function URL access under review. The target architecture is a
  CloudFront-only origin using an authenticated origin mechanism.

## Deployment checklist

1. Protect the `staging` GitHub Environment and require reviewers for any
   production environment.
2. Change the AWS OIDC trust `sub` condition to exactly
   `repo:khangtoh/dillinger-aws:environment:staging` for this workflow.
3. Confirm the deploy role is limited to required `dillinger-*` stacks, ECR
   repositories, Lambda, CloudFormation, logs, alarms, and artifact storage.
4. Enable ECR scan-on-push or enhanced Inspector scanning and retain the CI
   CycloneDX SBOM with the deployment evidence.
5. Configure AWS Budgets notifications and CloudFront WAF rate rules. WAF does
   not protect a directly reachable Function URL.
6. Verify live CSP, frame, nosniff, referrer, permissions, cache, and CORS
   headers through both CloudFront and the Function URL.
7. Confirm OAuth callback allowlists at every provider match the canonical
   tenant URL exactly.

## Tenant isolation test

Provision two non-production tenants and verify:

- each has a different function ARN, Function URL, log group, concurrency
  reservation, OAuth callback base, and CloudFront KVS mapping;
- cookies issued on one tenant are not sent to the other tenant;
- one tenant cannot retrieve another tenant's cached provider metadata;
- CloudFront host routing cannot select an unregistered tenant;
- direct Function URL behavior matches the documented exposure decision;
- throttling or PDF load on one tenant does not consume the other's reserved
  concurrency.

## Incident response

For a leaked API key, OAuth secret, or provider token:

1. Disable the affected tenant route or set reserved concurrency to zero if
   active abuse is occurring.
2. Revoke provider grants and rotate OAuth client secrets and API keys.
3. Invalidate affected cookies by changing credentials and instructing the user
   to unlink/reconnect the provider.
4. Preserve CloudFront, CloudTrail, Lambda, ECR, and GitHub Actions evidence.
5. Redeploy a reviewed image, verify alarms and headers, then restore routing.
6. Record scope, timeline, affected tenants, rotated material, and prevention
   work without placing tokens or sensitive request bodies in the report.

For cost or denial-of-service abuse, disable the public route, inspect Lambda
concurrency/throttles/duration and CloudFront request patterns, then add or
tighten WAF controls before restoring service.
