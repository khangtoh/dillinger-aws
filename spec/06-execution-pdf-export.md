# Phase 6 — PDF Export via Puppeteer/Chromium (optional/stretch)

Goal: restore Dillinger's Puppeteer-based PDF export feature on Lambda.
Deferred out of the v1 critical path (see Phase 2) because headless
Chromium on Lambda needs extra memory/timeout/binary handling that
shouldn't block getting the core editor live first.

Depends on: Phase 4 (base deployment working).

- [ ] Confirm with the user whether PDF export is actually needed for v1,
      or whether it can stay disabled indefinitely.
- [ ] If needed: add `@sparticuz/chromium` (or `@sparticuz/chromium-min`)
      as a dependency and point `puppeteer-core`'s `executablePath` at it
      when running on Lambda (env-detect vs local dev).
- [ ] Increase the Lambda function's memory (e.g. to 2048–3008 MB) and
      timeout (e.g. to 30s) in `infra/template.yaml` to accommodate
      Chromium cold starts — as a separate function if it would otherwise
      bloat the main editor function's cold start.
- [ ] Rebuild the container image with the Chromium dependency included
      and confirm the image size stays under Lambda's 10 GB limit.
- [ ] `sam deploy` and invoke the PDF export endpoint end-to-end; confirm a
      valid PDF is returned.
- [ ] Measure and record cold-start latency for the PDF path; decide with
      the user whether it's acceptable or needs provisioned concurrency.
