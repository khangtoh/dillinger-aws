# Phase 4 — AWS Infrastructure & Deploy

Goal: the container image from Phase 3 is running as a real Lambda function
in the user's AWS account, reachable over HTTPS.

Depends on: Phase 1 (credentials) + Phase 3 (image builds locally).

- [x] Create `infra/template.yaml` (AWS SAM) defining an
      `AWS::Serverless::Function` with `PackageType: Image` (SAM manages
      its own ECR repo automatically on `sam deploy` — no separate
      `AWS::ECR::Repository` resource needed) and a Function URL
      (`AuthType: NONE` for a public editor, revisit if auth is desired
      later). **Not yet validated** — the SAM CLI isn't installed in the
      authoring sandbox and validation needs either AWS credentials
      (`sam validate` calls CloudFormation) or a Docker build (`sam
      build`), both blocked/pending here; validate for real during the
      first `sam build`/`sam deploy` once Phase 1 is unblocked.
- [x] Set sensible defaults in the template: `MemorySize: 1024`,
      `Timeout: 15`, architecture `x86_64`. (arm64 could shrink cost
      further but Lambda Web Adapter + `@sparticuz/chromium` compatibility
      on arm64 isn't verified — stick with x86_64 for v1.)
- [x] Add a `CloudWatch LogGroup` resource with an explicit retention
      period (14 days) so logs don't accumulate indefinitely.
- [ ] `sam build` — confirm the template + Dockerfile validate and build.
- [ ] `sam deploy --guided` for the first deploy; capture the stack name,
      region, and the resulting Function URL.
- [ ] Verify the function exists and is `Active`:
      `aws lambda get-function --function-name <name>`.
- [ ] Hit the Function URL with `curl -I` and confirm a `200 OK` /
      `3xx` response (not a Lambda error payload).
- [ ] Tag all created resources (`Project=dillinger-aws`) for cost
      tracking.
- [ ] Record the live Function URL in `spec/README.md`'s Status section.
- [ ] **Stretch (optional):** add ACM cert + Route53 record + CloudFront
      (or API Gateway custom domain) in front of the Function URL for a
      stable custom domain. Only do this after the base deployment in this
      file is verified working.
