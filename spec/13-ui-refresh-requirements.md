# Phase 13 — UI Refresh & Product Direction: Requirements and Evaluations

Goal: decide, on paper, what "modern Dillinger" means beyond "runs on
Lambda" — the UI layer, the design system it's built on, and how far the
product evolves toward AI-native/agent-native use — before any component
migration or new information-architecture code is written.

Depends on: None (design/research only). Assumes the Phase 1-12 milestone
("Dillinger is live on AWS Lambda" — see `spec/README.md`) is the runtime
foundation this UI work sits on top of; nothing here touches
`infra/`, the Lambda packaging, or the microVM/gateway/multi-tenancy model.

## How to read this phase

This is a **requirements and evaluation** phase, not an implementation
phase — same role Phase 2 played for the infra decision. Sections A-E
below are the five evaluation asks; each ends with findings. The
**Decisions** section converts findings into concrete, checked-off
choices that Phases 14-18 implement. Anything that is a genuine
product/business call (not a technical fact) is called out separately in
**Open questions for the user** at the end rather than silently decided.

---

## A. Current UI implementation & design-system audit

Audited: `tailwind.config.ts`, `app/globals.css`, `components/**`,
`stores/store.ts`, `next.config.mjs`, and every `components/*/CLAUDE.md`.

**Findings:**

- **No design-system library.** Every component (`Navbar`, `Sidebar`,
  `SettingsModal`, `Toast`, `DeleteConfirmModal`, the five cloud-provider
  modals, `KeyboardShortcuts`, `Skeleton`) is hand-built directly against
  Tailwind utility classes. There is no Radix/Headless UI/shadcn
  primitive layer underneath — focus trapping, `Escape`-to-close,
  `aria-expanded`/`aria-controls`, and click-outside handling are all
  reimplemented per component (see `Sidebar.tsx`'s `CollapsibleSection`
  and `Navbar.tsx`'s export dropdown as two independent implementations
  of the same "dismissible panel" pattern).
- **Design tokens exist but are thin.** `tailwind.config.ts` defines a
  thoughtful but small token set: 12 semantic colors (all hard-coded hex,
  no light/dark pair — `darkMode: "class"` is configured but no component
  actually branches on it), a z-index scale (sidebar→toast, 8 layers,
  documented in `CLAUDE.md`), one spacing token (`sidebar: 270px`), and
  two custom easing/duration values. There is no type scale, no
  elevation/shadow scale, and no documented breakpoint strategy beyond
  Tailwind defaults.
- **No `.impeccable.md`** exists in the repo despite `CLAUDE.md`
  referencing it as "Design system & context" — the design-system
  documentation described in the project's own contributor guide doesn't
  exist yet. This audit is effectively the first real design-system
  documentation for this codebase.
- **State/UI coupling is direct.** `stores/store.ts` (Zustand) owns both
  document state (`documents: Document[]`, flat — no folder/tag/parent
  field, confirmed by reading the full state shape) and raw UI toggles
  (`sidebarOpen`, `settingsOpen`, `zenMode`, `previewVisible`,
  `shortcutsOpen`). Component-local UI state (which cloud-service accordion
  is open, which modal is active) uses `useReducer`, not the store — a
  reasonable split, but undocumented as a convention.
- **Content marketing pages already exist** under `app/(content)/*`
  (`/compare`, `/ai`, `/features`, `/guide`, `/integrations`,
  `/changelog`, `/markdown-to-html`, `/markdown-viewer`,
  `/readme-editor`) with real SEO copy — including a `/compare` page that
  already names StackEdit, HackMD, Typora, and an `/ai` page that already
  claims "the AI markdown editor." **This is copy, not product**: nothing
  in `components/` or `hooks/` talks to an LLM, exposes an MCP server, or
  gives an agent a stable way to drive the editor. Section E treats this
  gap as the real work.
- **Accessibility is already a genuine strength.** Every interactive
  element in the audited components carries `aria-label`,
  `focus-visible:ring-2` treatment, and keyboard support (`Escape`,
  click-outside); `KeyboardShortcuts.tsx` documents a real shortcut set.
  Any design-system replacement must not regress this — it's a bar to
  clear, not a gap to fill.
