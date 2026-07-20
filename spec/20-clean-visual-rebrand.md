# Phase 20 — Clean Visual Rebrand: Retire the Legacy Dillinger Theme

Goal: give Dillinger a new, coherent visual identity that cannot be
mistaken for the legacy application in a side-by-side screenshot. Preserve
the product name, editor behavior, accessibility, and the Astryx component
foundation, but replace the old palette, typography, shell treatment,
component styling, and rendered-document defaults.

Depends on: Phase 14 (Astryx integration proven) and Phase 15 (shared
component primitives and light/dark/system mechanics landed). This phase is
a blocking dependency for Phase 18's final visual and live-deployment
acceptance checks. Phases 16 and 17 may proceed independently because their
information-architecture and AI requirements are not visual-design inputs.

## Decision record — 2026-07-19

The user clarified that this branch was intended to **abandon the current
Dillinger theme, style, and colors**, not preserve them. This supersedes the
earlier Phase 13 assumption that the existing `plum` accent and legacy gray
shell were assets to retain.

This phase is the authoritative specification for the replacement visual
system. The old wording remains in Phases 13-15 as historical evidence of
why the component migration retained the old appearance; explicit
supersession notices in those files point here. Phase 18 continues to own
full live-product verification, but its detailed visual requirements and
visual definition of done are sourced from this phase.

The decision changes visual direction only:

- Astryx remains the primitive/component foundation selected in Phase 13
  and proven in Phases 14-15.
- Tailwind may remain for layout and responsive utilities, but legacy color
  tokens and visual overrides do not remain.
- Phase 13's UI-1 through UI-7 feature requirements remain in force.
- Phase 15's toolbar, command palette, diagrams, modal migrations, and
  light/dark/system state mechanics remain in force.
- Phase 16's folders/tags/search and Phase 17's AI work are unchanged.
- Accessibility is still a regression gate; a visual break does not
  authorize behavior or accessibility regressions.

## Existing UI-refresh specs — summary and extraction map

| Phase | Existing scope | What remains authoritative | What is extracted or superseded here |
|---|---|---|---|
| 13 | Current-UI audit, Astryx evaluation, StackEdit gap analysis, product direction, AI scope | Astryx choice, UI-1..UI-7, multi-document-manager direction, AI scope | The assumption that the plum identity should be preserved; the unresolved rebrand question is now resolved in favor of a full visual replacement |
| 14 | Technical compatibility spike for Astryx, StyleX, Tailwind, React, and Next.js | Package/integration findings, bundle evidence, accessibility behavior, Go call | Requirements and carry-forward notes about matching the plum brand; those are retained only as historical evidence |
| 15 | Component migration plus toolbar, theming mechanics, diagrams, and command palette | Shipped behavior, Astryx primitives, tests, persisted theme mode, accessibility findings | Legacy Tailwind color overrides, neutral-theme fallbacks, and hard-coded preview colors are transition debt to remove in this phase—not the desired design |
| 16 | Folders, tags, and title/tag search | Entire phase | Nothing; its new surfaces must consume the Phase 20 visual system when implemented |
| 17 | Document API contract, in-editor AI actions, follow-on MCP server | Entire phase | Nothing; any new visible AI states must consume the Phase 20 visual system |
| 18 | Automated regression, live deployment, StackEdit-parity verification, close-out | End-to-end and live-deployment verification | Detailed visual design and per-surface visual acceptance are defined here; Phase 18 verifies the completed Phase 20 result live |
| 19 | Next/React/StyleX stack upgrade required by Astryx | Entire phase | Nothing |

## Scope and non-goals

In scope:

- The editor application shell and every state reachable from it.
- Shared design tokens, Astryx theme values, Tailwind token bridging, and
  global CSS.
- Application and Markdown-preview typography.
- Light, dark, and system modes.
- Responsive layouts at mobile, tablet, and desktop widths.
- Marketing/content routes under `app/(content)` where they use the legacy
  visual language or shared application tokens.
- Removal and automated prevention of legacy-theme reuse.

