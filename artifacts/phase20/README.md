# Phase 20 visual evidence

This directory contains evidence for
[`spec/20-clean-visual-rebrand.md`](../../spec/20-clean-visual-rebrand.md).

## `before/`

These images intentionally capture the legacy Dillinger visual identity before
Phase 20 implementation. They are historical comparison evidence, **not**
future screenshot baselines or styling authority.

The required viewport/theme files are:

- `editor-1440x900-light.png`
- `editor-1440x900-dark.png`
- `editor-768x1024-light.png`
- `editor-768x1024-dark.png`
- `editor-390x844-light.png`
- `editor-390x844-dark.png`

The required open-state files are:

- `state-sidebar-open.png`
- `state-export-menu.png`
- `state-command-palette.png`
- `state-settings-dialog.png`
- `state-cloud-provider-dialog.png`
- `state-toast.png`
- `state-keyboard-shortcuts.png`

Run `python3 artifacts/phase20/capture_before.py --base-url <tenant-url>` to
regenerate the set. The script seeds a deterministic local document/profile,
waits for the client editor to hydrate, disables decorative motion, and retries
transient Lambda/static-asset load failures.

## Audit and matrix

- [`baseline-audit.md`](baseline-audit.md) records the legacy token/value/font
  inventory, Astryx override debt, removal order, and palette contrast finding.
- [`route-state-matrix.md`](route-state-matrix.md) defines the complete `after`
  capture contract for editor states, overlays, routes, and viewports.

## Static shell direction

[`prototype.html`](prototype.html) renders the proposed clean-break shell at
desktop and mobile sizes. The images under [`prototype/`](prototype/) were
accepted when implementation continued on 2026-07-19 and remain the visual
direction for the application-shell migration.

## Final after matrix

[`after/matrix/`](after/matrix/) is the canonical completed Phase 20 visual
evidence. It contains 126 screenshots across all 39 IDs in the route/state
matrix, with desktop light/dark plus tablet/mobile variants wherever the
layout differs. [`capture-results.json`](after/matrix/capture-results.json)
records the exact capture manifest.

Run `python3 artifacts/phase20/capture_after.py` against the local production
acceptance server on `127.0.0.1:3005` to regenerate it. Deterministic-only
loading and application-error query states require that server to be started
with `PHASE20_VISUAL_TEST=1`; production deployments do not enable that flag.

The final matrix was regenerated on 2026-07-20 after lint, typecheck, unit /
coverage, production build, 43 repository E2E tests, and five focused visual /
accessibility scenarios passed. A final human spot-check covered the default
workspace, light/dark modes, mobile navigation, content routes, and exceptional
states and confirmed a clean visual break from the legacy Dillinger UI.

## Live branch deployment

[`live/`](live/) is the compact live-product handoff to Phase 18. It contains
desktop light/dark, tablet, and mobile screenshots from the branch tenant plus
[`verification-results.json`](live/verification-results.json). The manifest
records the owned token values, Geist font, dark/light class behavior, absence
of sampled legacy computed colors, no horizontal overflow, a persistent
server-rendered dark theme in a fresh session, the branded live 404, and zero
console errors or failed network requests.

Regenerate the live evidence with:

```sh
python3 artifacts/phase20/verify_live.py --base-url <tenant-url>
```

The synthetic loading and application-error hooks remain local-only by design:
they are compiled behind `PHASE20_VISUAL_TEST=1` and are covered by the five
focused local browser scenarios. Production verification exercises only real
routable states.
