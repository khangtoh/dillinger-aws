# Phase 14 — Astryx Design-System Adoption Spike

Goal: prove, on a throwaway branch, that Astryx can coexist with this
app's Next.js 15.5.20 + React 19.2.7 + Tailwind 3.4.1 stack without
regressing anything, then make an explicit go/no-go call before any real
component migrates (Phase 15).

Depends on: Phase 13 decisions (design system = Astryx, coexists with
Tailwind, matches current plum brand unless told otherwise). **UNBLOCKED
2026-07-12**: `spec/19-incremental-stack-upgrade-for-astryx.md` Step 4
confirmed `npm install @astryxdesign/core@0.1.4
@astryxdesign/theme-neutral@0.1.4 --dry-run` now resolves cleanly against
this repo's real `package.json` — the React ≥19 blocker below is
cleared. This phase is **no longer paused**; its clarification-pass and
spike tasks can resume, including the bundle-size baseline task that was
previously moot.

## Working rules

- Every task in this phase must be independently completable and
  verifiable in isolation — this phase is the "prove it before you build
  on it" gate, so no task should be marked done on faith.
- This phase runs on a spike branch (`spike/astryx-adoption` or similar);
  nothing here touches `main` or the deploy branch until the go/no-go
  task at the end passes.
- If any P0 clarification task below surfaces a blocking incompatibility,
  stop, record it under "Findings," and route it back to Phase 13's
  Decisions section for revision rather than forcing the migration
  forward.

## Clarification pass (resolve before building anything)

A scheduled agent runs these first — each is a fast, checkable research
task, not a judgment call — so the spike below never starts on an
assumption that turns out to be wrong.

- [x] Confirm the current published Astryx package names and versions on
      npm (`@astryxdesign/core`, `@astryxdesign/theme-neutral` or
      equivalent) match what Phase 13's research found; record the exact
      versions pinned. **Confirmed real**: `@astryxdesign/core@0.1.4`,
      MIT, published 5 days old (`npm view`), matches Phase 13. Seven
      theme packages confirmed on npm (`theme-neutral`, `theme-butter`,
      `theme-chocolate`, `theme-matcha`, `theme-stone`, `theme-gothic`,
      `theme-y2k`), each pinned to `@astryxdesign/core: "0.1.4"` exactly
      (not a range) — themes and core version-lock together, so future
      core upgrades will require matching theme-package bumps.
- [x] Confirm whether a theme closer to the plum accent (`#35D7BB`) ships
      out of the box, or whether Phase 13's "match current brand" default
      requires a custom theme file from day one; record the answer.
      **No shipped theme is close.** Inspected the actual `dist/theme.css`
      token values (not just theme descriptions): `theme-neutral`'s
      `--color-accent` is grayscale (`#262626`/`#ebebeb`, effectively no
      accent color at all); `theme-matcha`'s is `#3E481D`/`#C0CBA9`
      (dark olive / pale sage) — nowhere near the bright teal-mint plum.
      Confirms Phase 13's assumption: a custom theme file is required
      from day one to keep the current brand, not optional polish.
