# Phase 4 — AWS Infrastructure & Deploy

Goal: the container image from Phase 3 is running as a real Lambda function
in the user's AWS account, reachable over HTTPS.

Depends on: Phase 1 (credentials) + Phase 3 (image builds locally).

- [ ] Create `infra/template.yaml` (AWS SAM) defining: an
      `AWS::ECR::Repository`, an `AWS::Serverless::Function` with
      `PackageType: Image`, and a Function URL resource (`AuthType: NONE`
      for a public editor, revisit if auth is desired later).
- [ ] Set sensible defaults in the template: `MemorySize: 1024`,
      `Timeout: 15`, architecture `x86_64` (or `arm64` if the base images
      support it — record the choice).
- [ ] Add a `CloudWatch LogGroup` resource with an explicit retention
      period (e.g. 14 days) so logs don't accumulate indefinitely.
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
