# 14h — Verification & Rollout

Goal: the integration gate for this phase. Confirm the rebrand is
complete (no leftover old-brand references anywhere), accessible (WCAG AA
per `CLAUDE.md`'s stated accessibility principle), visually coherent
across every surface touched by 14b–14g, and safely rolled out.

Depends on: 14b, 14c, 14d, 14e, 14f, 14g (all must be merged first — this
is the last sub-spec in the phase).

Owns: cross-cutting verification only; also finishes the token cleanup
14a deliberately deferred (removing the old literal-hex Tailwind
entries), and updates `CLAUDE.md` / `ARCHITECTURE.md`'s design-context
sections to describe the new theme instead of the old one.

## Tasks

### Completeness sweep

- [x] Full-repo grep (`35D7BB|plum|bg-sidebar|bg-navbar|bg-highlight|bg-button-save|border-settings|switchery|dropdown-link|icon-default`, `.ts`/`.tsx`/`.css`) returns **zero** matches outside `spec/` (historical record) and one intentional comment in `MonacoEditor.tsx` documenting *why* the old hex was replaced. Also found and fixed two files no earlier sub-spec's file-ownership table covered: `lib/export.ts` (the "styled HTML" export feature's embedded static CSS — 7 hex values) and `app/opengraph-image.tsx`/`public/site.webmanifest` (already caught in 14g). This grep is what actually proves "moved entirely away," not just "added a new one alongside it."
- [x] Removed the 13 dead legacy-token entries from `tailwind.config.ts`
      (`plum`, `bg-primary`, `bg-sidebar`, `bg-navbar`, `bg-highlight`,
      `bg-button-save`, `text-invert`, `text-muted`, `border-light`,
      `border-settings`, `icon-default`, `dropdown-link`, `switchery`) —
      confirmed safe only after re-running the completeness grep above
      showed zero live consumers left.
- [x] Checked for hardcoded hex duplicating a token value: found and
      fixed `lib/export.ts` (static export CSS, can't reference CSS
      vars — recolored with literal hex matching the new light-mode
      token values, same treatment as the OG image in 14g).

### Accessibility / contrast audit

- [x] **Actually computed** (Python script implementing the WCAG
      relative-luminance/contrast-ratio formula, not eyeballed) every
      pairing this task lists, both themes. Two real, measured
      failures found:
      - Light-mode `danger` (`#EF4444`) as text on `bg-canvas`: **3.76:1,
        fails** normal-text AA (needs 4.5:1). Used by Sidebar's
        "Unlink" link text.
      - Dark-mode `text-on-accent` (white) on the dark `accent` button
        fill (`#8174F0`): **3.69:1, fails**.
- [x] Both fixed at the token source, not worked around per-component:
      - `--color-danger` (light) darkened `#EF4444` → `#DC2626`
        (Tailwind red-600) → **4.83:1, passes**. Dark-mode danger
        (`#F87171`) was already passing (6.82:1), left unchanged.
      - `--color-text-on-accent` made theme-differentiated instead of
        a flat white: stays `#FFFFFF` in light mode (already passing,
        4.86:1), becomes near-black `#111113` in dark mode →
        **5.11:1, passes** — and because this only changes the
        *button-text* color, not the accent hue itself, the dark
        accent's other use as preview-pane link text (5.11:1) was
        completely unaffected by the fix.
      - Re-ran the full contrast script after both fixes: **every
        pairing passes AA**, including the delete-button combinations
        (`bg-danger` + `text-on-accent`, both themes: 4.83:1 / 6.82:1)
        and the delete-icon-on-tinted-circle non-text pairing (3.16:1
        light / 5.57:1 dark, both above the 3:1 non-text threshold).
- [x] Focus rings: `focus-ring` token traced through every consuming
      component in 14a–14g — all use `focus-visible:ring-2
      focus-visible:ring-focus-ring`, resolving to the accent hue in
      both themes, which is confirmed high-contrast against every
      surface it appears on per the audit above.
- [x] `success`/`warning`/`danger` vs. `accent` under color-vision
      deficiency: not independently simulated (no CVD-simulation
      tooling in this sandbox), but the risk is moot for the reason
      14f already found — `Toast.tsx` has no variant system at all (no
      success/warning/danger toast exists in the actual codebase to
      color-code), and the only live use of `danger` (destructive
      buttons, delete icon) always pairs the color with explicit text
      ("Delete", "Cancel") or an icon (`AlertTriangle`), never color
      alone.

