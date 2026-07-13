# Dillinger on AWS Lambda: from a Dockerfile to a Firecracker microVM

How a Next.js markdown editor ends up executing inside a hardware-
virtualized microVM, and why almost none of the usual container-hosting
machinery (Docker daemon, ECS, Kubernetes, EC2) is involved at runtime.

Companion docs: [infra/README.md](infra/README.md) (what deploys what),
[infra/gateway/README.md](infra/gateway/README.md) (edge routing),
[.github/workflows/README.md](.github/workflows/README.md) (how the
image gets built), [spec/02-architecture-plan.md](spec/02-architecture-plan.md)
(the original decisions). Latency figures below are real measurements
from the live `staging` tenant (2026-07-11, ap-southeast-1).

## The one-sentence version

Docker is used **only as a packaging format at build time**; at runtime
there is no Docker anywhere — AWS Lambda unpacks the image into a
block-level lazy-loaded filesystem and boots it inside a dedicated
**Firecracker microVM** with its own guest kernel, one microVM per
concurrent request environment, none shared across tenants.

## Build time: Docker as a packaging format

```
Dockerfile (multi-stage)
├─ builder stage: node:20-bookworm-slim
│    npm ci → npm run build          Next.js `output: 'standalone'` -
│                                    a self-contained server.js + the
│                                    minimal node_modules it needs
└─ runtime stage: node:20-bookworm-slim
     + NSS/X11 shared libs           for @sparticuz/chromium (PDF export);
                                     its binary targets Amazon Linux,
                                     which ships these - slim Debian doesn't
     + /opt/extensions/lambda-adapter  AWS Lambda Web Adapter, copied from
                                     public.ecr.aws - see "runtime" below
     + .next/standalone, .next/static, public
     CMD ["node", "server.js"]       completely stock Next.js start
```

Two things worth noticing:

1. **The app is unmodified.** No Lambda handler, no SDK, no
   `exports.handler`. `server.js` listens on port 3000 exactly as it
   would on any host. Everything Lambda-specific lives in the adapter
   binary at `/opt/extensions/lambda-adapter`.
2. **This image runs anywhere.** `docker run -p 3000:3000` on a laptop
   serves the same app — Lambda compatibility is additive, not invasive.

The build itself runs on GitHub Actions (this project's dev sandbox has
no Docker), pushed to ECR by `sam deploy --resolve-image-repos`.

## Ship time: what Lambda actually does with a container image

This is where the mental model diverges sharply from Docker hosting.
Lambda does **not** `docker pull` at cold start — pulling a multi-GB
image per cold start would take tens of seconds. Instead, at
`CreateFunction`/`UpdateFunctionCode` time, Lambda:

1. Pulls the image from ECR **once**, flattens all layers into a single
   filesystem image;
2. Chunks it into **512 KiB blocks**, deduplicated across all customers
   (convergent encryption — identical blocks of, say, the shared
   `node:20-bookworm-slim` base encrypt to identical ciphertext without
   revealing content across accounts);
3. Distributes blocks into a **three-tier cache**: per-worker local
   cache → AZ-level shared cache → S3 as the origin.

At cold start, the microVM mounts that filesystem and **lazily pages in
only the blocks actually read**. A 1–2 GB image whose process touches
200 MB of files costs roughly the I/O of 200 MB, mostly from warm
caches. This is why our image-size anxiety (Chromium, node_modules) has
much less cold-start impact than intuition suggests — and why adding
~100 MB of NSS libraries for PDF export didn't move the editor's cold
start measurably.

