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
- PDF export uses `puppeteer-core`. Upstream **already** ships
  `@sparticuz/chromium` as a dependency and marks both
  `@sparticuz/chromium`/`puppeteer-core` as
  `serverComponentsExternalPackages` in `next.config.mjs` — i.e. the app was
  already built with serverless/Lambda-style Chromium in mind. This lowers
  the risk on Phase 6 considerably; see that file.
- Currently deployed to Vercel; no existing Dockerfile in the upstream repo.
- Vendored into this repo at commit `17010b79c18553cf9c1757c297e128f9b950c9be`
  (2026-06-07) — see `VENDOR.md`.

## Decisions

- [x] Confirm packaging model: **container image** (not zip) — needed for
      the Chromium binary size and for using the AWS Lambda Web Adapter
      unmodified.
- [x] Confirm invocation model for v1: **Lambda Function URL** (built-in
      HTTPS, no API Gateway cost). Defer API Gateway/CloudFront/custom
      domain to a stretch task in Phase 4.
- [x] Confirm runtime adapter: **AWS Lambda Web Adapter**
      (https://github.com/awslabs/aws-lambda-web-adapter) run as a Lambda
      extension, so the Next.js `server.js` runs unmodified and the
      adapter proxies Lambda invoke events to it over localhost HTTP.
- [x] Confirm build output mode: enable `output: 'standalone'` in
      `next.config.mjs` so the server bundle is self-contained and small.
      Done — see `next.config.mjs`.
- [x] Decide PDF export strategy for v1: since upstream already vendors
      `@sparticuz/chromium` for this exact purpose, **attempt to ship it
      enabled in v1** (Phase 6 folds into the main container build) rather
      than disabling it; only fall back to feature-flagging it off if the
      image size or memory/timeout budget makes it impractical.
- [x] Confirm secrets strategy for v1: plain Lambda environment variables
      (OAuth client IDs/secrets are optional and few); revisit AWS Secrets
      Manager only if the list grows.
- [x] Confirm domain strategy for v1: use the default
      `https://<url-id>.lambda-url.<region>.on.aws` Function URL; a custom
      domain is optional stretch work in Phase 4.
- [x] Confirm IaC tool: **AWS SAM** (`infra/template.yaml`), chosen for the
      simplest path to "container-image Lambda + Function URL."
- [x] Confirm CI/CD approach: GitHub Actions workflow builds the image,
      pushes to ECR, and updates the Lambda function on push to the
      deploy branch, authenticating via GitHub OIDC (no long-lived AWS
      keys in CI).
- [x] Write a one-paragraph summary of the final agreed architecture at the
      bottom of this file once all boxes above are checked.

## Final architecture summary

Dillinger's vendored Next.js 14 app is built with `output: 'standalone'`
and packaged as a container image (Node 20 base) with the AWS Lambda Web
Adapter extension layered in, so the stock `server.js` runs unmodified
inside a Lambda function invoked via a public Function URL — no API
Gateway needed for v1. Because the app is stateless on the server (all
document state lives client-side) and upstream already targets serverless
Chromium (`@sparticuz/chromium`) for its PDF export route, the same
container should be able to serve the full app, including PDF export,
without a second function. Infra is defined in `infra/template.yaml` (AWS
SAM): one ECR repo, one container-image Lambda function, one Function URL,
and a log group with bounded retention. OAuth secrets are plain Lambda
env vars for now. CI/CD (Phase 7) builds and redeploys on push via GitHub
OIDC. A custom domain and API Gateway/CloudFront are explicitly deferred
stretch goals, not required for the "Dillinger is running on Lambda"
milestone.
