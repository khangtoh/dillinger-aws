# Security Best Practices Report

Date: 2026-07-11

Scope: TypeScript/Next.js web app, AWS Lambda container-image runtime, Lambda Function URLs, CloudFront gateway, OAuth provider integrations, Markdown/HTML/PDF processing, CI/CD and container build path.

## Executive Summary

This repo has a strong isolation story at the AWS compute layer, but several application and deployment controls are not yet at production security bar. The highest-priority issues are OAuth connection CSRF, missing CSRF/origin checks on cookie-authenticated provider write endpoints, unsanitized server-side HTML/PDF rendering, and unauthenticated expensive PDF export behind public Function URLs.

The initial review found no committed real secrets. The deployment uses GitHub OIDC rather than stored AWS keys in Actions, which is good. The main risk pattern is that browser-facing convenience features are now running as public cloud endpoints without the expected production controls: request bounds, origin checks, browser security headers, third-party script governance, and abuse/cost controls.

`npm audit` could not be completed in this environment: both full and production-only runs crashed with `double free or corruption (out)`. Treat dependency vulnerability review as a required verification gap.

## Security Engineer Work Spec

1. Build and maintain a threat model for the public Function URL path, CloudFront gateway path, OAuth provider flows, browser-local document storage, server-side PDF rendering, and tenant isolation.
2. Define trust boundaries explicitly: browser localStorage, OAuth cookies, provider APIs, Lambda microVM, CloudFront Function/KVS, ECR image, GitHub Actions OIDC role, and AWS deploy principal.
3. Inventory every route handler and classify it as public, API-key protected, or cookie-authenticated; for each state-changing route, define authn/authz, CSRF/origin defense, schema validation, rate limiting, and logging rules.
4. Harden Markdown/HTML/PDF rendering: one reviewed sanitization pipeline, escaped document metadata, blocked server-side browser egress where possible, JavaScript disabled for PDF if compatible, and strict resource/time/payload limits.
5. Add browser security baseline: CSP, `X-Content-Type-Options`, clickjacking defense, referrer policy, permissions policy, and a third-party script approval process.
6. Harden cloud exposure: decide whether direct Function URLs are intentionally public; if not, move toward CloudFront-only or IAM-protected origin access. Add WAF/rate limits, reserved concurrency, budget alarms, and Lambda log redaction policy.
7. Harden supply chain: pin container/image artifacts by digest where practical, scan the ECR image, run SCA in CI, enable Dependabot or equivalent, generate an SBOM, and verify Next.js/security advisories outside this broken `npm audit` environment.
8. Verify tenant isolation with at least two tenants: different Function URLs, log groups, OAuth callback bases, cookies, cache entries, and gateway routes. Confirm direct URL bypass behavior is intended.
9. Tighten CI/CD: restrict GitHub OIDC trust to the exact protected branch/environment, add deployment approvals for production, and keep the deploy role least-privilege with drift checks.
10. Define incident operations: key/token rotation, compromised tenant response, log retention, audit evidence retention, and rollback procedures.

## Findings

### SEC-001 - High - OAuth connection CSRF / missing `state`

Evidence: OAuth starts without an anti-CSRF `state` or PKCE binding in representative routes such as `app/api/github/oauth/route.ts:23`, `app/api/google-drive/oauth/route.ts:18`, `app/api/onedrive/oauth/route.ts:18`, `app/api/bitbucket/oauth/route.ts:18`, and `app/api/dropbox/oauth/route.ts:21`. Callbacks accept a `code` directly and then set provider token cookies, for example `app/api/github/callback/route.ts:9` and `app/api/github/callback/route.ts:50`, plus equivalent provider callback routes.

Impact: An attacker can attempt OAuth connection/login CSRF, causing a victim browser to bind the app to an attacker-controlled provider account or overwrite provider-token cookies.

Fix: Generate a cryptographically random state value at OAuth start, store it in a short-lived HttpOnly/SameSite cookie, pass it to the provider, and require an exact match in the callback before token exchange. Add PKCE for providers/flows that support it.

### SEC-002 - High - Cookie-authenticated provider writes lack CSRF/origin checks

