# Phase 10 — Single Entry Gateway for Multiple Single-Tenant Instances

Requirement (added by user): serve all single-tenant instances
(`spec/09-multi-tenancy.md`) behind **one entry point**, instead of
handing each user a random `*.lambda-url.<region>.on.aws` address with no
shared front door.

Depends on: Phase 9 (tenants are provisioned as isolated Lambda functions
with their own Function URLs — this phase fronts them, it doesn't change
how they're deployed).

## Architecture decision

**Chosen:** one CloudFront distribution as the single gateway, with a
CloudFront Function doing **dynamic origin selection per request**,
keyed by subdomain, backed by a CloudFront KeyValueStore (KVS) that maps
`tenant-id -> that tenant's Function URL domain`. This is AWS's documented
pattern for exactly this "one CDN, route to N origins by tenant" shape:

```
https://<tenant-id>.dillinger.<your-domain>
        │
        ▼
  CloudFront distribution (the one gateway)
        │  viewer-request: CloudFront Function reads Host header,
        │  looks up tenant-id in the KeyValueStore, calls
        │  request.origin = { custom: { domainName: <tenant's Function URL> } }
        ▼
  Tenant's own Lambda Function URL (unchanged, still isolated per Phase 9)
```

Why this over the alternatives:
- **Not** a router Lambda that reverse-proxies every request to the right
  tenant Lambda: that doubles Lambda invocations (cost + latency) and
  means hand-rolling HTTP proxying (streaming bodies, headers, cookies)
  correctly — CloudFront already does this natively as a CDN/reverse
  proxy.
- **Not** Lambda@Edge for the routing logic: CloudFront Functions are
  cheaper, faster (sub-millisecond, run at every edge location), and the
  KeyValueStore is purpose-built for exactly this kind of "small, frequently
  read by an edge function" data — no per-request network hop to a
  database.
- **Not** one CloudFront distribution or API Gateway custom domain per
  tenant: that doesn't give a single entry point and doesn't scale
  operationally (every new user would need new DNS + cert + distribution).
- Registering a tenant is then just: deploy their stack (Phase 9), then
  write one key into the shared KVS. No redeploying the gateway itself
  per tenant.

Routing key is the **subdomain** (`<tenant-id>.dillinger.<domain>`), not a
path prefix — this keeps each tenant's app running at its own origin root
(no path-rewriting needed inside Dillinger itself, which has no built-in
concept of a base path) and gives users a clean, memorable per-tenant URL.

## Open input needed from the user

- [ ] **A real domain name** to use for the wildcard
      (`*.dillinger.<your-domain>` or similar) — can't provision Route53 /
      ACM without knowing it. Everything else in this phase can be built
      and reasoned about without it; only the final DNS cutover needs it.

## Tasks

- [x] Write the CloudFront Function (`infra/gateway/router.js`): reads
      the `Host` header, extracts the subdomain as `tenant-id`, looks it
      up in the associated KeyValueStore, and rewrites
      `request.origin.custom.domainName` to that tenant's Function URL
      domain. Returns 404 for unknown subdomains. Requires the
      `cloudfront-js-2.0` runtime (KVS access is async, only supported
      there).
- [x] Write `infra/gateway/template.yaml` (separate stack from per-tenant
      stacks — this is shared, account-level infra deployed once):
      `AWS::CloudFront::KeyValueStore`, `AWS::CloudFront::Function` (with
      `KeyValueStoreAssociations` wired to the KVS), and
      `AWS::CloudFront::Distribution` with a placeholder default origin
      (overridden per-request by the function) and the function attached
      as a `viewer-request` function association on the default cache
      behavior.
- [x] Add `infra/register-tenant-route.sh <tenant-id> <function-url>` —
      writes/updates the tenant's entry in the CloudFront KVS (handles the
      required ETag-based optimistic-concurrency `put-key` call).
- [x] Wire `infra/provision-tenant.sh` to call
      `register-tenant-route.sh` after a tenant deploy, gated on the
      gateway stack actually existing (so Phase 4/9 tenant provisioning
      still works standalone before the gateway is deployed).
- [x] Validate `infra/gateway/template.yaml` — `sam validate --lint`
      passes (added a `cfn-lint` `ignore_checks: [W1030]` for the
      intentional-empty-default `AcmCertificateArn` parameter, documented
      inline in the template). Real deploy still needs Phase 1 credentials.
- [ ] Once a domain is known: request an ACM certificate in `us-east-1`
      for `*.dillinger.<domain>` (DNS validation), add it to the
      CloudFront distribution's `ViewerCertificate`, and create a Route53
      wildcard `A`/`ALIAS` record pointing at the distribution.
- [ ] Deploy the gateway stack (`sam deploy` /
      `aws cloudformation deploy` against `infra/gateway/template.yaml`).
- [ ] Register the existing tenant(s) from `infra/tenants.json` into the
      KVS (re-run `register-tenant-route.sh` for each, or re-run
      `provision-tenant.sh` which now does it automatically).
- [ ] End-to-end test: hit `https://<tenant-id>.dillinger.<domain>` and
      confirm it serves that tenant's Dillinger instance; hit an unknown
      subdomain and confirm a clean 404, not a CloudFront/origin error
      page.
- [ ] Test that two tenants' subdomains resolve to two different
      instances through the same gateway (proves the "one entry point,
      isolated backends" property this phase exists for).
- [ ] Decide caching behavior: Dillinger's HTML responses are dynamic
      per-session (cookies) — confirm `CachePolicyId` is set to
      `CACHING_DISABLED` (or a policy that respects `Vary`/cookies) so
      CloudFront doesn't serve one tenant's/user's cached response to
      another. Static `_next/static/*` assets are content-hashed and safe
      to cache aggressively — consider a second cache behavior for that
      path pattern once the base routing is verified working.