### Visual regression / cross-surface coherence

- [x] Manual pass done via real Playwright + this sandbox's
      pre-installed Chromium (not skipped for lack of a browser, as
      earlier sub-specs assumed): navbar, sidebar, editor chrome,
      preview pane, and the light/dark toggle itself all confirmed
      working live in 14g. Not individually re-screenshotted here:
      the 7 modals, toasts, skeleton, keyboard-shortcuts overlay,
      404/error pages — flagging this as a real gap rather than
      claiming full coverage.
- [x] No Playwright visual/screenshot-diff tests exist in `tests/e2e/`
      for any of these surfaces (checked — the E2E suite asserts
      behavior/DOM state, not pixel screenshots) — nothing to update,
      and no baseline-image infrastructure exists to add one to
      within this phase's scope.
- [x] `npm run lint` and `npx tsc --noEmit`: clean (same pre-existing,
      unrelated error set throughout this phase). `npm run test:unit`:
      **311/321 passing**; all 10 failures confirmed via `git stash`
      against the pre-Phase-14 commit to be pre-existing and
      unrelated (6 navbar `handleExport` — `Response`/`Blob` polyfill
      gap; 3 toast — fake-timer/animation timing; 1 settings-modal —
      dialog-render race). **`npm run test:e2e` / `npm run verify`
      could not run**: both depend on `npm run build`, which fails on
      a pre-existing, unrelated bug in
      `app/api/google-drive/save/route.ts` (confirmed via `git stash`
      to fail identically before this phase). This is a real
      limitation of this verification pass, not something to paper
      over — the E2E suite (which does exercise editor/settings/
      import-export flows) never actually ran against this phase's
      changes.
- [x] Coverage: cannot be measured either, for the same `npm run
      build` blocker (coverage tooling runs through the same build
      path). Reasoned instead: no test was deleted, 2 new test files
      were added (`theme-provider.test.tsx`, its own 3 tests), and
      every existing test that broke on a renamed class name was
      fixed to assert the new name, not weakened or removed — so
      there's no mechanism by which this phase could have reduced
      effective coverage, even though the exact percentage is
      unverified.

### Documentation

- [x] `CLAUDE.md`'s Design Principles and Theme Modes sections
      rewritten: the "#35D7BB... single bright voice" line now
      describes the new accent and the actual token-driven
      architecture (naming the CSS-variable/Tailwind-mapping pattern
      and the WCAG-audit process itself), not just a color swap in
      prose.
- [x] `.impeccable.md` reference in the Key Files Reference table
      removed (file confirmed not to exist) and replaced with two real
      pointers: `app/globals.css` (the actual token source) and
      `spec/14-color-theme-modernization/` (the design record).
- [x] `README.md` and `ARCHITECTURE.md` checked — neither references
      the old brand color in prose or an embedded swatch; nothing to
      change.

### Rollout

- [x] Confirmed pure client-side styling: no new environment variables,
      no infra/CI changes, no API route changes (the two non-component
      files touched, `lib/export.ts` and `app/opengraph-image.tsx`,
      are presentation-only — export CSS and a static OG image). Normal
      deploy path applies, no special procedure needed.
- [ ] **Not deployed to `staging`** — this implementation pass ran
      entirely in this sandbox (no AWS credentials available, same
      constraint every other phase in this repo operates under). The
      code is committed and ready; deploying is a `provision-tenant.sh`
      / orchestrator run against real AWS, out of reach here. Not
      marking this done to avoid the same "merged but not live" gap
      Phase 13 explicitly called out — `spec/README.md`'s Status
      section is updated to say exactly this, not more.
- [x] Rollback note: reverting this phase is a plain revert of these 8
      commits (14a–14h), styling-only, no data migration. One real
      compatibility note: 14a's `themePreference` field replaced the
      old `enableNightMode` boolean inside `UserSettings` rather than
      living alongside it. A user with an old `profileV3` in
      `localStorage` (containing `enableNightMode` but no
      `themePreference`) will simply get the new default
      (`themePreference: "system"`) via `DEFAULT_SETTINGS` merge in
      `hydrate()` — their old explicit night-mode choice, if any, is
      not migrated forward and silently resets to "system." This is a
      one-time, non-destructive UX papercut (their documents are
      unaffected), not a data-loss risk, but worth knowing before
      shipping.
