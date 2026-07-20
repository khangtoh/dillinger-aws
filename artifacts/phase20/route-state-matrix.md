# Phase 20 route/state screenshot matrix

This matrix is the capture contract for Phase 20 `after` evidence. `D-L` and
`D-D` mean desktop light/dark. Tablet and mobile rows are required wherever
layout or action grouping changes. All screenshots must use deterministic data
and reduced motion.

## Editor shell and states

| ID | Route/state | D-L | D-D | Tablet | Mobile | Trigger or acceptance focus |
|---|---|:---:|:---:|:---:|:---:|---|
| E01 | Editor, default split view | ✓ | ✓ | ✓ | ✓ | New shell, title, toolbar, editor, preview |
| E02 | Sidebar open | ✓ | ✓ | ✓ | ✓ | Navigation hierarchy, scrim, primary/destructive actions |
| E03 | Export menu open | ✓ | ✓ | ✓ | ✓ | Grouping, selected/focus state, viewport fit |
| E04 | Command palette default | ✓ | ✓ | ✓ | ✓ | Search, groups, keyboard hints, focus |
| E05 | Command palette no results | ✓ | ✓ | — | ✓ | Empty state and query legibility |
| E06 | Settings dialog | ✓ | ✓ | ✓ | ✓ | Theme control, toggles, selects, dialog fit |
| E07 | GitHub connect dialog | ✓ | ✓ | — | ✓ | Provider empty/disconnected state |
| E08 | Provider connected/list state | ✓ | ✓ | — | ✓ | Loading, list selection, breadcrumbs |
| E09 | Delete confirmation | ✓ | ✓ | — | ✓ | Danger hierarchy and focus |
| E10 | Keyboard shortcuts | ✓ | ✓ | — | ✓ | Type scale, kbd treatment, viewport fit |
| E11 | Toast over editor | ✓ | ✓ | — | ✓ | Elevation, safe-area offset, dismissal |
| E12 | Initial hydration skeleton | ✓ | ✓ | ✓ | ✓ | No legacy charcoal bars; stable geometry |
| E13 | Empty/new document | ✓ | ✓ | — | ✓ | Title, blank editor, empty preview |
| E14 | Toolbar pressed/disabled states | ✓ | ✓ | ✓ | ✓ | State contrast and overflow behavior |
| E15 | Preview hidden/editor full width | ✓ | ✓ | ✓ | ✓ | Re-composition without blank regions |
| E16 | Zen mode | ✓ | ✓ | ✓ | ✓ | Focus surface and exit affordance |
| E17 | Drag/drop overlay | ✓ | ✓ | — | ✓ | Overlay hierarchy and owned tokens |
| E18 | Mermaid, KaTeX, table, code document | ✓ | ✓ | ✓ | ✓ | Full document-presentation token coverage |
| E19 | 200% zoom / 320px width | — | — | — | ✓ | No lost primary actions or page overflow |
| E20 | Offline/error toast | ✓ | ✓ | — | ✓ | Error language and non-color status cue |

## Routes

| ID | Route | D-L | D-D | Tablet | Mobile | Acceptance focus |
|---|---|:---:|:---:|:---:|:---:|---|
| R01 | `/` editor plus below-fold SEO content | ✓ | ✓ | ✓ | ✓ | Editor/content transition uses one brand |
| R02 | `/features` | ✓ | ✓ | — | ✓ | Header, cards, CTA, footer |
| R03 | `/ai` | ✓ | ✓ | — | ✓ | Stats, section labels, CTA |
| R04 | `/integrations` | ✓ | ✓ | — | ✓ | Provider rows and CTA |
| R05 | `/guide` | ✓ | ✓ | — | ✓ | Editorial prose and CTA |
| R06 | `/guide/best-online-markdown-editor` | ✓ | ✓ | — | ✓ | Long-form hierarchy and links |
| R07 | `/readme-editor` | ✓ | ✓ | — | ✓ | Tool content and CTA |
| R08 | `/markdown-viewer` | ✓ | ✓ | — | ✓ | Tool content and CTA |
| R09 | `/markdown-to-html` | ✓ | ✓ | — | ✓ | Tool content and CTA |
| R10 | `/compare` | ✓ | ✓ | — | ✓ | Comparison cards and hover states |
| R11 | `/compare/stackedit` | ✓ | ✓ | — | ✓ | Comparison table and CTA |
| R12 | `/compare/typora` | ✓ | ✓ | — | ✓ | Comparison table and CTA |
| R13 | `/compare/hackmd` | ✓ | ✓ | — | ✓ | Comparison table and CTA |
| R14 | `/compare/marklivedit` | ✓ | ✓ | — | ✓ | Comparison table and CTA |
| R15 | `/compare/markdownlivepreview` | ✓ | ✓ | — | ✓ | Comparison table and CTA |
| R16 | `/privacy` | ✓ | ✓ | — | ✓ | Legal prose and links |
| R17 | `/changelog` | ✓ | ✓ | — | ✓ | Timeline/list hierarchy |
| R18 | Unknown route / 404 | ✓ | ✓ | — | ✓ | Branded recovery action |
| R19 | Forced application error | ✓ | ✓ | — | ✓ | Branded error recovery action |

## Capture rules

- Capture at 1440×900, 768×1024, and 390×844 unless the row marks a viewport
  as not applicable.
- Store Phase 20 `after` images separately from [`before/`](before/).
- Exercise keyboard focus in menus, palette, dialogs, and toolbar-state rows.
- Capture both a stable default and at least one meaningful selected/pressed
  state for composite controls.
- Do not accept a screenshot if fonts, CSS, client hydration, or seeded data
  failed to load.
