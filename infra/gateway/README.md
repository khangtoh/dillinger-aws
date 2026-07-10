# Gateway: single entry point for all tenant instances

This directory is the shared, account-level gateway stack
(`dillinger-gateway`, deployed once to **us-east-1** — a CloudFront
requirement, unrelated to where tenants run). It fronts every isolated
single-tenant Dillinger Lambda instance with one CloudFront
distribution. For *why this design* was chosen over the alternatives
(router Lambda, Lambda@Edge, distribution-per-tenant), see
[spec/10-gateway.md](../../spec/10-gateway.md); this file documents
*what each resource does* and *how a request actually reaches a
tenant's Lambda microVM*.

## The three resources and why each exists

| Resource | Name | Why it's needed |
|---|---|---|
| `AWS::CloudFront::Distribution` | (gateway) | The single entry point. Terminates TLS, runs at every edge location, and natively does the reverse-proxying (streaming, headers, cookies) that a hand-rolled router Lambda would have to reimplement — while adding CDN caching for static assets. |
| `AWS::CloudFront::Function` | `dillinger-tenant-router` | CloudFront can't route to a *dynamic* origin on its own — a distribution's origins are fixed at deploy time, but tenants come and go without redeploying the gateway. This function runs at **viewer-request** on every request, extracts the tenant id from the `Host` subdomain, and rewrites `request.origin` to that tenant's own Lambda Function URL. Unknown tenants get a clean 404 at the edge without touching any origin. |
| `AWS::CloudFront::KeyValueStore` | `dillinger-tenant-routing` | The function needs a `tenant-id → Function URL domain` lookup table it can read in sub-milliseconds at every edge location. KVS is purpose-built for exactly this (small, edge-replicated, readable from CloudFront Functions via `cf.kvs()`); a database would add a network hop per request. Registering a tenant is one `put-key` call (`infra/register-tenant-route.sh`) — the gateway itself is never redeployed for new tenants. |

## How a request reaches a tenant's Lambda microVM

```
https://alice.dillinger.example.com/some/page
  │
  │ 1. DNS: wildcard *.dillinger.example.com → CloudFront distribution
  ▼
CloudFront edge location (nearest to the viewer)
  │ 2. TLS terminates; viewer-request fires dillinger-tenant-router
  │    (router.js): tenantId = "alice" (first Host label)
  │ 3. cf.kvs().get("alice") → "abc123.lambda-url.ap-southeast-1.on.aws"
  │    (miss → 404 "Unknown tenant" returned at the edge, no origin hit)
  │ 4. request.origin rewritten to that domain; Host header rewritten
  │    too (Function URLs reject mismatched Host)
  │ 5. Cache check: HTML/API paths use CachingDisabled (never shared
  │    across tenants/users); _next/static/* uses CachingOptimized
  │    (Next.js content-hashes those filenames, so they're immutable)
  ▼
Tenant's Lambda Function URL (per-tenant stack, infra/template.yaml)
  │ 6. The Lambda service receives the HTTPS request and turns it into
  │    an invoke event for that tenant's function — each tenant is its
  │    own function, so isolation is enforced by AWS at this boundary
  │ 7. Cold start: the service pulls the container image (from ECR) and
  │    boots it inside a dedicated Firecracker microVM; warm start:
  │    an existing microVM for *this function only* is reused. Tenants
  │    never share a microVM — that's the per-instance isolation model
  │    (spec/09-multi-tenancy.md)
  ▼
Inside the microVM (one container, two processes)
  │ 8. AWS Lambda Web Adapter (an extension in the image, Dockerfile)
  │    receives the invoke event and replays it as a plain HTTP request
  │    to localhost:3000
  │ 9. The stock Next.js standalone server (server.js, unmodified)
  │    handles it like any HTTP request and responds
  ▼
Response flows back: LWA → invoke response → Function URL → CloudFront
(cached if _next/static/*) → viewer
```

Key property: nothing in Dillinger's code knows any of this exists. The
app sees ordinary HTTP on port 3000; tenant isolation is enforced by
AWS's function boundary (one function + microVM pool per tenant), and
tenant selection happens entirely at the CloudFront edge.

## Operational notes

- **`router.js` is duplicated inline in `template.yaml`**:
  `AWS::CloudFront::Function` requires literal code and can't reference
  a file. If you change one, change both — diff them before deploying.
- **Deployed 2026-07-10** via `infra/orchestrator/run.sh` (stack
  `dillinger-gateway`, us-east-1). Live at the CloudFront-assigned
  domain — recorded in `spec/README.md`. No custom domain/ACM cert yet
  (the `GatewayDomain`/`AcmCertificateArn` parameters are blank until a
  real domain exists; see the open task in spec/10-gateway.md).
- **Verified live**: hitting the distribution's own domain (whose first
  label is not a registered tenant) returns the router's clean
  `404 Unknown tenant: …` — proving the function association and KVS
  lookup work. The happy path (a registered tenant resolving to a real
  instance) is untestable until the first tenant is provisioned.
