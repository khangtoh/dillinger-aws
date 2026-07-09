# Phase 2 — Architecture Plan

Goal: decide, on paper, exactly how Dillinger's Next.js 14 app maps onto
AWS Lambda before writing any infra code. No AWS credentials needed for
this phase.

## Source app facts (researched from joemccann/dillinger)

- Next.js 14 App Router app, TypeScript, builds with `npm run build`,
  serves with `npm run start`.
- No backend database — state is client-side (Zustand + localStorage).
- Optional OAuth integrations: GitHub, Dropbox, Google Drive, OneDrive,
  Bitbucket (route handlers under `app/api/*/callback`).
- PDF export uses `puppeteer-core` — needs a headless Chromium binary,
  which Lambda does not provide by default.
- Currently deployed to Vercel; no existing Dockerfile in the upstream repo.

## Decisions

- [ ] Confirm packaging model: **container image** (not zip) — needed for
      the Chromium binary size and for using the AWS Lambda Web Adapter
      unmodified. Record decision (or override) in this file.
- [ ] Confirm invocation model for v1: **Lambda Function URL** (built-in
      HTTPS, no API Gateway cost). Defer API Gateway/CloudFront/custom
      domain to a stretch task in Phase 4.
- [ ] Confirm runtime adapter: **AWS Lambda Web Adapter**
      (https://github.com/awslabs/aws-lambda-web-adapter) run as a Lambda
      extension, so the Next.js `server.js` runs unmodified and the
      adapter proxies Lambda invoke events to it over localhost HTTP.
- [ ] Confirm build output mode: enable `output: 'standalone'` in
      `next.config.mjs` so the server bundle is self-contained and small.
- [ ] Decide PDF export strategy for v1: **disable/feature-flag** Puppeteer
      PDF export in the first working deployment (tracked as a stretch goal
      in Phase 6) so it doesn't block "app is running."
- [ ] Confirm secrets strategy for v1: plain Lambda environment variables
      (OAuth client IDs/secrets are optional and few); revisit AWS Secrets
      Manager only if the list grows.
- [ ] Confirm domain strategy for v1: use the default
      `https://<url-id>.lambda-url.<region>.on.aws` Function URL; a custom
      domain is optional stretch work in Phase 4.
- [ ] Confirm IaC tool: **AWS SAM** (`infra/template.yaml`), chosen for the
      simplest path to "container-image Lambda + Function URL." Record
      alternative (CDK/Terraform) here if the user prefers a different tool.
- [ ] Confirm CI/CD approach: GitHub Actions workflow builds the image,
      pushes to ECR, and updates the Lambda function on push to the
      deploy branch, authenticating via GitHub OIDC (no long-lived AWS
      keys in CI).
- [ ] Write a one-paragraph summary of the final agreed architecture at the
      bottom of this file once all boxes above are checked.

## Final architecture summary

_(fill in once decisions above are locked)_
