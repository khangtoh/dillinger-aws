# 14d — Preview Pane & Rendered Markdown

Goal: re-theme the live markdown preview pane, including every rendered
markdown element (headings, links, code, blockquotes, tables, TOC), for
both light and dark mode.

Depends on: 14a (semantic tokens must exist first).

Owns: `components/preview/MarkdownPreview.tsx`, `app/globals.css`'s
`.preview-html` and `.dark.preview-html` rule blocks.

## Current state (for reference while migrating)

`app/globals.css` has ~30 hardcoded-hex rules under `.preview-html`
(light) and a separate, **incomplete** `.dark.preview-html` override
block (dark). Notably, several light-mode rules have no dark-mode
counterpart today — this is a real gap this phase should close, not just
recolor what already has both variants:

| Element | Light (has rule) | Dark override exists today? |
|---|---|---|
| Headings border | `#E8E8E8` | Yes (`#444`) |
| Links | `#35D7BB` | Yes (same `#35D7BB` — not adapted for dark) |
| Inline code / pre background | `#F5F7FA` | Yes (`#2d2d2d`) |
| Blockquote border/text | `#A0AABF` / `#666` | Yes (`#555` / `#aaa`) |
| Table borders/striping | `#E8E8E8` / `#f9f9f9` | Yes (`#444` / `#252525`) |
| TOC box | `border #E8E8E8`, `bg #F5F7FA` | Yes |
| `hr` | `#E8E8E8` | Yes (`#444`) |
| **Checkbox** (`input[type=checkbox]`) | margin only, no color | **No dark rule at all** |

## Tasks

### Token migration

- [x] Every literal hex in `.preview-html` replaced with `var(--color-*)`:
      `text-primary` (body text, headings inherit it — no separate
      heading color exists anymore, simpler than before), `border-subtle`
      (heading underlines, `hr`, table borders), `bg-surface`
      (code/pre/table-header backgrounds, TOC box), `text-secondary`
      (blockquote text), `border-strong` (blockquote left border,
      previously the odd choice of using the muted *text* color
      `#A0AABF` for a border).
- [x] `.preview-html a`'s `#35D7BB` → `var(--color-accent)`. Contrast
      against body/canvas flagged for 14h's WCAG audit rather than
      verified here (no interactive browser in this sandbox).
- [x] `.dark.preview-html` **entirely removed** — every property in it
      was a pure color override, so folding through `var(--color-*)`
      (already theme-aware) eliminated the whole block rather than just
      shrinking it. Net effect: ~60 lines of duplicated dark-mode CSS
      deleted.
- [x] Missing dark-mode checkbox styling fixed: added
      `accent-color: rgb(var(--color-accent))` to
      `input[type="checkbox"]` — didn't exist for **either** mode
      before, not just dark; a genuine pre-existing gap closed here.

### Component-level

- [x] `MarkdownPreview.tsx` simplified rather than just recolored: the
      component previously carried its own `enableNightMode` boolean
      and conditionally appended a local `dark` class + hardcoded
      `bg-[#1e1e1e]` to fake dark styling on top of `.preview-html`.
      Since `.dark.preview-html` no longer exists (folded into 14a's
      CSS vars, which already cascade from the `<html class="dark">`
      ancestor `ThemeProvider` sets), that entire local theme-detection
      path was dead weight — removed. The component no longer imports
      `useResolvedTheme` at all; both empty-state and rendered states
      now just use `bg-transparent` unconditionally and let the parent
      panel's `bg-surface` (from 14c) and the CSS-variable cascade
      handle theming.
- [x] Empty-state message `text-muted` → `text-secondary`.
- [x] Confirmed: this phase only touched presentation CSS/class names,
      not `DOMPurify`'s sanitize call or its config
      (`USE_PROFILES`/`ADD_ATTR`/`FORBID_TAGS` untouched) — XSS
      protection is unaffected.

### Verification

- [ ] Full rendered-markdown visual pass (headings, link, inline code,
      fenced code block, blockquote, table, TOC, hr, checkbox) in both
      themes — deferred to 14h (no interactive browser in this
      sandbox).
- [x] Checked for a syntax-highlight theme that might clash with the
      new `bg-surface` code background: `lib/markdown.ts` imports
      `highlight.js` for tokenizing but **no highlight.js theme
      stylesheet is imported anywhere in the repo** (confirmed by grep)
      — so there was nothing to swap; code blocks get `hljs-*` classes
      with no color rules applied to them today, independent of this
      phase.
- [x] `npx tsc --noEmit` and `npm run lint` clean. No preview component
      test file exists in `tests/` (confirmed by search — Monaco/preview
      rendering is Playwright-covered, not unit-tested), and
      `tests/lib/markdown.test.ts` (29 tests, pure rendering logic, no
      color assertions) passes unchanged.
