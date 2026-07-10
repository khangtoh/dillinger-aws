# Phase 4 — AWS Infrastructure & Deploy

Goal: the container image from Phase 3 is running as a real Lambda function
in the user's AWS account, reachable over HTTPS.

Depends on: Phase 1 (credentials) + Phase 3 (image builds locally).

- [x] Create `infra/template.yaml` (AWS SAM) defining an
      `AWS::Serverless::Function` with `PackageType: Image` (SAM manages
      its own ECR repo automatically on `sam deploy` — no separate
      `AWS::ECR::Repository` resource needed) and a Function URL
      (`AuthType: NONE` for a public editor, revisit if auth is desired
      later). **Validated**: `sam validate --lint` passes (SAM CLI now
      installed via pip, see Phase 1). `sam build` correctly resolves the
      template/Dockerfile and only fails at the known Docker-registry
      network restriction (see Phase 3) — full deploy still needs Phase 1
      credentials and an unrestricted-network environment for the actual
      image build.
- [x] Set sensible defaults in the template: `MemorySize: 1024`,
      `Timeout: 15`, architecture `x86_64`. (arm64 could shrink cost
      further but Lambda Web Adapter + `@sparticuz/chromium` compatibility
      on arm64 isn't verified — stick with x86_64 for v1.)
- [x] Add a `CloudWatch LogGroup` resource with an explicit retention
      period (14 days) so logs don't accumulate indefinitely.
- [x] `sam build` — confirm the template + Dockerfile validate and build.
      Validated as far as this sandbox allows: `sam build` resolves the
      template and Dockerfile correctly and fails only at the Docker Hub
      pull restriction (see Phase 3/Phase 1 notes) — a real build needs to
      run where that's not blocked (this is also exercised by
      `infra/provision-tenant.sh`, see Phase 9).
- [ ] Deploy the **first tenant** via
      `infra/provision-tenant.sh <first-tenant-id>` (per the single-user-
      per-instance model in `spec/09-multi-tenancy.md` — there is no
      "shared" deploy target, every deploy is a named tenant, ask the user
      what to call the first one if unclear); capture the stack name,
      region, and the resulting Function URL from `infra/tenants.json`.
- [ ] Verify the function exists and is `Active`:
      `aws lambda get-function --function-name <name>`.
- [ ] Hit the Function URL with `curl -I` and confirm a `200 OK` /
      `3xx` response (not a Lambda error payload).
- [ ] Confirm resources are tagged `Project=dillinger-aws` and
      `TenantId=<tenant-id>` for cost tracking (already set in
      `infra/template.yaml`).
- [ ] Record the live Function URL in `spec/README.md`'s Status section.
- [ ] A shared custom domain in front of every tenant's Function URL is
      now handled by `spec/10-gateway.md` (one CloudFront distribution +
      subdomain routing) rather than a per-tenant stretch goal here — see
      that file once the base deployment above is verified working.