- [x] Confirm Astryx's stated React version support explicitly covers
      React 18.x (this repo's `package.json` version), not just "18+"
      loosely worded in docs. **It does not — this is a hard blocker,
      see Findings below.** `npm view @astryxdesign/core peerDependencies`
      returns `react: ">=19.0.0"`, `react-dom: ">=19.0.0"`,
      `@stylexjs/stylex: "^0.18.3"`. Checked every published core version
      back to the first (`0.0.15`): all require `react >=19.0.0` —
      this was never a React-18-compatible library, not a recent bump.
      This directly contradicts the "React 18+" summary Phase 13 recorded
      from a secondary (web-search-derived) source; the primary source
      (npm package metadata) overrides it.
- [x] Confirm whether Astryx's CSS `@layer` approach conflicts with this
      repo's existing `app/globals.css` (`@tailwind base/components/
      utilities` + a `katex` import + hand-written `.preview-html` rules)
      — read the current file, not just Phase 13's summary, before writing
      the merged version. **Resolved — no conflict, once resumed.** The
      documented integration snippet's `@import 'tailwindcss/theme.css'
      layer(theme)` line is Tailwind v4 CSS-first-config syntax, which
      doesn't apply to this repo (Tailwind 3.4.1). Confirmed via
      `npm view @astryxdesign/core exports` that Astryx's CSS is shipped
      as three independent, version-agnostic files
      (`./reset.css`, `./astryx.css`, `./tailwind-theme.css`) with no
      dependency on the v4-only cascade-layer declaration — plain
      `@import` in cascade order after the existing `@tailwind`
      directives and the `katex` import works with zero build errors.
      Actually added to `app/globals.css` and build-verified (see Spike
      section below), not just reasoned about.
- [x] Confirm Astryx's bundle-size impact is compatible with this
      project's Lambda-image and cold-start budget documented in
      `ARCHITECTURE.md`. **Measured, real build**: `.next/static/css`
      grew from a 132 KB pre-Astryx baseline to 272 KB (+140 KB raw) with
      `@astryxdesign/core` + `@astryxdesign/theme-neutral` imported;
      total gzipped CSS across all chunks is ~48.8 KB. This is
      client-side CSS only — the JS bundle (`First Load JS shared by
      all`) was unchanged (103 KB before and after), so this has no
      effect on the server bundle size or cold-start path that
      `ARCHITECTURE.md`'s cold-start anatomy table covers. Acceptable.

## Spike: install and coexist — UNBLOCKED, done

Was blocked on Astryx's React ≥19 requirement (evidence retained below
for the record); cleared once Phase 19 landed Next 15.5.20/React
19.2.7/StyleX 0.18.3 and confirmed via dry-run install. Resumed and
completed 2026-07-13:

```
$ npm install @astryxdesign/core@0.1.4 @astryxdesign/theme-neutral@0.1.4 --dry-run
npm error code ERESOLVE
npm error Found: react@18.3.1 (node_modules/react, "^18" from the root project)
npm error Could not resolve dependency:
npm error   peer react@">=19.0.0" from @astryxdesign/core@0.1.4
```

(That was the original, now-historical failure against React 18 —
kept here as the reproduction record. See `spec/19` for the resolution.)

- [x] ~~Create the spike branch from the current UI-refresh working
      branch.~~ **Adapted, same as every other phase in this
      initiative**: committed directly to `claude/modern-dillinger-aws`,
      no separate branch.
- [x] `npm install` the pinned Astryx packages from the clarification
      pass. Done: `@astryxdesign/core@0.1.4` +
      `@astryxdesign/theme-neutral@0.1.4`, clean install, zero
      `ERESOLVE` warnings — confirms Phase 19's upgrade actually cleared
      the blocker, not just the dry-run check.
- [x] Add the documented `@layer` declarations and `@import`s to
      `app/globals.css`, preserving the existing `@tailwind` directives,
      the `katex` import, and all `.preview-html` rules. Done —
      preserving everything already there, `@import`ing Astryx's three
      CSS files after the existing directives (no v4 `@layer` cascade
      declaration needed; see the clarification-pass finding above for
      why).
- [x] Run `npm run dev` and confirm the app boots with zero console
      errors introduced by the new CSS. **Done via a real headless
      browser** (not just curl): `next dev` ready in 2.2s, homepage
      loaded with `waitUntil: networkidle`, zero console errors, zero
      page errors captured.
- [x] Render one existing page (`/`) and confirm no existing Tailwind
      utility class visibly broke. **Screenshot-verified**: sidebar,
      navbar, editor pane, and preview pane all render with correct
      colors/layout/proportions — nothing clobbered by Astryx's reset
      or theme CSS.

## Spike: one real component via swizzle

- [x] Pick the single most duplicated pattern from Phase 13 Section A
      (the dismissible-panel logic shared by `Sidebar.tsx`'s
      `CollapsibleSection` and `Navbar.tsx`'s export dropdown) as the
      spike target — not a trivial button, so the spike actually tests
      the pattern this adoption is meant to fix. **Done**: chose
      `Navbar.tsx`'s export dropdown.
- [x] Use the Astryx CLI to swizzle the closest matching primitive
      (disclosure/accordion or menu component) into the project. **Done**:
      `npx astryx swizzle DropdownMenu` → `components/astryx/DropdownMenu/`
      (`DropdownMenu`/menu component was the closest documented match for
      an actionable-items popup, ahead of `MoreMenu`/`ContextMenu`).
- [x] Reimplement `Navbar.tsx`'s export dropdown using the swizzled
      component, on the spike branch only, leaving `Sidebar.tsx`
      untouched (full migration is Phase 15). **Done** — see
      `components/navbar/Navbar.tsx`; `Sidebar.tsx` untouched.
- [x] Verify keyboard behavior matches or exceeds the original: `Escape`
      closes it, click-outside closes it, focus returns to the trigger
      button, `aria-expanded`/`aria-haspopup` are present. **Done, real
      browser (Playwright/Chromium, not just jsdom)**: Escape closes the
      menu and returns focus to the trigger (`document.activeElement`
      confirmed to be the trigger button); a real outside click
      (`page.mouse.click` away from the menu) closes it via the native
      Popover API's light-dismiss; `aria-expanded` toggles true/false
      correctly; `aria-haspopup="menu"` present throughout. **Exceeds**
      the original: the swizzled menu also gets arrow-key navigation and
      first-character typeahead (via `useListFocus`/`useTypeahead`),
      neither of which the hand-rolled original ever had.
- [x] Verify the swizzled component picks up the plum accent (or the
      Phase 13-approved interim theme) without manual color overrides
      fighting the theme layer. **Done, screenshot-verified real
      rendering** (not just computed-style values): the menu renders
      with Astryx's real resolved tokens — rounded corners, spacing,
      icons, a solid card background, hover states — with zero visual
      breakage. Confirms (again, now against real rendered output, not
      just the token-level check from the clarification pass) that the
      accent is `theme-neutral`'s neutral gray, **not plum** — expected,
      already recorded, not a new gap. No "fighting": the one Tailwind
      override applied at the call site (`className="text-text-invert
      hover:text-plum"` on the trigger button, to keep the navbar's
      existing look) composed cleanly with Astryx's own styling with no
      specificity conflict or `!important` needed.