Evidence: Provider write routes use HttpOnly provider-token cookies and then process POST bodies without visible CSRF token or Origin/Referer validation, e.g. `app/api/github/save/route.ts:7`, `app/api/github/save/route.ts:16`, `app/api/dropbox/save/route.ts:15`, `app/api/google-drive/save/route.ts:24`, `app/api/onedrive/save/route.ts:24`, and `app/api/bitbucket/save/route.ts:24`. Repo search found only `sameSite: "lax"` cookie settings and no CSRF/origin validation helpers.

Impact: Cross-site requests may be able to trigger state-changing writes against connected cloud providers if browser cookie behavior and request shape allow it. SameSite=Lax is useful defense-in-depth, not a full CSRF strategy.

Fix: Add a central CSRF/origin guard for cookie-authenticated POST routes. Require same-origin `Origin` or `Referer`, and preferably require a CSRF token or custom header generated by the app shell. Keep SameSite cookies.

### SEC-003 - High - Server-side export/PDF path renders unsanitized HTML

Evidence: Markdown rendering enables raw HTML at `lib/markdown.ts:95`. The browser preview sanitizes with DOMPurify before `dangerouslySetInnerHTML` (`components/preview/MarkdownPreview.tsx:25`, `components/preview/MarkdownPreview.tsx:30`, `components/preview/MarkdownPreview.tsx:94`), but server export routes render directly (`app/api/export/html/route.ts:18`, `app/api/v1/export/html/route.ts:22`) and return `text/html` (`app/api/export/html/route.ts:28`, `app/api/v1/export/html/route.ts:28`). PDF export feeds the rendered HTML to Chromium (`lib/pdf.ts:81`, `lib/pdf.ts:93`). `renderHtmlDocument` also interpolates `title` into `<title>` without HTML escaping at `lib/export.ts:99`.

Impact: User-controlled markdown/title can become active HTML in exported documents and in the server-side Chromium renderer. In PDF generation, this can become server-side browser SSRF/resource loading and a hardened-browser escape risk.

Fix: Use a server-side sanitizer for all export/PDF paths, or disable raw HTML for export. Escape title and metadata. For PDF, disable JavaScript if compatible, intercept/block non-data/non-same-origin requests, enforce timeouts, and cap input size.

### SEC-004 - High - Public expensive PDF endpoint creates cost/availability risk

Evidence: The Lambda Function URL is public (`infra/template.yaml:50`, `infra/template.yaml:51`). Public PDF export accepts JSON and launches Chromium without app auth (`app/api/export/pdf/route.ts:10`, `app/api/export/pdf/route.ts:18`). The CloudFront distribution allows all HTTP methods on the default behavior (`infra/gateway/template.yaml:144`) and no WAF/rate-limit configuration is visible.

Impact: Anyone who can reach the URL can trigger CPU-heavy Chromium work, driving Lambda cost, concurrency exhaustion, cold starts, and degraded availability.

Fix: Add edge/application rate limiting, request size limits, and reserved concurrency. Consider requiring API auth for PDF export or moving it behind an authenticated action. Add AWS Budget alarms and CloudWatch alarms for errors, duration, throttles, and concurrency.

### SEC-005 - Medium - Browser security headers and third-party script governance are missing

Evidence: No `Content-Security-Policy`, `X-Frame-Options`, or `X-Content-Type-Options` configuration was found in app/infra searches. `next.config.mjs` only declares standalone output and package settings (`next.config.mjs:3`, `next.config.mjs:8`). The app loads a third-party ad script from BuySellAds (`components/ads/LogoBar.tsx:41`) without visible SRI/CSP governance.

Impact: The app renders user-controlled markdown and stores documents in localStorage. A compromised third-party script or XSS bug can read/modify documents and perform same-origin actions.

Fix: Add central headers in Next.js or CloudFront response headers policy. Start with CSP report-only if needed, then enforce. Minimize or sandbox third-party JavaScript; use explicit HTTPS URLs, reviewed vendor allowlists, and SRI where feasible.

### SEC-006 - Medium - Upload validation is incomplete and body bounds are late

Evidence: Upload allows SVG (`app/api/upload/image/route.ts:6`), parses multipart form data before checking size (`app/api/upload/image/route.ts:10`, `app/api/upload/image/route.ts:24`), and trusts client-provided MIME type (`app/api/upload/image/route.ts:17`).

Impact: Large multipart bodies can consume memory before app-level checks. SVG is an active format and needs stricter handling than raster images, especially because returned markdown embeds data URLs back into rendered content.