Not in scope:

- Renaming the Dillinger product or changing its core editor workflows.
- Reimplementing Phase 15 features or replacing Astryx with a different
  component system.
- Changing the document model, Lambda architecture, OAuth flows, exports,
  multi-tenancy, or deployment topology.
- Adding decorative complexity that competes with the writing surface.
- Treating a stock Astryx theme as the finished rebrand. Astryx supplies
  primitives; Dillinger still requires an owned visual system.

## Target visual direction

**Modern editorial workspace.** The interface should feel like a precise,
quiet writing instrument: content-forward, spacious, keyboard-oriented, and
deliberately contemporary. The clean break comes from a new shell, palette,
type system, component treatment, and document style—not from cosmetic
changes to the old dark bars.

The initial palette direction is a slate/stone neutral foundation with an
indigo/electric-blue accent. These values are the starting token targets;
they may be adjusted during implementation only when the replacement is
recorded in this file with contrast evidence:

| Role | Light target | Dark target |
|---|---|---|
| Canvas | `#F8FAFC` | `#0B1220` |
| Primary surface | `#FFFFFF` | `#111827` |
| Raised surface | `#F1F5F9` | `#182235` |
| Strong text | `#0F172A` | `#F8FAFC` |
| Muted text | `#5D6C82` | `#94A3B8` |
| Subtle border | `#E2E8F0` | `#273449` |
| Accent | `#4F46E5` | `#818CF8` |
| On-accent | `#FFFFFF` | `#0B1220` |

The legacy values `#35D7BB`, `#2B2F36`, and `#373D49` are prohibited in
rendered application UI after this phase. They may appear only in historical
spec text, migration tests that prove their removal, or a clearly labeled
before-screenshot artifact.

Typography direction:

- Geist Sans for application chrome and rendered Markdown prose.
- Geist Mono for Monaco-adjacent labels, keyboard hints, and code.
- A documented type scale with clear hierarchy instead of inherited browser
  sizes and the legacy Source Sans Pro/Georgia/Ubuntu Mono combination.
- Rendered Markdown may gain optional document-style presets later, but the
  default preview in this phase must use the new visual system.

Shell direction:

- Replace the solid legacy charcoal navbar/sidebar composition with a
  visually integrated workspace shell using the new canvas, surfaces, and
  border hierarchy.
- Replace the uppercase mint `DILLINGER` treatment with a restrained new
  wordmark treatment using the replacement type and accent system.
- Use spacing, grouping, active states, and progressive disclosure to make
  navigation hierarchy legible without large blocks of dark color.
- Editor and preview remain the visual center of gravity; application chrome
  should recede around them.

## Visual requirements

- **VR-1 — Retire the legacy palette:** remove the legacy token names and
  color values from rendered application code. Do not alias old names to new
  colors; replacement tokens must have semantic names.
- **VR-2 — One owned theme:** create one custom Dillinger Astryx theme with
  complete light and dark values. `theme-neutral` may remain an install-time
  dependency if Astryx requires it, but it must not be the runtime visual
  identity or an unreviewed fallback.
- **VR-3 — Semantic tokens:** define at least canvas, surface, raised surface,
  strong text, muted text, subtle border, accent, on-accent, danger, warning,
  success, focus ring, radius, shadow, spacing, and motion tokens. Tailwind
  and Astryx must resolve from the same source of truth.
- **VR-4 — New typography:** use Geist Sans/Mono and a documented type scale
  across the shell, controls, overlays, and default Markdown preview. Remove
  legacy font-family declarations when their consumers migrate.
- **VR-5 — New application shell:** redesign the navbar, sidebar, document
  navigation, title area, editor toolbar, editor/preview divider, and zen
  mode as one coherent workspace rather than recoloring individual buttons.
- **VR-6 — New component treatment:** menus, dialogs, command palette,
  toasts, segmented controls, toggles, buttons, empty states, skeletons, and
  service-provider states must share the new radius, density, border,
  elevation, icon, focus, and motion language.