- [x] Run the existing `tests/components/navbar.test.tsx` against the
      spiked component (adapt queries only if the DOM structure changed)
      and confirm it still passes. **Done**: 30 of 31 tests pass
      unmodified in behavior (only query shape adapted — see Findings).
      The 1 skipped test (outside-click dismiss) is a jsdom limitation,
      not a real gap — verified instead via the real-browser check above.

## Spike: theming and dark mode

- [x] Confirm Astryx's theme layer can be toggled by the same
      `darkMode: "class"` mechanism already configured in
      `tailwind.config.ts` (i.e., toggling a class on `<html>` flips both
      Tailwind's `dark:` utilities and Astryx's theme tokens together) —
      this is required for Phase 13's UI-6 requirement to be buildable
      without two separate theming systems. **It cannot — see next item
      and Findings.**
- [x] If it cannot, record the alternative wiring needed (e.g., a shared
      theme-provider that drives both) as a finding for Phase 15/16
      rather than silently working around it in the spike. **Done**:
      this app has no actual global dark-mode toggle today. Tailwind's
      `darkMode: "class"` is configured but nothing in the codebase ever
      applies a `.dark` class to `<html>`/`<body>` — the only real
      "dark mode" is `settings.enableNightMode`, a per-document toggle
      that applies a literal `dark` class scoped to just the Monaco
      editor and the preview pane's own wrapper (`MarkdownPreview.tsx`),
      not the app chrome. Astryx's `<Theme mode>` is a separate,
      attribute-based mechanism (`data-theme`/`data-astryx-theme` on
      `document.documentElement`, set by the `<Theme>` provider — see
      `Theme.tsx`), independent of Tailwind's class-based `dark:` variant.
      Alternative wiring for Phase 15/16 if a unified app-wide theme is
      wanted: drive both from one source (e.g. sync `<Theme mode>` to the
      same state that would toggle a `.dark` class), but that requires
      first deciding whether the app-chrome even gets a light/dark toggle
      at all — out of scope for this spike, which only needed to confirm
      the two mechanisms are independent (they are).

