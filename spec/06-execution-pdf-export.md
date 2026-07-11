# Phase 6 — PDF Export via Puppeteer/Chromium

Goal: get Dillinger's Puppeteer-based PDF export feature working on
Lambda. **Update per spec/02's architecture decision:** upstream already
ships `@sparticuz/chromium` as a dependency specifically for
serverless/Lambda-style Chromium, so this is folded into the main
container build and attempted enabled-by-default in v1, not deferred or
gated on asking the user "is this needed" — only fall back to disabling it
if image size/memory/timeout make it impractical once actually tested.

Depends on: Phase 4 (base deployment working).

- [x] Decided (spec/02): ship enabled by default in v1, not
      confirm-then-maybe-add. No separate dependency-add task needed here
      — `@sparticuz/chromium` and `puppeteer-core` are already in the
      vendored `package.json` (see `VENDOR.md`).
- [x] Read `lib/pdf.ts`'s serverless detection: `isServerlessRuntime()`
      checks `process.env.VERCEL || process.env.AWS_EXECUTION_ENV`.
      `AWS_EXECUTION_ENV` is one of Lambda's reserved/auto-set env vars
      and should be present for container-image functions too, which
      would mean **zero Dillinger-specific code changes needed** for
      `@sparticuz/chromium` to kick in automatically. **Not fully
      verified** — our setup runs a custom `node:20-bookworm-slim` image
      (not one of AWS's own base images) via the Lambda Web Adapter, and
      whether `AWS_EXECUTION_ENV` gets set in that specific configuration
      needs confirming against a real deployment, not just documentation.
      Added as an explicit check in the task below rather than assumed.
- [x] Once deployed (Phase 4): confirm `AWS_EXECUTION_ENV` is actually
      present in the running container (e.g. log
      `process.env.AWS_EXECUTION_ENV` once). If it's *not* set in this
      custom-image + Lambda Web Adapter configuration, set it explicitly
      via the `Environment.Variables` block in `infra/template.yaml`
      (e.g. `AWS_EXECUTION_ENV: "AWS_Lambda_nodejs20.x"`) so
      `isServerlessRuntime()` still resolves correctly — cheaper than
      patching the vendored app code. Confirmed indirectly 2026-07-11:
      the first live PDF attempt failed *inside* the
      `@sparticuz/chromium` launch path ("/tmp/chromium: error while
      loading shared libraries"), which only executes when
      `isServerlessRuntime()` is true — so `AWS_EXECUTION_ENV` is set
      in this configuration and no template change was needed.
- [x] Increase the Lambda function's memory (e.g. to 2048–3008 MB) and
      timeout (e.g. to 30s) in `infra/template.yaml` to accommodate
      Chromium cold starts — as a separate function if it would otherwise
      bloat the main editor function's cold start. Done: 2048MB/30s
      (single function; editor cold start stayed fast — Init Duration
      1437ms — so no split needed). The old 1024MB/15s budget was
      actually exceeded by the failing PDF attempt (~13s).
- [x] Rebuild the container image with the Chromium dependency included
      and confirm the image size stays under Lambda's 10 GB limit. Done —
      plus the NSS/X11 shared libraries `@sparticuz/chromium` needs at
      runtime, which `node:20-bookworm-slim` lacks (its binary targets
      Amazon Linux; failure mode was "libnspr4.so: cannot open shared
      object file"). See the Dockerfile's runtime stage. Deploys fine
      (well under the limit).
- [x] `sam deploy` and invoke the PDF export endpoint end-to-end; confirm a
      valid PDF is returned. Confirmed 2026-07-11: POST
      `/api/export/pdf` returns HTTP 200, `application/pdf`, valid
      `%PDF-1.4` payload (19.6KB for the test doc). Markdown and HTML
      export routes also verified 200.
- [x] Measure and record cold-start latency for the PDF path; decide with
      the user whether it's acceptable or needs provisioned concurrency.
      Measured: **14.6s cold** (first Chromium launch in a fresh
      sandbox), **1.1s warm**. Discussed with the user 2026-07-11
      (they questioned whether PDF export should exist at all; decision:
      keep it — it's an upstream user-visible feature and the fix was
      already landing). No provisioned concurrency for v1; revisit only
      if real usage complains about the cold path.