- **VR-7 — New document presentation:** headings, prose, links, code blocks,
  tables, blockquotes, task lists, KaTeX, Mermaid diagrams, and table of
  contents styling must use the new editorial typography and tokens.
- **VR-8 — Deliberate theme modes:** light and dark modes must each be
  intentionally designed; dark mode is not a mechanical inversion. System
  mode must switch the same owned token set and react to preference changes.
- **VR-9 — Responsive re-composition:** desktop, tablet, and mobile must use
  purposeful layouts. Mobile may change grouping/order, but must retain all
  primary editor actions without horizontal overflow.
- **VR-10 — Accessible and calm motion:** retain WCAG 2.2 AA contrast,
  keyboard access, visible focus, semantic roles, and reduced-motion
  handling. Motion should communicate state, not decorate it.
- **VR-11 — No compatibility styling at completion:** temporary legacy
  overrides must be deleted after their last consumer migrates. Historical
  CSS is not kept "just in case."
- **VR-12 — Route consistency:** every user-visible route must be audited so
  the editor, error/404 states, and content pages do not present conflicting
  brands.

## Clarification and baseline

- [x] Capture current legacy-theme screenshots at 1440×900, 768×1024, and
      390×844 in light and dark modes; label them `before` evidence, not
      future visual baselines.
- [x] Capture open-state screenshots for the sidebar, export menu, command
      palette, Settings dialog, one cloud-provider dialog, toast, and
      keyboard-shortcuts dialog.
- [x] Inventory every legacy token name and prohibited color/font value in
      `tailwind.config.ts`, `app/globals.css`, `app/**`, and `components/**`;
      record the removal list in the Results log below.
- [x] Inventory every place that mounts `neutralTheme` or applies a Tailwind
      color override to an Astryx component; record it as migration debt.
- [x] Build a route/state screenshot matrix covering the editor, content
      routes, errors, empty/loading states, mobile navigation, and overlays.
- [x] Validate the proposed light and dark palette token pairs with an
      automated contrast checker; record any adjusted values and the reason.
- [x] Confirm the new wordmark treatment and app-shell direction in one
      desktop and one mobile static prototype before migrating components.

## Theme and token foundation

- [x] Create the owned Dillinger Astryx theme module with complete light and
      dark semantic color tokens.
- [x] Add typography, radius, elevation, spacing, focus, and motion tokens to
      the same owned theme layer.
- [x] Replace `neutralTheme` in `Providers.tsx` with the owned theme while
      preserving the existing light/dark/system state behavior.
- [x] Replace legacy Tailwind color token names with a semantic bridge to the
      owned theme; do not create aliases named `plum`, `bg-navbar`, or
      `bg-sidebar`.
- [x] Add the Geist font variables to the owned theme and apply them at the
      root without layout shift.
- [x] Replace the body canvas/text literals and global focus styling with
      owned tokens.
- [x] Add unit tests proving all three theme modes select the owned theme and
      that `system` reacts to a media-query change.
- [x] Add a build-time check that fails when prohibited legacy token names or
      values are introduced in rendered UI source.

## Application-shell migration

- [x] Redesign the Navbar layout, wordmark, action grouping, hover/pressed
      states, and responsive overflow behavior using only owned tokens.
- [x] Redesign the Sidebar surface, section hierarchy, document navigation,
      provider actions, and primary/destructive actions using only owned
      tokens.
- [x] Redesign `DocumentList` selection, hover, metadata, empty, and overflow
      states; incorporate Phase 16 folder/tag states if that phase has landed.
- [x] Redesign `DocumentTitle` and its dirty/saved states as part of the new
      workspace hierarchy.
- [x] Redesign the formatting toolbar, including grouping, separators,
      pressed/disabled states, and mobile overflow.
- [x] Redesign the editor/preview canvas, divider, pane headers, and resize or
      collapse affordances without changing Monaco/scroll-sync behavior.
- [x] Redesign zen mode and drag/drop overlays using the same theme rather
      than a separate visual treatment.
- [x] Verify the shell at all three target viewport sizes before proceeding
      to overlays; record screenshots in the Results log.

