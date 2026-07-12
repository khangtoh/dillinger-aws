# infra/ — what deploys what

> For the runtime story these pieces add up to (Docker image →
> Firecracker microVM, cold starts, isolation), see
> [`ARCHITECTURE.md`](../ARCHITECTURE.md).

| Piece | Purpose |
|---|---|
| `template.yaml` | Per-tenant SAM stack: one container-image Lambda + Function URL + log group. Deployed once per tenant as `dillinger-<tenant-id>`. |
| `provision-tenant.sh` | The one deploy path for a tenant (used identically by humans and CI): `sam build` → `sam deploy` → second deploy pass to set `NEXT_PUBLIC_BASE_URL` → records the tenant in `tenants.json` → registers its gateway route if the gateway exists. |
| `gateway/` | Shared CloudFront single-entry gateway (see `gateway/README.md`). |
| `register-tenant-route.sh` | Writes `tenant-id → Function URL` into the gateway's KeyValueStore. |
| `deprovision-tenant.sh` | The inverse of `provision-tenant.sh`: removes one tenant's gateway route, ECR repo, stack + SAM companion stack, leftover log groups, and its entries in **both** registries (a tenant left in `desired-tenants.json` would just be redeployed by the next orchestrator run). Confirmation-gated; `--yes` to skip. |
| `orchestrator/` | Phase 11 pipeline: credentials → desired state → actual state → sync (see `spec/11-deployment-orchestrator/`). |
| `bootstrap/` | Stand up / drift-sync / tear down an entire AWS account (IAM templates + scripts — see `bootstrap/README.md` for the account-switch runbook). |
| `deployment-model.json`, `desired-tenants.json` | Human-edited desired state the orchestrator resolves. |
| `tenants.json` | Registry of actually-provisioned tenants (written by `provision-tenant.sh`). |

## Where S3 fits (and where it deliberately doesn't)

S3 has exactly **one** role in this project: it is the **SAM deployment
artifact bucket** — plumbing for `sam deploy`, nothing more.

When `provision-tenant.sh` runs `sam deploy --resolve-s3`, the SAM CLI
maintains a small companion CloudFormation stack
(`aws-sam-cli-managed-default`) containing one auto-named bucket
(`aws-sam-cli-managed-default-samclisourcebucket-<random>`). On every
deploy, SAM uploads the processed CloudFormation **template** there and
points the CloudFormation service at that copy. That's the entire data
flow — deploy-time metadata, never request-time data.

What S3 is **not** used for, by design:

- **No application data.** Dillinger keeps all document state
  client-side (Zustand + localStorage); the Lambda serves a stateless
  app. Nothing a user types is ever written to S3 (or any server-side
  store) — see `spec/README.md` non-goals and
  `spec/09-multi-tenancy.md`'s "stateless single-tenant instance"
  model.
- **No static asset hosting.** `_next/static/*` ships inside the
  container image and is served by the Lambda itself (cached by
  CloudFront at the gateway, when routed through it).
- **No container images.** Those go to ECR
  (`--resolve-image-repos`), not S3.

The IAM deploy policy mirrors this narrow role: `s3:*` is allowed
**only** on `arn:aws:s3:::aws-sam-cli-managed-default-samclisourcebucket-*`
(the spec's Phase 1 draft prescribed exactly this scope). The wildcarded
actions are deliberate — SAM manages the bucket's full lifecycle
(create, tag, encrypt, version, lifecycle-rule, and delete on rollback),
and enumerating those actions one AccessDenied at a time proved brittle
in practice (policy v1–v4 history in `spec/01-aws-account-onboarding.md`).
The bucket-name pattern is the security boundary: it can only ever match
SAM's own artifact buckets.
