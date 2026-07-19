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
| Muted text | `#64748B` | `#94A3B8` |
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

- [ ] Capture current legacy-theme screenshots at 1440×900, 768×1024, and
      390×844 in light and dark modes; label them `before` evidence, not
      future visual baselines.
- [ ] Capture open-state screenshots for the sidebar, export menu, command
      palette, Settings dialog, one cloud-provider dialog, toast, and
      keyboard-shortcuts dialog.
- [ ] Inventory every legacy token name and prohibited color/font value in
      `tailwind.config.ts`, `app/globals.css`, `app/**`, and `components/**`;
      record the removal list in the Results log below.
- [ ] Inventory every place that mounts `neutralTheme` or applies a Tailwind
      color override to an Astryx component; record it as migration debt.
- [ ] Build a route/state screenshot matrix covering the editor, content
      routes, errors, empty/loading states, mobile navigation, and overlays.
- [ ] Validate the proposed light and dark palette token pairs with an
      automated contrast checker; record any adjusted values and the reason.
- [ ] Confirm the new wordmark treatment and app-shell direction in one
      desktop and one mobile static prototype before migrating components.

## Theme and token foundation

- [ ] Create the owned Dillinger Astryx theme module with complete light and
      dark semantic color tokens.
- [ ] Add typography, radius, elevation, spacing, focus, and motion tokens to
      the same owned theme layer.
- [ ] Replace `neutralTheme` in `Providers.tsx` with the owned theme while
      preserving the existing light/dark/system state behavior.
- [ ] Replace legacy Tailwind color token names with a semantic bridge to the
      owned theme; do not create aliases named `plum`, `bg-navbar`, or
      `bg-sidebar`.
- [ ] Add the Geist font variables to the owned theme and apply them at the
      root without layout shift.
- [ ] Replace the body canvas/text literals and global focus styling with
      owned tokens.
- [ ] Add unit tests proving all three theme modes select the owned theme and
      that `system` reacts to a media-query change.
- [ ] Add a build-time check that fails when prohibited legacy token names or
      values are introduced in rendered UI source.

## Application-shell migration

- [ ] Redesign the Navbar layout, wordmark, action grouping, hover/pressed
      states, and responsive overflow behavior using only owned tokens.
- [ ] Redesign the Sidebar surface, section hierarchy, document navigation,
      provider actions, and primary/destructive actions using only owned
      tokens.
- [ ] Redesign `DocumentList` selection, hover, metadata, empty, and overflow
      states; incorporate Phase 16 folder/tag states if that phase has landed.
- [ ] Redesign `DocumentTitle` and its dirty/saved states as part of the new
      workspace hierarchy.
- [ ] Redesign the formatting toolbar, including grouping, separators,
      pressed/disabled states, and mobile overflow.
- [ ] Redesign the editor/preview canvas, divider, pane headers, and resize or
      collapse affordances without changing Monaco/scroll-sync behavior.
- [ ] Redesign zen mode and drag/drop overlays using the same theme rather
      than a separate visual treatment.
- [ ] Verify the shell at all three target viewport sizes before proceeding
      to overlays; record screenshots in the Results log.

## Documents, overlays, and secondary surfaces

- [ ] Replace all legacy `.preview-html` colors, fonts, borders, radii, and
      spacing with owned document-presentation tokens.
- [ ] Restyle headings, links, code/pre, blockquotes, lists, tables, task
      lists, table of contents, KaTeX, and Mermaid output in both modes.
- [ ] Redesign the export DropdownMenu and command palette, including empty,
      filter, selected, keyboard-focus, and grouped-result states.
- [ ] Redesign Settings, delete confirmation, keyboard shortcuts, and all
      cloud-provider dialogs using shared overlay patterns and owned tokens.
- [ ] Redesign Toast, Skeleton, loading, empty, error, and offline states.
- [ ] Audit and migrate `app/error.tsx`, `app/not-found.tsx`, and every
      `app/(content)` route that exposes legacy or conflicting styling.
- [ ] Verify every Astryx primitive resolves the owned theme rather than
      `theme-neutral` defaults using computed-style assertions for at least
      one component from each primitive family.

## Responsive, accessibility, and motion validation

- [ ] Run keyboard-only checks through Navbar, Sidebar, toolbar, command
      palette, dialogs, editor/preview toggles, and document navigation.
- [ ] Run automated axe checks on the editor shell plus every overlay in
      light and dark modes; resolve all serious/critical findings.
- [ ] Verify text, icons, controls, focus rings, selected states, and danger
      states meet WCAG 2.2 AA contrast in both modes.
- [ ] Verify 200% zoom and 320px-wide rendering without lost actions,
      clipped dialogs, or horizontal page overflow.
- [ ] Verify `prefers-reduced-motion` removes non-essential transitions and
      preserves clear state changes.
- [ ] Verify light/dark/system persistence across reload and a fresh browser
      session without a flash of the wrong theme.

## Visual acceptance and cleanup

- [ ] Add Playwright screenshot coverage for every state in the route/state
      matrix at desktop, tablet, and mobile sizes where the layout differs.
- [ ] Review before/after pairs and record a clear verdict that the new shell,
      palette, typography, preview, and components cannot be mistaken for the
      legacy Dillinger UI.
- [ ] Run the prohibited-token/value check with zero application-source
      matches; historical spec text and labeled before-artifacts are the only
      allowed matches.
- [ ] Delete unused legacy Tailwind tokens, legacy global CSS, compatibility
      overrides, and temporary migration comments.
- [ ] Run lint, typecheck, unit, E2E, coverage, and production build; record
      exact results and investigate every regression.
- [ ] Deploy through the branch CI/OIDC path and hand the run URL plus visual
      evidence to Phase 18 for live-product acceptance.
- [ ] Update `CLAUDE.md` and any component-level contributor notes to describe
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