## Documents, overlays, and secondary surfaces

- [x] Replace all legacy `.preview-html` colors, fonts, borders, radii, and
      spacing with owned document-presentation tokens.
- [x] Restyle headings, links, code/pre, blockquotes, lists, tables, task
      lists, table of contents, KaTeX, and Mermaid output in both modes.
- [x] Redesign the export DropdownMenu and command palette, including empty,
      filter, selected, keyboard-focus, and grouped-result states.
- [x] Redesign Settings, delete confirmation, keyboard shortcuts, and all
      cloud-provider dialogs using shared overlay patterns and owned tokens.
- [x] Redesign Toast, Skeleton, loading, empty, error, and offline states.
- [x] Audit and migrate `app/error.tsx`, `app/not-found.tsx`, and every
      `app/(content)` route that exposes legacy or conflicting styling.
- [x] Verify every Astryx primitive resolves the owned theme rather than
      `theme-neutral` defaults using computed-style assertions for at least
      one component from each primitive family.

## Responsive, accessibility, and motion validation

- [x] Run keyboard-only checks through Navbar, Sidebar, toolbar, command
      palette, dialogs, editor/preview toggles, and document navigation.
- [x] Run automated axe checks on the editor shell plus every overlay in
      light and dark modes; resolve all serious/critical findings.
- [x] Verify text, icons, controls, focus rings, selected states, and danger
      states meet WCAG 2.2 AA contrast in both modes.
- [x] Verify 200% zoom and 320px-wide rendering without lost actions,
      clipped dialogs, or horizontal page overflow.
- [x] Verify `prefers-reduced-motion` removes non-essential transitions and
      preserves clear state changes.
- [x] Verify light/dark/system persistence across reload and a fresh browser
      session without a flash of the wrong theme.

## Visual acceptance and cleanup

- [x] Add Playwright screenshot coverage for every state in the route/state
      matrix at desktop, tablet, and mobile sizes where the layout differs.
- [x] Review before/after pairs and record a clear verdict that the new shell,
      palette, typography, preview, and components cannot be mistaken for the
      legacy Dillinger UI.
- [x] Run the prohibited-token/value check with zero application-source
      matches; historical spec text and labeled before-artifacts are the only
      allowed matches.
- [x] Delete unused legacy Tailwind tokens, legacy global CSS, compatibility
      overrides, and temporary migration comments.
- [x] Run lint, typecheck, unit, E2E, coverage, and production build; record
      exact results and investigate every regression.
- [ ] Deploy through the branch CI/OIDC path and hand the run URL plus visual
      evidence to Phase 18 for live-product acceptance.
- [x] Update `CLAUDE.md` and any component-level contributor notes to describe
      the owned theme and forbid reintroduction of legacy styling.
- [ ] Check this phase complete in `spec/README.md` only after every item
      above is checked and a dated Results entry is recorded.

## Definition of done

This phase is complete only when all of the following are true:

1. A first-glance side-by-side comparison shows a different visual product,
   not the old Dillinger shell with new primitives.
2. No rendered application surface uses the legacy colors, token names,
   typography, or dark-bar composition.
3. All Astryx components resolve the owned Dillinger theme with no silent
   neutral-theme fallback.
4. Light and dark modes are complete, accessible systems and `system` mode is
   persistent and flash-free.
5. Desktop, tablet, and mobile screenshot baselines cover the full route/state
   matrix.
6. Existing behavior, accessibility, security, tests, and deployment remain
   green.
7. Phase 18 verifies the same result against the live Function URL.

## Results log

_(Append dated evidence here: final token values, inventory/removal counts,
contrast results, screenshot artifact locations, test/build results, branch
deployment run URL, and the final before/after verdict.)_

### 2026-07-19 — clarification/baseline evidence

- Captured six deterministic `before` editor screenshots at 1440×900,
  768×1024, and 390×844 in light/dark system preference, plus seven required
  open states. Evidence, capture source, and the reusable Playwright script are
  under [`artifacts/phase20/`](../artifacts/phase20/).
