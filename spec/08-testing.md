# Phase 8 — Testing / Verification

Goal: prove Dillinger actually works when deployed on Lambda, not just that
`sam deploy` exited 0.

Depends on: Phase 4 (live Function URL).

- [ ] Smoke test: `curl -I <Function URL>` returns `200`/`3xx`, not a
      Lambda/API Gateway error payload.
- [ ] Open the Function URL in a real browser; confirm the page loads and
      the Monaco editor renders.
- [ ] Type markdown in the editor and confirm the live preview updates.
- [ ] Confirm static assets (`_next/static/*`) load with 200 status and
      reasonable cache headers.
- [ ] Request an unknown route and confirm a sane 404 (not a raw Lambda
      error).
- [ ] Measure cold-start latency (first request after ~15 min idle) and
      record it in this file.
- [ ] Measure warm-request latency and record it in this file.
- [ ] Run the upstream unit test suite (`npm run test`) against the built
      app as a regression check (doesn't require Lambda itself).
- [ ] If Playwright E2E tests are wired up, run them with
      `PLAYWRIGHT_BASE_URL` pointed at the live Function URL.
- [ ] If Phase 5 OAuth providers were enabled, test each configured login
      flow end-to-end; otherwise mark N/A.
- [ ] If Phase 6 PDF export was enabled, test it end-to-end; otherwise mark
      N/A.
- [ ] Once everything above passes: check the "Dillinger is live on AWS
      Lambda" box in `spec/README.md` and fill in the Function URL.

## Results log

_(append dated entries here as tests are run, e.g. "2026-07-09: cold start
~2.1s, warm ~120ms, Function URL https://... — all core checks pass")_
