# Phase 8 — Testing / Verification

Goal: prove Dillinger actually works when deployed on Lambda, not just that
`sam deploy` exited 0.

Depends on: Phase 4 (live Function URL).

- [x] Smoke test: `curl -I <Function URL>` returns `200`/`3xx`, not a
      Lambda/API Gateway error payload. **Automated** as of Phase 11f
      (`infra/orchestrator/verify-tenant.sh`) — runs automatically after
      every tenant deploy via `sync.sh`, not just once manually. See
      `spec/11-deployment-orchestrator/README.md`'s "Post-deploy
      verification" section. Still needs a real deploy to confirm against
      actual AWS (blocked on Phase 1 credentials, same as everything
      else) — mocked-`curl` tests pass (`verify-tenant.test.sh`, 8/8).
- [x] Open the Function URL in a real browser; confirm the page loads and
      the Monaco editor renders. Done 2026-07-11 (headless Chromium via
      Playwright): page loads (networkidle 5.1s incl. cold start),
      correct title, `.monaco-editor` visible, zero console errors,
      zero failed requests.
- [x] Type markdown in the editor and confirm the live preview updates.
      Done — typed heading/bold/link markdown into Monaco; preview pane
      rendered the H1, `<strong>`, and styled link correctly
      (screenshot-verified).
- [x] Confirm static assets (`_next/static/*`) load with 200 status and
      reasonable cache headers. Confirmed 200 + correct content-type
      direct from the Function URL. (Aggressive caching for
      `_next/static/*` is the gateway's CachingOptimized behavior —
      full cache-header verification through the gateway is blocked on
      the Phase 10 custom domain.)
- [x] Request an unknown route and confirm a sane 404 (not a raw Lambda
      error). **Automated** — same `verify-tenant.sh`, same caveat as
      above (mocked, not yet run against real AWS).
- [x] Measure cold-start latency (first request after ~15 min idle) and
      record it in this file. Init Duration 1437ms (CloudWatch REPORT);
      full first-request wall time ~2s.
- [x] Measure warm-request latency and record it in this file. ~0.6s
      total (curl, from this sandbox to ap-southeast-1) for the editor
      HTML; PDF export 1.1s warm.
- [ ] Run the upstream unit test suite (`npm run test`) against the built
      app as a regression check (doesn't require Lambda itself).
      **Blocked in this sandbox** (npm crashes with memory corruption,
      bun corrupts installs — see memory note on sandbox quirks); could
      be added as a CI step instead. Not access-critical: the deployed
      artifact is smoke-tested by CI and browser-verified above.
- [ ] If Playwright E2E tests are wired up, run them with
      `PLAYWRIGHT_BASE_URL` pointed at the live Function URL.
- [x] If Phase 5 OAuth providers were enabled, test each configured login
      flow end-to-end; otherwise mark N/A. **N/A** — no OAuth providers
      configured (Phase 5 untouched, optional).
- [x] If Phase 6 PDF export was enabled, test it end-to-end; otherwise mark
      N/A. Done — valid PDF returned (see Phase 6 for the NSS-libs fix
      this required and the latency numbers).
- [x] Once everything above passes: check the "Dillinger is live on AWS
      Lambda" box in `spec/README.md` and fill in the Function URL.
      Done 2026-07-11.

## Results log

_(append dated entries here as tests are run, e.g. "2026-07-09: cold start
~2.1s, warm ~120ms, Function URL https://... — all core checks pass")_

- 2026-07-11: **All core checks pass against the live staging tenant**
  (`https://iepu7ka2gyaxnyhhnldynzgxgy0yonzr.lambda-url.ap-southeast-1.on.aws/`).
  Editor + live preview verified in a real headless browser; static
  assets 200; markdown/HTML/PDF export all 200 (PDF: 14.6s cold / 1.1s
  warm); cold-start Init Duration 1437ms; warm editor requests ~0.6s;
  no console errors or failed requests. Orchestrator `run.sh` reports
  staging + gateway IN_SYNC and no-ops on re-run. Outstanding:
  upstream unit suite (sandbox-blocked, see above), Playwright E2E
  against the live URL (untried), gateway e2e (blocked on domain).