- **No component/pattern reuse layer.** `CollapsibleSection`,
  `ServiceButton`, dropdown-menu logic, and modal chrome (backdrop +
  panel + close button) are each written once per usage site with no
  shared primitive. This is the concrete, current-codebase version of
  "core requirement is a UI layer refresh": the app works, but every
  interactive pattern is bespoke and will keep being bespoke as the
  product grows (Section D) unless a component layer is adopted.

**Conclusion:** there is no existing design system to preserve or extend —
this is a green-field adoption decision, not a migration between two
systems. The current UI's real assets worth keeping through any refresh
are: the plum-accent visual identity, the documented z-index scale, and
the accessibility bar already met.

---

## B. Astryx evaluation (`facebook/astryx`)

Researched via the live repo, its wiki, `packages/core/README.md`, and
the published site (`facebook.github.io/astryx`).

**What it is:** a React + StyleX design system that grew inside Meta over
eight years (13,000+ internal apps), open-sourced under MIT, currently
beta (`v0.1.4` as of this writing, 8,000+ stars, active — 2,469 commits).
150+ accessible components, seven swappable themes, a pattern library
(tables, forms, wizards, navigation), and a CLI for tokens/docs/theming/
upgrade codemods.

**Integration fit with this codebase specifically:**

- **StyleX is not required.** Astryx ships pre-built CSS; the
  documented Next.js App Router + Tailwind integration is a `globals.css`
  `@layer` addition (`reset, theme, base, astryx-base, astryx-theme,
  components, utilities`) plus three `@import`s and a
  `tailwind-theme.css` bridge that exposes Astryx tokens as Tailwind
  utilities (`bg-surface`, `text-primary`, etc.). No PostCSS/Babel/build-
  plugin changes. This is compatible with the current stack (Next.js
  14.2.35 App Router, Tailwind 3.4.1, no existing CSS-in-JS) without a
  framework migration.
- **"Swizzle" solves the "hand-built modal/dropdown" problem in A.**
  Astryx's stated design principle is that components aren't locked
  behind a closed API — `swizzle` ejects a component's full source into
  the project to own and modify. That directly replaces the
  reimplemented-per-site dismissible-panel/dropdown pattern with one
  owned, shared implementation, while still allowing the plum-accent
  brand identity to be preserved (themes are CSS custom properties,
  overridable without forking).
- **Peer requirements are already met:** React 18+, ReactDOM — both
  already in `package.json`.
- **Risk: beta maturity.** `v0.1.4`, 133 open issues, MIT but young.
  Treat as "adopt behind a spike, not a big-bang rewrite" — Phase 14 is
  explicitly a go/no-go spike for this reason, not a commitment.
- **The "agent ready" claim is aspirational, not yet shipped.** The
  project's own wiki (`AI-and-Design-Systems`) is design *thinking*
  about why AI-generated UI code drifts (arbitrary Tailwind values like
  `mt-[13px]`, inconsistent styling across sessions, low-level utility
  classes lacking semantic meaning for a model to learn from) and argues
  for typed component APIs as the fix — compile-time errors as fast
  recovery for an agent, not documentation an agent might ignore. But
  the wiki **explicitly has no published CLI/MCP integration or agent
  workflow examples yet**. What Dillinger gets today from Astryx is: a
  typed, semantic component API (the actual enforcement mechanism) and a
  CLI for tokens/docs — real, present-day levers that make agent-authored
  UI changes more consistent, even though the "AI agents and build tools
  use the same API that powers the CLI" story is partly roadmap. Section
  E treats what's real vs. aspirational explicitly so Phase 17 doesn't
  build on a feature that doesn't exist yet.

**Conclusion:** Astryx is a credible, low-risk-to-trial replacement for
the current ad hoc component layer — real integration path, real
ownership model via swizzle, real typed API. Its agent-native pitch is
directionally right but partly unshipped; Dillinger should adopt what's
real (typed components, themeable tokens, swizzle ownership) and not wait
on or depend on the unshipped agent-tooling roadmap.

---

## C. UI requirements to exceed StackEdit

StackEdit's current published feature set (researched): two-pane editor
with **scroll-synced live preview**, WYSIWYG-style formatting toolbar,
Markdown syntax highlighting tuned to visualize final rendering, a file
explorer with **folders and subfolders**, sync to Google Drive/Dropbox/
GitHub with **collaborative merge** when two people edit the same file,
GFM + Markdown Extra + LaTeX + UML + emoji support, offline-first local
storage, and a paid Pro tier gating some of the above.

