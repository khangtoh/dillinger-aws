# Security Remediation Report

Date: 2026-07-11

This report records implementation performed after the initial findings in
`security_best_practices_report.md`. The initial report remains the audit
snapshot; this file is the current remediation status.

## Executive summary

Eight findings were remediated in repository code, three were materially
mitigated with external follow-up still required, and one new lifecycle finding
was confirmed. The highest-risk application paths now have OAuth state binding,
same-origin enforcement, safe server rendering, bounded PDF execution, runtime
provider input validation, and restrictive browser headers.

The repository is not yet ready to claim production security closure. GitHub
environment protection, WAF, budget notifications, ECR scanning, the direct
Function URL decision, alarm delivery, and two-tenant isolation still require
AWS-side execution. Next.js 14.2.35 is the patched 14.x security release for the
December 2025 RSC advisories, but 14.x is now outside the official support
policy and must be migrated to a supported major.

## Finding status

| ID | Status | Result |
| --- | --- | --- |
| SEC-001 | Resolved | All five OAuth providers issue and verify one-time random state cookies. |
| SEC-002 | Resolved | Cookie-backed provider POST routes require canonical Origin and a non-simple custom header. |
| SEC-003 | Resolved | Server rendering disables raw HTML; titles are escaped; PDF Chromium has JavaScript and network access disabled. |
| SEC-004 | Mitigated | PDF has same-origin gating, 512 KiB input cap, warm-instance rate limiting, 10-second render timeout, reserved concurrency, and alarms. WAF/budget/direct-URL work remains. |
| SEC-005 | Resolved | Nonce CSP and baseline browser headers are enforced; third-party ads are off by default. |
| SEC-006 | Resolved | SVG is rejected; raster signatures and size are checked; upload is same-origin gated. |
| SEC-007 | Resolved for provider surface | Provider query/body fields are bounded and outbound URL segments are encoded. Continue schema coverage as new routes are added. |
| SEC-008 | Mitigated | `.env*` is excluded, runtime is non-root, Dependabot/SCA/SBOM gates exist. Image digests and live ECR scanning remain. |
| SEC-009 | Resolved | Workflow and live IAM trust are restricted to the `staging` environment subject and STS audience. |
| SEC-010 | Resolved for comparison | API key uses constant-time SHA-256 digest comparison. Key IDs, scopes, and rotation remain operational work. |
| SEC-011 | Resolved | Cache isolation uses a full SHA-256 token fingerprint. |
| SEC-012 | Open - Medium | Next.js 14.x is unsupported even though 14.2.35 contains the final 14.x RSC security fixes. |

## Implemented evidence

### OAuth and request integrity

- `lib/oauth-state.ts:26` creates 256-bit URL-safe state values.
- `lib/oauth-state.ts:30` stores provider-scoped, HttpOnly, SameSite state
  cookies for ten minutes; `lib/oauth-state.ts:41` validates them with a
  constant-time comparison; `lib/oauth-state.ts:58` clears them after use.
- `lib/csrf.ts:31` requires an exact configured origin and
  `X-Dillinger-Request: same-origin`. Invalid configured origins are ignored
  rather than widening access (`lib/csrf.ts:14`).
- OAuth callbacks now redirect through the configured canonical app URL rather
  than request `Host` values.

### Rendering and abuse controls

- `lib/markdown.ts` maintains separate raw-HTML and safe renderers; all server
  export and v1 render paths use the safe renderer.
- `lib/export.ts` escapes title metadata, removes remote CSS imports, and adds
  a restrictive CSP to exported HTML.
- `lib/pdf.ts:81` uses safe Markdown output. JavaScript is disabled at
  `lib/pdf.ts:93`; non-data network requests are aborted at `lib/pdf.ts:94`;
  rendering is bounded to ten seconds at `lib/pdf.ts:103`.
- The browser PDF route performs same-origin, declared-body-size, Markdown-size,
  and rate-limit checks before Chromium (`app/api/export/pdf/route.ts:14`).
- Lambda reserved concurrency defaults to two (`infra/template.yaml:28` and
  `infra/template.yaml:55`). Error, throttle, duration, and concurrency alarms
  begin at `infra/template.yaml:77`.