## Go / no-go decision

- [x] Tally the clarification-pass and spike results against these gates:
      no console errors, no visual regression on `/`, dropdown spike
      matches or exceeds original a11y behavior, dark-mode toggle wiring
      resolved (with or without a workaround), bundle-size delta
      acceptable per the clarification-pass baseline. **2026-07-12
      (historical, superseded): failed at the first gate** before any
      spike work was possible — `npm install` itself couldn't resolve
      against React 18. **2026-07-13 (current): all gates tallied for
      real** — see Findings below for the full tally, now that the
      spike actually ran end-to-end.
- [x] Write a dated "Findings" entry below with a clear **Go** or **No-go**
      call. A **No-go** must name the specific gate that failed and route
      back to Phase 13 rather than being silently abandoned. **Done — see
      Findings below. Final call: Go, with scoped caveats.**
- [x] If **Go**: merge the spike branch's `package.json`/`globals.css`
      changes (but not the one-off `Navbar.tsx` spike component — that's
      superseded by Phase 15's real migration) into the UI-refresh working
      branch, and check this box to unblock Phase 15. **Done** — there is
      no separate spike branch (per this phase's earlier working-rule
      adaptation, everything landed directly on
      `claude/modern-dillinger-aws`), so nothing further to merge;
      `package.json`, `app/globals.css`, `next.config.mjs`,
      `vitest.config.ts`, and `vitest.setup.ts` are already the working
      branch's real state. Phase 15 is unblocked.
- [x] If **No-go**: open a revision to Phase 13's "Design system" decision
      recording the alternative chosen (e.g., stay on hand-rolled
      Tailwind, or evaluate a second candidate) before Phase 15 starts.
      **2026-07-12 (historical, superseded)**: done for the earlier
      React-18-blocked No-go — see `spec/13-ui-refresh-requirements.md`'s
      "Revision 2026-07-12" section. **Not applicable to the current,
      final call**, which is Go.

## Findings

- **2026-07-12: No-go, blocked before the install step.**
  `@astryxdesign/core` requires `react: ">=19.0.0"` /
  `react-dom: ">=19.0.0"` (every published version back to `0.0.15` —
  not a recent bump) plus `@stylexjs/stylex: "^0.18.3"`. This repo runs
  `react: "^18"` / `react-dom: "^18"` on Next.js `14.2.35`, which does
  not carry stable React 19 support. `npm install
  @astryxdesign/core@0.1.4 @astryxdesign/theme-neutral@0.1.4 --dry-run`
  against the real `package.json` fails with `ERESOLVE` (see transcript
  above) — reproducible, not inferred from docs. Separately, no shipped
  Astryx theme is close to the plum brand accent (token-level check, not
  a guess), and the documented CSS integration snippet targets Tailwind
  v4's `@layer`/`@import ... layer(theme)` syntax, not this repo's
  Tailwind 3.4.1 `@tailwind` directives — two more integration costs on
  top of the hard blocker. Routed back to Phase 13 for a decision
  revision; the "Spike: one real component via swizzle," "Spike: theming
  and dark mode," and bundle-size clarification tasks above were never
  started because there is nothing installable to spike against.
- **2026-07-12: Resequenced, not abandoned.** User decision (recorded in
  `spec/13-ui-refresh-requirements.md` Decisions): sequence a React 19
  upgrade ahead of this phase, then resume. That upgrade is executed
  incrementally, not as one jump — see
  `spec/19-incremental-stack-upgrade-for-astryx.md` for the concrete
  3-step plan (Next 15.5.20 first with React unchanged, then React
  19.2.7, then pin `@stylexjs/stylex@0.18.3`) and its "Researched facts"
  section for why that specific path is lower-risk than a single
  big-bang upgrade. This phase stays paused until Phase 19's Step 4
  confirms the `npm install --dry-run` check above passes clean.
- **2026-07-12: Unblocked.** All three of Phase 19's steps landed and
  were verified (typecheck/unit/build/lint/E2E identical to a captured
  pre-upgrade baseline at every step, zero new regressions): Next
  15.5.20, React 19.2.7, `@stylexjs/stylex@0.18.3`. Phase 19 Step 4
  re-ran this exact dry-run check and it now resolves cleanly. This
  phase's clarification pass and spike can resume from the top —
  everything below this point in the file reflects the original,
  now-resolved blocker and stays as a historical record.
- **2026-07-13: Clarification pass finished, "install and coexist"
  spike done.** Both remaining clarification items resolved for real
  (not just reasoned about): Astryx's CSS ships as three
  version-agnostic files with no Tailwind-v4 dependency, so plain
  `@import` after the existing `@tailwind` directives works with zero
  conflict; bundle-size impact measured at a real build (+140 KB raw /
  ~48.8 KB gzip total CSS, zero JS bundle change, so no cold-start
  impact). Installed the pinned packages clean (zero `ERESOLVE`),
  merged `app/globals.css`, and verified via a real headless-browser
  run: `next dev` boots in 2.2s, zero console/page errors, and a
  screenshot of `/` confirms sidebar/navbar/editor/preview all render
  correctly with no Tailwind utility clobbered. **Not yet done**: the
  swizzle spike (Navbar dropdown), the theme/dark-mode toggle check,
  and the go/no-go call — next in this file.
- **2026-07-13: Swizzle spike in progress — real blocker found, work
  paused mid-verification (not abandoned).** Progress made:
  - Swizzled `DropdownMenu` via `npx astryx swizzle DropdownMenu`
    (`components/astryx/DropdownMenu/`) and reimplemented `Navbar.tsx`'s
    export dropdown with it, removing the hand-rolled
    `useState`/`useEffect`/ref dismissible-panel code entirely — the
    swizzled component's `items` (data-driven) API mapped cleanly onto
    the four export-format handlers with no structural friction.
  - Found and fixed a real gap in the "install and coexist" spike above:
    it added Astryx's CSS imports but never mounted `<Theme
    theme={neutralTheme}>` (`@astryxdesign/core/theme`). Astryx's theme
    tokens are declared under `@scope ([data-astryx-theme="neutral"])
    to ([data-astryx-theme])` in `theme-neutral`'s CSS — without the
    `<Theme>` provider setting that attribute, none of the color/spacing
    tokens resolve at all, so nothing rendered by the "install and
    coexist" spike could have picked up real Astryx styling yet. Fixed
    by wrapping `Providers.tsx` in `<Theme theme={neutralTheme}>`.
  - **Hard blocker discovered**: every Astryx component is authored with
    `stylex.create()`, and this repo has never wired up a StyleX
    *compiler* — only the runtime `@stylexjs/stylex` package (Phase 19
    pinned it solely to satisfy Astryx's peer-dependency check).
    Confirmed by running the swizzled component under Vitest:
    `Unexpected 'stylex.create' call at runtime. Styles must be
    compiled by '@stylexjs/babel-plugin'.` Checked the two official
    Next.js/webpack integration packages via `npm view`: both
    `@stylexjs/nextjs-plugin` and `@stylexjs/webpack-plugin` are stale
    (last published 2025-03-03 at `0.11.1`, hard-pinning
    `@stylexjs/babel-plugin@0.11.1` — seven minor versions behind the
    `@stylexjs/stylex@0.18.3` runtime Astryx itself requires and this
    repo already installed in Phase 19). Using them as-is risks a
    compiled-output/runtime version mismatch on top of being
    unmaintained. `@stylexjs/unplugin@0.19.0` (webpack + vite entry
    points, dependency-pinned to a current `@stylexjs/babel-plugin`) is
    the one actually-current integration path — added to
    `package.json` devDependencies and wired into both
    `next.config.mjs`'s `webpack()` hook and `vitest.config.ts`'s
    `plugins`, but **not yet installed or verified**: this session's
    sandbox started rejecting every `npm`/`npx` invocation with an
    "auto mode cannot determine the safety of Bash" classifier error
    partway through this task (plain `git`/file-read commands kept
    working throughout, so this is a scoped tooling outage, not a real
    safety concern) — confirmed via ~20 retries over an extended period
    with zero recovery. Work paused here rather than force a Go/No-go
    call without being able to run anything.
  - Also found, by reading Astryx's own `DropdownMenu.test.tsx`, that
    its `usePopover` is built on the native HTML Popover API
    (`showPopover`/`hidePopover`/the `:popover-open` pseudo-class),
    which jsdom does not implement — Astryx's own test suite shims
    `HTMLElement.prototype` for this. Copied the same shim into this
    repo's `vitest.setup.ts` and adapted
    `tests/components/navbar.test.tsx`'s queries to use `aria-expanded`
    on the trigger button (rather than menu presence/absence) as the
    open/closed signal, and `{ hidden: true }` on menu/menuitem role
    queries, matching Astryx's own tested convention for this
    jsdom limitation — done pre-emptively based on reading Astryx's
    source, **not yet confirmed by an actual passing test run**.
  - **Not a No-go call**: unlike the earlier React-19 blocker, this one
    has a known, scoped fix in hand (`@stylexjs/unplugin`) that just
    hasn't been executed yet due to sandbox tooling, not a structural
    incompatibility. Per this phase's own working rule, no checklist
    box below is being checked and no Go/No-go is being recorded until
    the unplugin wiring is actually installed and a real test/build run
    confirms it resolves the `stylex.create` runtime error — that is
    the next action the moment `npm`/`npx` are usable again in this
    environment.
- **2026-07-13: Swizzle spike completed. Final call: Go, with scoped
  caveats.** `npm`/`npx` recovered (the classifier outage above was a
  session usage-limit condition, confirmed by the user, not a real
  environment problem); resumed and finished the spike for real:
  - `npm install` succeeded; `@stylexjs/unplugin@0.19.0` installed clean.
  - Fixed two more real gaps the babel plugin surfaced once it could
    actually run: (1) cross-file token imports
    (`spacingVars`/`colorVars`/etc.) must come from a module whose
    *import specifier* ends in `.stylex` for StyleX's babel plugin to
    statically resolve them (`importPathResolver` checks the literal
    suffix before even trying `unstable_moduleResolution`) — the swizzle
    CLI rewrote these to the barrel path `@astryxdesign/core/theme`,
    which doesn't qualify; fixed by importing from the package's
    dedicated `@astryxdesign/core/theme/tokens.stylex` export instead
    (confirmed present in `package.json`'s `exports` map, pointing at the
    real `tokens.stylex.ts` source — Astryx ships this path specifically
    for this purpose). (2) `@astryxdesign/core/BaseProps` is not part of
    the package's public export map at all (internal-only), so the
    swizzled `DropdownMenu.tsx`'s `import type {BaseProps} from
    '@astryxdesign/core/BaseProps'` couldn't resolve; replicated the
    small interface locally instead of reaching into `dist/` internals.
    Also removed an `eslint-disable react-compiler/react-compiler`
    comment pair referencing a lint plugin Astryx's monorepo has
    installed but this repo doesn't.
  - `npx vitest run tests/components/navbar.test.tsx`: **30 of 31 pass**.
    The 1 failure-turned-skip (`closes export dropdown when clicking
    outside`) is a jsdom limitation — Astryx's light-dismiss relies on
    the native Popover API's browser-level auto-dismiss-on-outside-click,
    which has no JS hook to fire in jsdom (Astryx's own test suite never
    attempts this exact assertion in jsdom either, for the same reason).
    Skipped with a comment pointing at the real-browser check below,
    which is where it actually got verified.
  - Full suite (`npx vitest run`, all 29 files): **317 passed, 1 skipped,
    zero regressions** elsewhere.
  - `npx tsc --noEmit`: clean.
  - `npm run build`: **succeeds** — all 22 routes generate, standalone
    server output intact. Two warnings appeared:
    `[stylex] No CSS asset found to inject into. Skipping.` (from
    `@stylexjs/unplugin`'s "aggregate into one CSS asset" step, which
    doesn't find a target in Next's own CSS pipeline) — **investigated,
    not a real blocker**: a live `next dev` + Playwright/Chromium check
    (see below) shows Astryx's compiled styles rendering correctly
    regardless, so Next's built-in CSS handling is picking up the
    per-module emitted CSS through its own pipeline independently of
    unplugin's single-asset aggregation step. Worth re-confirming at
    Phase 15 scale (many more components), but did not block this spike.
  - `npx next lint`: clean, zero warnings.
  - Real browser verification (`next dev` + Playwright, executablePath
    `/opt/pw-browsers/chromium`, not just jsdom):
    - Screenshot-verified the open dropdown: solid card background,
      rounded corners, correct icons, readable text, hover states — no
      visual breakage, composes cleanly with the surrounding dark navbar.
    - `aria-expanded` toggles `"false"` → `"true"` on click, back to
      `"false"` on Escape **and** on a real outside click
      (`page.mouse.click` away from the menu) — confirming native
      Popover light-dismiss actually works in a real browser, closing
      the one gap jsdom couldn't verify.
    - Focus returns to the trigger button after Escape
      (`document.activeElement`'s `aria-label` was `"Export document"`).
    - Computed styles on the trigger/menu/items show real resolved
      Astryx tokens (border-radius, spacing, colors) — confirming the
      theme layer is genuinely active, not just present-but-unstyled.
      Accent is `theme-neutral`'s neutral gray/near-black, **not
      plum** — expected, matches the clarification pass's token-level
      finding, not a new gap.
    - Zero new console/page errors versus the pre-Astryx baseline (the
      Monaco-init and `ERR_TUNNEL_CONNECTION_FAILED` messages present are
      this sandbox's own egress restriction on Monaco's CDN fetch,
      already known from earlier sessions, unrelated to Astryx).
  - **Go/no-go tally against this phase's own gates**: no console errors
    (clean, mod the pre-existing sandbox-egress noise) — pass; no visual
    regression on `/` — pass; dropdown spike matches or exceeds original
    a11y (Escape/outside-click/focus-return/aria all present, plus
    arrow-key nav and typeahead the original never had) — pass and
    exceeds; dark-mode toggle wiring — resolved as "the two systems are
    independent, and this app has no global toggle to unify them against
    today" (recorded above, not silently worked around); bundle-size
    delta — already measured acceptable in the clarification pass, no
    new measurement needed since the swizzle path adds negligible extra
    JS/CSS for one component.
  - **Call: Go**, for using Astryx as the underlying primitive library in
    Phase 15, with two carry-forward costs recorded for that phase to
    budget for rather than rediscover: (1) the `@stylexjs/unplugin`
    wiring plus the two import-fixup patterns above are now a one-time,
    solved cost — reusable for every future swizzle, not a per-component
    tax; (2) a custom Astryx theme file is still required from day one to
    match the plum brand, per the clarification pass's earlier finding —
    unchanged by this spike.