**Where Dillinger-aws already matches or exceeds StackEdit today:**

- Cloud sync breadth: 5 providers (GitHub, Dropbox, Google Drive,
  OneDrive, Bitbucket) vs. StackEdit's 3.
- No account/signup required, no Pro-tier paywall for core editing.
- Export breadth: Markdown, HTML, styled HTML, and PDF vs. StackEdit's
  export set.
- Already runs on serverless infrastructure with per-user isolation
  (Phase 9) — a stronger privacy/isolation story than a shared SaaS.

**Where Dillinger-aws is behind (confirmed against `store.ts`, `A` above):**

1. **No folders/subfolders or any document hierarchy** — `Document[]` is
   flat. StackEdit organizes; Dillinger-aws lists.
2. **No formatting toolbar** — Monaco is bound directly with no WYSIWYG-
   style button row; markdown must be typed or use keyboard shortcuts.
3. **No scroll-sync between editor and preview** — confirmed absent from
   `stores/store.ts` (state tracks `editorScrollPercent`/`editorTopLine`
   but `MarkdownPreview.tsx` and `EditorContainer.tsx` were not found
   wiring these to a synced preview scroll position in this audit; verify
   and close the gap explicitly as a Phase 15 task rather than assume).
4. **No LaTeX/UML authoring aids** — KaTeX CSS is already a dependency
   (`app/globals.css` imports `katex/dist/katex.min.css`) implying math
   rendering exists in preview, but there's no toolbar/snippet help for
   *authoring* it, and no UML (Mermaid-class) support at all.
5. **No collaborative editing or conflict-aware merge** — out of scope
   for a stateless, per-tenant-isolated Lambda architecture unless a
   real-time layer is deliberately added (flagged as an open question,
   not assumed).

**New UI requirements to define "better than StackEdit," not just parity:**

- **UI-1**: Optional document hierarchy (folders/tags — resolved in
  Section D) surfaced in the sidebar, replacing the flat `DocumentList`.
- **UI-2**: A lightweight, dismissible formatting toolbar above Monaco
  (bold/italic/heading/list/link/code/table/math/diagram inserts), built
  as Astryx components so it's themeable and agent-consistent (Section E)
  rather than another bespoke button row.
- **UI-3**: True scroll-sync between editor and preview panes (percentage-
  or line-anchored), closing gap #3 above.
- **UI-4**: First-class Mermaid/diagram-as-code preview support alongside
  the existing KaTeX math support, closing gap #4.
- **UI-5**: A command palette (⌘K-style) for document switching, format
  actions, and export — a category StackEdit doesn't have at all, and a
  natural fit for Astryx's pattern library plus the agent-native
  direction in Section E (the same palette becomes an agent action
  surface, not just a human shortcut).
- **UI-6**: Full light/dark/system theming using the `darkMode: "class"`
  config that already exists but is currently unused by any component —
  turn the configured-but-dormant capability into a real, tested feature.
- **UI-7**: Every requirement above must ship without regressing the
  accessibility bar documented in Section A (keyboard nav, focus rings,
  ARIA roles) — treat current a11y coverage as a regression gate, not an
  aspiration.

---

## D. Product direction: multi-document manager vs. notes-management app

**The question:** should the UI refresh aim at "a better web UI for
managing more than one markdown document" (StackEdit's actual scope), or
push further toward a full notes-management app (Notion/Obsidian/Bear-
class: nested notebooks, backlinks, tagging, full-text search, daily
notes) running on the same Lambda microVM foundation?

**Evaluation:**

| Dimension | Multi-doc manager (StackEdit-class) | Notes-management app (Obsidian/Bear-class) |
|---|---|---|
| Fit with current architecture | High — flat `Document[]` + folders is an additive, non-breaking evolution of `stores/store.ts` | Lower — backlinks/full-text search/graph views need new indexing, likely a client-side search index (e.g. an in-browser inverted index) since there's deliberately no server DB (Phase 1-12 non-goal) |
| Fit with "no self-hosted database" non-goal | Fully compatible — folders/tags are still client-side (Zustand + localStorage/IndexedDB) | Compatible but harder — a growing note graph in localStorage alone gets slow; would need IndexedDB and a real query layer, still client-side, still no server DB, but more engineering | 
| Time to a shippable v1 | Short — UI-1 through UI-7 above are additive component/state work | Long — new mental model (notes vs. documents), new navigation (graph/backlink UI), new content model |
| Competitive differentiation | Meaningful but StackEdit already occupies this exact space | High — very few *serverless, per-user-isolated, zero-signup* notes apps exist; this pairs uniquely with the Phase 9 multi-tenancy story |
| Risk of scope creep vs. the stated goal ("modern Dillinger... UI refresh") | Low | High — this changes what the product *is*, not just how it looks |