### Browser and file controls

- `middleware.ts:3` builds a per-request nonce CSP with `strict-dynamic`,
  `object-src 'none'`, constrained base/form sources, and frame denial.
- `middleware.ts:32` sets CSP, nosniff, frame, referrer, and permissions headers;
  API responses are marked `no-store` at `middleware.ts:41`.
- Third-party advertising is disabled unless explicitly enabled, and its URL is
  HTTPS when enabled.
- Upload accepts only JPEG, PNG, GIF, and WebP (`app/api/upload/image/route.ts:7`),
  verifies magic bytes at `app/api/upload/image/route.ts:11`, checks limits
  before and after multipart parsing, and sanitizes Markdown alt text.

### Input, credentials, and supply chain

- Provider validation rejects control characters, traversal segments, unsafe
  identifiers, oversized content, and unbounded pagination (`lib/validation.ts:3`).
- API key verification hashes both operands and compares them in constant time
  (`lib/api-auth.ts:25`).
- Provider cache keys use full SHA-256 token fingerprints (`lib/cache.ts:43`).
- The runtime switches to the unprivileged `node` user (`Dockerfile:36`).
- CI installs from the lockfile, typechecks, runs unit tests, audits production
  dependencies, and publishes a CycloneDX SBOM before deployment
  (`.github/workflows/deploy-lambda.yml:31`). Deployment is restricted to main,
  the `staging` environment, and one active run (`.github/workflows/deploy-lambda.yml:67`).

## New finding: SEC-012 - unsupported framework major

Severity: Medium

Evidence: `package.json` pins Next.js 14.2.35. The official Next.js support
policy lists only 16.x as Active LTS and 15.x as Maintenance LTS; 14.x is
unsupported. The official December 11, 2025 security advisory identifies
14.2.35 as the fixed 14.x release for its RSC denial-of-service issue, so this
specific pin addresses that advisory but does not restore ongoing support.

Impact: Newly discovered framework vulnerabilities may not receive a 14.x
patch. A public App Router deployment should not rely on an unsupported line.

Required action: migrate on a dedicated branch to a current supported Next.js
major, update React and ESLint compatibility, then run unit, build, browser CSP,
OAuth, provider, PDF, Docker, and Lambda smoke tests before deployment.

Official references:

- https://nextjs.org/support-policy
- https://nextjs.org/blog/security-update-2025-12-11

## Verification performed

- `git diff --check` passes.
- Focused unit tests were added for OAuth state, CSRF/origin enforcement,
  request limits, input validation, API-key comparison, middleware headers,
  export sanitization, PDF route gating, and upload signatures.
- Existing affected Navbar, GitHub hook, cache, export, PDF, and upload tests
  were updated for the new contracts.

## Verification blocked

- `npm ci` failed repeatedly in this environment with npm 9 cache corruption:
  tarballs were reported corrupt and atomic cache renames failed with `ENOENT`
  in the global cache, `/tmp`, and a workspace-local cache. The resulting
  partial `node_modules` cannot run TypeScript or Vitest reliably.
- Earlier `npm audit` full and production-only commands crashed with
  `double free or corruption (out)`. CI now performs the production audit on a
  clean GitHub runner.
- SAM validation and shell infrastructure tests returned sandbox status 182 and
  could not be executed after external command approvals were exhausted.
- No AWS deployment, live header check, OAuth provider callback, WAF test,
  budget test, ECR scan, or two-tenant isolation test was performed.

## Required external closure

1. Run the new CI security job and require it before staging deployment.
2. Verify the GitHub `staging` Environment with repository-admin access,
   restrict deployment branches to `main`, and record the reviewer policy.
3. Configure `AlarmTopicArn`, AWS Budgets notifications, and CloudFront WAF
   rate-based rules.
4. Decide and implement CloudFront-only authenticated origin access; WAF does
   not cover the currently public Function URL (`infra/template.yaml:64`).
5. Enable and verify ECR/Inspector scanning and preserve the SBOM per release.
6. Execute the two-tenant isolation procedure in `SECURITY.md`.
7. Plan and test the supported Next.js major upgrade.
