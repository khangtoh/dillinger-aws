# Dillinger on AWS Lambda — Spec Index

Goal: run [Dillinger](https://github.com/joemccann/dillinger) (a Next.js 14
markdown editor, currently deployed to Vercel with no Docker involved today)
on **AWS Lambda**, packaged as a container image so it executes inside
Lambda's Firecracker microVM runtime
(see https://aws.amazon.com/lambda/lambda-microvms/), instead of any
Docker-host/ECS/EC2-style deployment.

## How this spec set works

- Every file under `spec/` is a phase. Every phase is a flat checklist of
  **atomic tasks** — each should be completable in under ~5 minutes.
- Check a box (`- [x]`) only once the task is actually done and, where
  applicable, verified.
- Work phases in order: a phase's tasks assume prior phases are checked off.
- A scheduled agent picks up the next unchecked box, does it, verifies it,
  checks it off, commits, and moves to the next one — repeating until
  `spec/08-testing.md` is fully checked and a live Function URL is recorded
  below.

## Phases

| # | File | Purpose | Blocking dependency |
|---|------|---------|----------------------|
| 1 | [01-aws-account-onboarding.md](01-aws-account-onboarding.md) | Get working AWS credentials in this environment | **User action required** |
| 2 | [02-architecture-plan.md](02-architecture-plan.md) | Decide how Dillinger maps onto Lambda | None (design only) |
| 3 | [03-execution-containerize.md](03-execution-containerize.md) | Build the Lambda-compatible container image | Phase 2 |
| 4 | [04-execution-infra.md](04-execution-infra.md) | Provision AWS infra (ECR, Lambda, Function URL) | Phase 1 + 3 |
| 5 | [05-execution-oauth-secrets.md](05-execution-oauth-secrets.md) | Wire up optional cloud-storage OAuth integrations | Phase 4 (optional/stretch) |
| 6 | [06-execution-pdf-export.md](06-execution-pdf-export.md) | Handle Puppeteer/Chromium PDF export on Lambda | Phase 4 (optional/stretch) |
| 7 | [07-execution-cicd.md](07-execution-cicd.md) | Automate build+deploy on push | Phase 4 |
| 8 | [08-testing.md](08-testing.md) | Verify the deployment actually works | Phase 4 |
| 9 | [09-multi-tenancy.md](09-multi-tenancy.md) | Multi-user: isolated single-tenant instance per user | Phase 4 |
| 10 | [10-gateway.md](10-gateway.md) | Single entry gateway routing to each tenant | Phase 9 |
| 11 | [11-deployment-orchestrator/README.md](11-deployment-orchestrator/README.md) | Credential-isolated validate → resolve → check → sync pipeline | Phase 9 + 10 |

## Status

- [ ] **Dillinger is live on AWS Lambda** — Function URL: `TBD`
- Overall phase progress: see individual files.
- Phase 1 AWS credentials (`spec/01-aws-account-onboarding.md`):
  **resolved 2026-07-10** — the `dillinger-aws-deploy` IAM user exists
  with a scoped policy; `credential-guard.sh` passes all 7 permission
  groups against real AWS, not mocks. See `spec/.aws-context.md`
  (gitignored — account ID/region live there, not here) for details.
  Everything below is now unblocked to actually run.
- Multi-user model (`spec/09-multi-tenancy.md`): **resolved** — one
  isolated Lambda deployment per user (`infra/provision-tenant.sh`), never
  shared. First real tenant provisioning has not been run yet.
- Single entry gateway (`spec/10-gateway.md`): **deployed and live**
  (2026-07-10, the project's first real AWS deploy) — stack
  `dillinger-gateway` in us-east-1, serving at
  `dy1136w4wv8qd.cloudfront.net`; unknown-tenant 404 verified at the
  edge. Custom domain still blocked on a domain name (wildcard
  cert/DNS). Request-path docs: `infra/gateway/README.md`.
- Deployment orchestrator (`spec/11-deployment-orchestrator/`): **built
  and end-to-end verified with mocks** — `infra/orchestrator/run.sh` is
  now the one command to validate credentials, resolve desired state,
  check actual AWS state, and sync the difference. Built by four parallel
  background sub-agents (one per module), each merged and independently
  re-verified rather than trusted on report alone. **Not yet run against
  real AWS end-to-end** (only mocked so far) — now that Phase 1 is
  resolved, that's the next concrete milestone towards a live Function
  URL.

## Non-goals for v1

- No self-hosted database — Dillinger already keeps state client-side
  (Zustand + localStorage), so none is needed on AWS either.
- OAuth cloud-storage sync (GitHub/Dropbox/Google Drive/OneDrive/Bitbucket)
  and PDF export are **optional** features layered on top of a working
  editor; they must not block the "app is running on Lambda" milestone.