**Recommendation (recorded as a decision below, revisable by the user):**
**Stage the multi-doc manager as the v1 UI-refresh target (Section C's
UI-1..UI-7), and treat full notes-app depth (backlinks, graph view, full-
text search, daily notes) as an explicit, separately-scoped v2 initiative
gated on v1 shipping.** Rationale: the stated goal for this planning pass
is a UI refresh on a proven runtime, not a product-category pivot; folders
+ tags + search-by-title is enough hierarchy to beat StackEdit's UI (Section
C) without taking on the open-ended scope of a notes graph. The
architecture doesn't foreclose v2 — IndexedDB-backed full-text search and
a backlink index are additive to the same client-only-state model — so
nothing in v1 needs to be built to be thrown away.

---

## E. Astryx for user-customizable UI and AI-first/agent-native product

Two related but distinct asks: (1) does Astryx make it easier for *end
users* to reskin/customize the app to their taste, and (2) does it make
Dillinger-aws AI-ready/AI-first/agent-native as a *product*.

**(1) End-user customization:**

- Astryx themes are CSS custom properties layered via the `astryx-theme`
  `@layer`, overridable without forking component code, with seven
  built-in themes as a starting palette. This is directly usable for a
  real, shippable feature the current app doesn't have: a **user-facing
  theme picker** in `SettingsModal.tsx` that swaps CSS custom-property
  values (not just the existing `darkMode: "class"` binary) — letting
  users pick an accent/density/contrast preset, persisted via the
  existing Zustand settings persistence path (`UserSettings` in
  `lib/types`), no new infra.
- Swizzle extends this from "pick a theme" to "own a component": a power
  user (or an agent acting for them, see (2)) can eject e.g. the toolbar
  or sidebar component and modify it directly, which the current
  hand-rolled components already effectively require (there's no
  abstraction to swizzle *out of* today) — Astryx makes that an
  intentional, supported workflow instead of "edit the file and hope."

**(2) AI-first / AI-ready / agent-native — what's real vs. what Dillinger
must build itself:**

Per Section B, Astryx's typed-component-API argument is the real,
usable-today lever (constrained props, compile-time errors, semantic
component names an LLM can pattern-match against) — but the CLI/MCP
agent-tooling story is roadmap, not shipped. Two implications:

- **Use what's real now:** requiring all new UI (Section C) to be built
  from Astryx's typed component set, rather than raw Tailwind div soup,
  directly reduces the "arbitrary `mt-[13px]` values" drift problem the
  Astryx wiki describes — this benefits *any* future agent (Claude Code
  or otherwise) editing this codebase, immediately, independent of
  Astryx's own roadmap shipping.
- **Don't wait on Astryx for product-level agent-nativeness.** "AI-ready,
  AI-first, agent-native" as a *product* claim (distinct from "built with
  an agent-friendly component library") means Dillinger itself exposes
  stable, documented surfaces an agent can drive — which nothing in
  Astryx provides, because that's an application concern, not a design-
  system concern. Concretely, three product-level capabilities close the
  gap between the existing `/ai` marketing page's claims (Section A) and
  reality:
  - **AI-1 — Document API stability**: the same client-state contract
    (`Document` shape, create/update/delete actions) that the UI already
    uses, exposed as a documented, versioned surface so an external agent
    (browser extension, CLI, MCP client) can read/write documents without
    reverse-engineering `stores/store.ts`.
  - **AI-2 — An MCP server for Dillinger documents**: given the app is
    already a stateless Lambda function with no server DB (Phase 1-12), a
    thin MCP server (could itself be a Lambda, or a route handler) that
    lets an agent list/read/write/export a user's documents is the
    concrete "agent-native" feature the `/ai` page currently only claims
    in copy. This is new application surface, not a UI-refresh task, but
    it's the natural Phase 17 payoff of doing Section C's UI work on a
    typed, agent-legible component base.
  - **AI-3 — In-editor AI actions**: given UI-5's command palette
    (Section C), wire actual model-backed actions (summarize selection,
    fix formatting, generate a heading outline) behind it — turning the
    palette into the same "agent action surface" mentioned in UI-5,
    usable by both the human and, via AI-2, an external agent.