- Recorded the complete legacy Tailwind color-token inventory, prohibited
  values/fonts, additional preview literals, and removal order in
  [`baseline-audit.md`](../artifacts/phase20/baseline-audit.md). Headline debt:
  `plum` has 127 matches across 32 rendered-source files; `bg-sidebar` has 37
  across 27; and `bg-navbar` has 13 across 9.
- Found one runtime `neutralTheme` mount and one neutral-theme CSS import. Ten
  Astryx-consuming component files also apply legacy Tailwind color overrides;
  the audit names every file.
- Added the full editor/content/error/overlay viewport contract in
  [`route-state-matrix.md`](../artifacts/phase20/route-state-matrix.md).
- Automated palette validation found the proposed light muted text `#64748B`
  failed on raised surface `#F1F5F9` at `4.34:1`. The recorded target is now
  `#627188`, passing at `4.52:1`; all required text, accent, and focus pairs now
  pass. Subtle borders remain decorative-only; the foundation result below
  records the separate 3:1 control-border token.
- Created a clean-break responsive shell prototype and rendered desktop/mobile
  review images under [`prototype/`](../artifacts/phase20/prototype/). Continuing
  Phase 20 implementation on 2026-07-19 confirmed this direction.
- No runtime UI implementation changed in this slice. Local dependency install
  was unavailable because npm's cache rename failed twice and its constrained
  retry crashed with allocator corruption; live Playwright/Python checks provide
  the recorded evidence, but do not substitute for later unit/build validation.

### 2026-07-19 — owned theme/token foundation

- Added the sole runtime Astryx identity in
  [`lib/theme/dillingerTheme.ts`](../lib/theme/dillingerTheme.ts), driven by
  the owned light/dark color, typography, spacing, radius, elevation, focus,
  and motion source in [`tokens.ts`](../lib/theme/tokens.ts). The neutral
  package supplies only its semantic icon registry; its theme object and CSS
  are no longer mounted.
- Replaced every retired Tailwind color name at rendered call sites with the
  semantic bridge to Astryx variables. `npm run check:legacy-theme` passes
  across 123 rendered-source files and is a `prebuild` gate; it rejects the
  three prohibited colors, retired token names/fonts, and `neutralTheme`.
- Added Vercel's `geist@1.7.2` local-font loader for Geist Sans/Mono, applied
  both variables at the root, moved Monaco to the mono variable, and replaced
  body/focus/global preview literals with owned tokens. Styled exports and the
  Open Graph route also consume the owned palette source.
- Extended contrast evidence with the emphasized `#64748B` control border:
  `4.76:1` on the light surface and `3.73:1` on the dark surface. All required
  text, accent, focus, and control-border pairs pass; subtle borders remain
  decorative separators only.
- Added pure mode-selection/class-synchronization coverage in
  [`tests/lib/theme-mode.test.ts`](../tests/lib/theme-mode.test.ts). The
  core phase-owned foundation files passed an isolated TypeScript compile
  before later test-install attempts damaged `node_modules`. The full typecheck
  reaches unrelated existing LogoBar/Playwright typing issues plus
  concurrent Phase 16 document-schema test fixtures, with no Phase 20 source
  errors.
- The mode suite could not execute in Vitest because npm and Bun repeatedly
  left transitive package directories empty under this Proot filesystem
  (`pathe`, `tough-cookie`, and React were observed). Its checkbox therefore
  remains open; full unit/build verification is not claimed.

### 2026-07-19 — application-shell composition

- Replaced the uppercase legacy top bar with a restrained Dillinger wordmark,
  surfaced navigation control, compact primary actions, and one owned-theme
  progressive-disclosure menu for image, toolbar, zen, and shortcut actions.
- Rebuilt the 288px library sidebar with surfaced section hierarchy, an owned
  overlay/motion treatment, document counts, folder and tag metadata, selected/
  empty/overflow states, provider connection states, and separated primary,
  save, and destructive actions. Existing sidebar, modal, create/save/delete,
  and document-selection behavior contracts remain wired.