(Reference: Brooker et al., *"On-demand Container Loading in AWS
Lambda"*, USENIX ATC 2023.)

## Runtime: the Firecracker microVM

Firecracker is AWS's open-source virtual machine monitor: KVM-based
hardware virtualization with a deliberately tiny device model (virtio
net/block, a serial console, and almost nothing else — no PCI, no USB,
no GPU). A microVM boots in ~125 ms with <5 MB of VMM overhead, which
is what makes "a real VM per request environment" economically sane.

The key structural facts for this project:

- **One execution environment = one microVM.** Each environment handles
  **one request at a time**; concurrent requests fan out to more
  microVMs. Between requests the environment is *frozen* (no CPU
  scheduled) and *thawed* on the next invoke — which is why background
  timers/queues inside Next.js can't be relied on, and why the app
  being stateless (all document state in the browser's localStorage)
  fits Lambda so naturally.
- **The container supplies userland only.** Our Debian-bookworm image
  contents run on **Lambda's own Amazon Linux guest kernel** inside the
  microVM — you get bookworm's glibc and shared libraries, but not its
  kernel. (This is visible in practice: `uname` reports Amazon Linux,
  while library resolution is pure Debian.)
- **`/tmp` is per-microVM ephemeral scratch** (512 MB default). This is
  where `@sparticuz/chromium` decompresses its Brotli-packed browser on
  first use — the dominant cost of the first PDF export — and the
  extraction survives across invokes *within the same environment*,
  which is why the second PDF is 13× faster.
- **No inbound network.** The microVM cannot be dialed; requests only
  arrive as invoke events through Lambda's control plane. The Function
  URL endpoint (`*.lambda-url.*.on.aws`) is AWS infrastructure that
  turns an HTTPS request into an invoke event — TLS terminates before
  our code, and there is nothing to port-scan.

### Inside the microVM: two processes

```
Lambda invoke event (HTTP request, JSON-encoded)
        │
        ▼
/opt/extensions/lambda-adapter      (AWS Lambda Web Adapter)
        │  implements the Lambda Runtime API loop; on init it
        │  polls localhost:3000 until the app is ready, then per
        │  invoke: decode event → real HTTP request → re-encode
        │  the HTTP response as the invoke result
        ▼
node server.js                      (stock Next.js standalone server)
        listening on localhost:3000, oblivious to Lambda
```

The adapter is what buys "run any web framework on Lambda unmodified."
It also answers a subtle question we verified empirically: Lambda's
reserved env vars (`AWS_EXECUTION_ENV` et al.) **are present** in this
custom-image + adapter configuration — Dillinger's
`isServerlessRuntime()` check keys off it to select serverless Chromium,
and the PDF path proves it fires (its failure mode on first deploy was
*inside* that branch).

## Cold start anatomy (measured)

| Stage | Cost | Notes |
|---|---|---|
| microVM boot + env setup | ~O(100ms) | Firecracker + Lambda overhead, not directly observable to us |
| Container init → Next.js ready | **1437 ms** `Init Duration` | adapter waits for port 3000; dominated by Node + Next.js standalone boot |
| First editor request, total wall time | ~2 s | vs ~0.6 s warm |
| First PDF export in an environment | **14.6 s** | Chromium Brotli-decompress to `/tmp` + first browser launch (at 2048 MB; CPU scales with memory) |
| Subsequent PDF exports | **1.1 s** | extraction cached in `/tmp`, environment warm |

Consequences already applied: memory raised 1024→2048 MB (Lambda
allocates CPU proportionally — this is a CPU knob as much as a memory
knob) and timeout 15→30 s, because the *failing* cold PDF at 1024 MB
burned ~13 s of a 15 s budget.

## Isolation: why "one function per tenant" is the multi-tenancy model

The most consequential architecture decision in this repo
(`spec/09-multi-tenancy.md`): each user gets their **own CloudFormation
stack → own Lambda function → own microVM pool → own Function URL, log
group, and env vars**. Nothing is shared between tenants but the
CloudFront gateway in front (which only routes; see
`infra/gateway/README.md`).

The reason this is cheap to promise: Firecracker's VM boundary is the
**same isolation AWS uses to separate different AWS customers** on
shared Lambda fleet hardware. By mapping *tenant* to *function*, tenant
isolation is outsourced to that boundary — there is no tenant-aware
code anywhere in the app or infra to get wrong, no shared cache to
poison, no row-level security to bypass. A compromised tenant instance
contains exactly one user's (client-side-anyway) data.

Per-tenant cost of this model is near zero when idle: no reserved
instances, no per-tenant containers running overnight — an idle tenant
is just an ECR-referenced filesystem image and some metadata.

## Reserved concurrency and the microVM pool

Recall from "Runtime: the Firecracker microVM" above: **one execution
environment = one microVM, and each handles one request at a time** —
concurrency for a given tenant is entirely a question of *how many
microVMs Lambda is willing to run in parallel for that tenant's
function*. `template.yaml`'s `MaxTenantConcurrency` parameter controls
that by setting `ReservedConcurrentExecutions` on the `DillingerFunction`
resource (default `2`; range `0`-`10`, `0` meaning "don't reserve any").
When set to a positive number it's not a rate limit or a throttle in the
request-handling sense — it's a hard ceiling on the tenant's **microVM
pool size**: at `MaxTenantConcurrency=2`, a third simultaneous request
finds no free microVM and no budget to boot a new one, so Lambda
throttles it (`429`/`TooManyRequestsException`) rather than queuing it
indefinitely.

**Why reserving anything is constrained, not just a cost knob:** reserved
concurrency is carved out of the AWS account's total regional Lambda
concurrency quota, and AWS enforces a hard, account-wide floor — **at
least 10 units must always remain *unreserved*, no matter how many
functions or tenants exist.** This isn't configurable; it's a platform
invariant. This project hit it directly, twice: deploying a second
tenant (a per-branch tenant alongside the existing `staging` tenant, each
defaulting to `MaxTenantConcurrency=2`) failed CloudFormation creation
with:

```
Specified ReservedConcurrentExecutions for function decreases account's
UnreservedConcurrentExecution below its minimum value of [10].
```

The first fix attempt — deploy the new tenant at `MaxTenantConcurrency=1`
instead of the default `2` — **failed identically**. That's the
diagnostic signal that matters: if even the smallest possible positive
reservation (the template enforced `MinValue: 1` at the time) still
violates the floor, the account's total quota has *zero* headroom for
another reservation at all, not just insufficient headroom for a large
one. Working the inequality backward (`total_quota − staging's 2 − N ≥
10`, failing at `N=1`) puts this account's actual total Lambda
concurrency quota at around **12** — far below AWS's normal default of
1000, consistent with a constrained sandbox/dev account rather than a
production one.

**The actual fix: skip the reservation entirely for dev-stage tenants**
(`MaxTenantConcurrency=0`, now a valid template value — `MinValue`
lowered from `1` to `0`, `ReservedConcurrentExecutions` wrapped in a
CloudFormation `Fn::If`/`AWS::NoValue` so it's omitted from the resource
altogether rather than set to a degenerate `0`, and the "reached its
concurrency cap" alarm skipped via the same condition since there's no
cap to alarm on). A function with no `ReservedConcurrentExecutions`
draws from the account's **shared unreserved pool** instead of carving
out a dedicated slice — this sidesteps the ≥10-unreserved-floor check
entirely, because nothing is being reserved. **Why this is the right
call at this stage, not just a workaround:** reserved concurrency exists
to *guarantee* a tenant's microVM pool regardless of what every other
function in the account is doing — a real isolation/cost-bounding
property that matters once tenants have paying, expectant users. In
development, with a small number of low-traffic tenants sharing one
constrained-quota account, that guarantee has no one to protect against
yet — the shared pool is more than sufficient, and reserving anything
just fights the account's own quota for no present benefit. Revisit
(re-enable a positive `MaxTenantConcurrency` per tenant) once either the
account's quota is raised via AWS Service Quotas, or real, concurrent,
externally-facing users make the isolation guarantee worth its cost
again — `staging`'s own reservation (still `2`, untouched by this
change) is the template for what that looks like.

## Docker hosting vs. what actually runs

| | Docker on a host (ECS/EC2/K8s) | Lambda + Firecracker (this project) |
|---|---|---|
| Isolation boundary | kernel namespaces/cgroups, shared kernel | hardware virtualization, per-VM guest kernel |
| The image at runtime | pulled + unpacked on host, run by a container runtime | pre-chunked at deploy; blocks lazily paged into the microVM |
| Docker daemon | yes | none anywhere |
| Concurrency per instance | many requests per container | exactly 1 per microVM; scale = more microVMs |
| Idle cost | container runs 24/7 | zero (frozen envs reaped; nothing runs) |
| Lifecycle between requests | process keeps running | frozen (no CPU), thawed on invoke |
| Inbound network | host ports exposed | none; invokes only, TLS terminated upstream |
| State on disk | volumes possible | `/tmp` scratch, gone with the environment |

## Constraints this design accepts (and why they're fine here)

- **6 MB response cap** (Function URL, `BUFFERED` mode): largest
  responses are exported PDFs (~20 KB for typical documents); pages and
  assets are far below it.
- **One request per environment**: requests are short (~0.6 s warm);
  a burst of concurrent editors just fans out to more microVMs.
- **No server-side persistence**: by design — Dillinger keeps documents
  in the browser (Zustand + localStorage). The Lambda is a stateless
  renderer; killing every environment loses nothing.
- **Freeze/thaw**: no background jobs exist to break.
- **x86_64 only for now**: arm64 would be cheaper, but Lambda Web
  Adapter + `@sparticuz/chromium` compatibility on arm64 was left
  unverified deliberately (spec/02); revisit if cost matters.

## End-to-end request path (both entry points)

```
A) Direct (live today):
   browser ──HTTPS──▶ Function URL ──invoke──▶ microVM ──▶ adapter ──▶ next.js

B) Via gateway (wired; awaits a custom domain):
   browser ──▶ <tenant>.dillinger.<domain> ──▶ CloudFront edge
        ──viewer-request fn + KVS lookup──▶ that tenant's Function URL
        ──invoke──▶ that tenant's microVM ──▶ adapter ──▶ next.js
```

The gateway adds tenant routing and CDN caching of `_next/static/*`
but changes nothing below the Function URL line — the microVM story is
identical either way.