**Conclusion:** Astryx materially helps (1) end-user customization (real,
shippable now) and helps (2) indirectly by giving human and AI-authored UI
code the same typed, constrained vocabulary — but "agent-native product"
requires Dillinger-specific work (AI-1..AI-3) that no design-system
adoption alone provides. Phase 17 scopes that work explicitly so it isn't
lost inside "just a UI refresh."

---

## Decisions

- [x] **Design system**: adopt Astryx (`@astryxdesign/core` +
      `@astryxdesign/theme-neutral` or a closer-to-plum starting theme)
      behind an explicit spike/go-no-go gate (Phase 14), not a big-bang
      rewrite — mirrors how Phase 2 gated the container-image decision
      before Phase 3 executed it.
- [x] **Coexistence, not replacement, of Tailwind**: keep Tailwind for
      layout/spacing utilities per the documented `tailwind-theme.css`
      bridge; Astryx supplies components and tokens, not a full framework
      swap. No PostCSS/build-plugin changes.
- [x] **Product direction for this UI-refresh initiative**: multi-document
      manager (StackEdit-class, Section C's UI-1..UI-7), not a full
      notes-management pivot. Full notes-app depth (backlinks, graph,
      full-text search) is explicitly deferred to a v2 initiative, not
      in scope for Phases 14-18.
- [x] **New UI requirements in scope for this initiative**: UI-1 through
      UI-7 (Section C), all gated on the existing accessibility bar
      (UI-7) as a hard regression check, not a nice-to-have.
- [x] **AI-native scope for this initiative**: build AI-1 (document API
      stability) and AI-3 (command palette + AI actions) as part of this
      UI refresh (Phase 17); scope AI-2 (a real MCP server) as a follow-on
      phase once AI-1's contract exists, since it depends on AI-1 being
      stable first — do not build the MCP surface against a state shape
      that's still moving.
- [x] **Do not block this phase's downstream work on Astryx's unshipped
      agent CLI/MCP tooling** — use its typed component API and theming
      today; treat any future Astryx agent tooling as a possible upgrade,
      not a dependency.

## Final direction summary

Dillinger-aws's UI refresh adopts Astryx as a typed, themeable component
layer (spiked and gated in Phase 14, migrated component-by-component in
Phase 15) to replace the current hand-rolled Tailwind components while
preserving the existing accessibility bar and plum-accent identity. On
top of that base, the product gains real folders/tags-level document
organization and StackEdit-beating editor UX (toolbar, scroll-sync,
diagrams, command palette, real light/dark theming — Phase 16 for the
data model, Section C's UI-1..UI-7 for the surface), explicitly stopping
short of a full notes-app pivot for this pass. Separately, "AI-first" and
"agent-native" stop being marketing copy on `/ai` and become a real,
versioned document-state contract plus in-editor AI actions behind the
new command palette (Phase 17), with a full MCP server for external agent
access scoped as the natural next phase once that contract is stable.
Phase 18 holds all of the above to the same "prove it, don't just build
it" bar the Lambda migration used in Phase 8.

## Open questions for the user

These are business/product calls, not technical facts — recorded here so
they aren't silently decided, per this phase's own convention of not
letting a scheduled agent guess on genuinely ambiguous items:

- Should the Astryx theme starting point deliberately match the current
  plum (`#35D7BB`) brand, or is a broader rebrand in scope for this UI
  refresh? (Phase 14 assumes "match current brand" unless told otherwise.)
- Is real-time collaborative editing (StackEdit's merge feature) ever in
  scope, given it's structurally in tension with the stateless,
  per-tenant-isolated Lambda architecture (Phase 9/`ARCHITECTURE.md`)? (
  Assumed **out of scope** for v1 and v2 above unless the user says
  otherwise — flagging because it's the one StackEdit capability this
  plan doesn't attempt to match or beat.)
- Priority/sequencing of AI-2 (the MCP server) relative to the v2
  notes-app initiative from Section D — both are natural "next big thing"
  candidates after this phase set ships; this doc doesn't rank them
  against each other.