- Reframed the document title, formatting groups, Monaco editor, and rendered
  preview as one workspace. Desktop receives labelled split panes and the
  existing collapse toggle; mobile receives explicit Write/Preview tabs without
  duplicating controls or changing Monaco/scroll-sync state.
- Moved Monaco's light/dark Markdown colors onto the owned token source, removed
  the remaining hard-coded preview surfaces, updated the default placeholder
  palette, and brought focus mode and drag/drop into the same shell treatment.
- Dependency-free Bun parsing/bundling passed for the eight changed shell modules
  and the updated Navbar test. `npm run check:legacy-theme` still passes across
  123 rendered-source files, and `git diff --check` passes.
- A usable dependency tree is still absent in this Proot workspace, so Vitest,
  the production build, and rendered viewport screenshots were not rerun. The
  three-viewport shell-verification checkbox remains open rather than inferring
  visual acceptance from source or the earlier static prototype.

### 2026-07-20 — final local acceptance (deployment pending)

- Completed the owned editorial system across the application shell, every
  overlay/secondary state, the default Markdown presentation, all content
  routes, loading/empty/offline/error/404 states, and deliberate light, dark,
  and reactive system modes. Server-rendered dark-cookie markup and reload
  assertions prove the selected mode does not flash the wrong theme.
- Adjusted light muted text from the intermediate `#627188` to `#5D6C82`
  after testing the accent-soft and Astryx keycap composite surfaces. The final
  automated contrast matrix passes every required pair: muted text is
  `5.10:1` on canvas, `5.34:1` on surface, `4.87:1` on raised,
  `4.78:1` on accent-soft, and `4.73:1` on the keycap composite; light/dark
  focus and control-border pairs also exceed 3:1.
- `npm run check:legacy-theme` passes across 123 rendered-source files with
  zero prohibited token/value/font or `neutralTheme` matches. The check is a
  production `prebuild` gate. Legacy compatibility CSS/tokens and generated
  migration backups are absent from the final worktree.
- `npm run lint` and `npm run typecheck` pass with zero warnings/errors.
  `npx vitest run --coverage --pool=threads --maxWorkers=1` passes 33/33
  files and 381 tests with one intentional skip (382 total); coverage is
  91.77% statements, 76.66% branches, 90.93% functions, and 92.12% lines.
  `npm run build` passes for Next.js 15.5.20 with the legacy gate, type/lint
  validation, 22 generated pages, and a 119 kB first-load editor route.
- The complete production-browser regression set passes in two memory-bounded
  batches: 43/43 existing E2E scenarios and 5/5 Phase 20 scenarios. The focused
  suite covers owned computed tokens and primitive families, genuine Tab-only
  navigation, 320px action retention/no overflow, reduced motion, light/dark/
  live-system persistence, dark Monaco, branded exceptional states, and zero
  serious/critical axe findings across the shell and overlay families.
- Regression investigation fixed issues rather than waiving them: Astryx
  keycap/blockquote contrast, keyboard-shortcut scroll-region focusability,
  workspace shortcuts swallowed by Monaco, missing Monaco command
  contributions, dark/system Monaco selection, preview scroll-origin
  normalization, and post-mount attachment of Monaco scroll/paste/keybinding
  integrations. All affected legacy tests were updated for the shipped shell.
- `artifacts/phase20/after/matrix/` contains the canonical 126-image after
  set across all 39 route/state IDs; `capture-results.json` is its manifest.
  Human review covered representative light/dark desktop, mobile menu, content,
  and exceptional states. Verdict: the slate/indigo surfaced workspace, Geist
  typography, editorial preview, progressive disclosure, and owned overlays
  are a clean first-glance break from the legacy charcoal/mint Dillinger UI.
- Root and all affected component `CLAUDE.md` files now identify the owned
  theme as authoritative and forbid legacy token, font, color, and neutral-
  theme fallback reintroduction. Phase progress is 42/44: only branch CI/OIDC
  deployment proof and the dependent final index closure remain open.