Fix: Enforce request body size at the edge/runtime before parsing. Prefer disallowing SVG upload, or sanitize SVG with a dedicated sanitizer and serve/preview it safely. Validate file signatures for raster formats.

### SEC-007 - Medium - Runtime input validation is ad hoc

Evidence: Many routes call `request.json()` and use fields after presence checks only, including provider file operations (`app/api/github/save/route.ts:16`, `app/api/github/files/route.ts:85`, `app/api/google-drive/save/route.ts:24`, `app/api/onedrive/save/route.ts:24`, `app/api/bitbucket/save/route.ts:24`). Some user-controlled values are interpolated into upstream URLs, for example GitHub path/repo and Drive/OneDrive item IDs (`app/api/github/save/route.ts:40`, `app/api/google-drive/files/route.ts:75`, `app/api/onedrive/files/route.ts:83`).

Impact: Malformed values can trigger unintended provider operations, broken requests, excessive payloads, or edge-case authorization mistakes. TypeScript types do not validate runtime input.

Fix: Add schema validation for every route body/query using a runtime validator. Normalize and length-limit names, paths, IDs, branch names, commit messages, and content. URL-encode path segments or use provider SDK helpers where possible.

### SEC-008 - Medium - Build context and image supply chain need hardening

Evidence: Docker copies the repo build context (`Dockerfile:7`) while `.dockerignore` ignores `.env` and `.env*.local` only (`.dockerignore:11`). A non-local `.env.production` or similar file would not be ignored by that pattern. The image uses mutable tags (`Dockerfile:1`, `Dockerfile:10`) and copies the Lambda Web Adapter by tag (`Dockerfile:30`).

Impact: Local secret/config files can be accidentally copied into the build context if naming differs. Mutable tags reduce reproducibility and make supply-chain review harder.

Fix: Ignore `.env*` by default, allow only committed examples, and confirm no secret files are copied into `.next/standalone`. Pin image/adapter digests where practical, scan images in CI/ECR, and add SCA/SBOM output.

### SEC-009 - Medium - GitHub Actions OIDC trust appears broader than necessary

Evidence: CI docs describe the OIDC subject condition as `repo:khangtoh/dillinger-aws:*` (`.github/workflows/README.md:25`, `.github/workflows/README.md:31`). The workflow is manual-only today, but the trust description allows any ref pattern for this repo.

Impact: If future workflows or triggers are added incorrectly, the deploy role could be assumable from unintended branches/tags/environments.

Fix: Restrict the AWS role trust policy to protected branches or a GitHub Environment subject. Add required reviewers for production deploy environments before enabling automatic deploys.

### SEC-010 - Low - API key comparison and lifecycle are basic

Evidence: The API key is a single env var (`lib/api-auth.ts:4`) compared with direct string inequality (`lib/api-auth.ts:21`).

Impact: This lacks key IDs, rotation, scopes, auditability, and constant-time comparison. The practical risk is lower if the API is private and the key is high entropy.

Fix: Use a constant-time comparison over equal-length hashes. Add key IDs, rotation, per-route scopes, and secret-manager backed deployment.

### SEC-011 - Low - GitHub cache keys use a short token prefix

Evidence: cache keys use `tokenPrefix(token)` in GitHub routes (`app/api/github/files/route.ts:27`, `app/api/github/repos/route.ts:24`, `app/api/github/branches/route.ts:23`), and `tokenPrefix` returns `token.slice(0, 8)` (`lib/cache.ts:41`, `lib/cache.ts:42`).

Impact: Prefix collisions could leak cached provider metadata between users in the same process. The risk is reduced by single-tenant intent and token entropy, but the pattern is avoidable.

Fix: Use `HMAC-SHA256(serverSecret, token)` or a full SHA-256 digest of the token as the cache key component.

## Verification Gaps

- Dependency vulnerability scan: `npm audit --audit-level=moderate --json` and `npm audit --omit=dev --audit-level=moderate --json` both crashed.
- Runtime headers: verify live Function URL and CloudFront responses for CSP, frame protection, nosniff, referrer policy, permissions policy, caching, and CORS behavior.
- AWS account controls: verify the actual IAM trust policy, deploy role permissions, ECR scan settings, CloudWatch alarms, budget alarms, and whether the direct Function URLs are intentionally public.
- Tenant isolation: provision a second tenant and test cookie/cache/log/gateway separation.
- PDF sandbox: test whether disabling JavaScript and blocking remote requests preserves required PDF functionality.
