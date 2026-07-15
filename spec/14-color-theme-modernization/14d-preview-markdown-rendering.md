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

- [ ] Replace every literal hex in `.preview-html` (light block) with
      `var(--color-*)` references: `text-primary` (body text),
      `border-subtle` (heading underlines, `hr`, table borders),
      `bg-surface` (code/pre/table-header backgrounds),
      `bg-surface-raised` (TOC box), `text-secondary` (blockquote text).
- [ ] Replace `.preview-html a` / `.dark.preview-html a`'s `#35D7BB` with
      `var(--color-accent)` — confirm the new accent has sufficient
      contrast as inline link text against **both** the light body-text
      background and the dark canvas (this is real reading content, held
      to a stricter bar than a UI chrome accent — verify in 14h's
      contrast audit, not just visually here).
- [ ] Fold `.dark.preview-html` overrides into the same rule using
      `var(--color-*)` (each variable already resolves differently under
      `:root.dark` per 14a) where possible, reducing duplicate CSS —
      only keep a separate `.dark.preview-html` block for properties that
      are genuinely structurally different between modes, not just a
      different color value for the same property.
- [ ] Add the missing dark-mode checkbox styling (`input[type="checkbox"]`
      accent-color or explicit border/background) — this is a real,
      pre-existing gap independent of the rebrand; fix it while every
      other rule in this file is being touched anyway.

### Component-level

- [ ] Re-theme any non-`.preview-html` chrome inside
      `MarkdownPreview.tsx` itself (e.g. an empty-state message, loading
      skeleton, or scroll-sync indicator if one exists) onto the new
      tokens.
- [ ] Confirm `DOMPurify`-sanitized user HTML content (per `CLAUDE.md`'s
      XSS Prevention section) isn't affected by this change — this phase
      only touches presentation CSS, not sanitization logic; note this
      explicitly in the PR description as a "did not touch" for
      reviewer confidence.

### Verification

- [ ] Render a markdown document exercising every styled element
      (headings, a link, inline code, a fenced code block, a blockquote,
      a table, a TOC, a horizontal rule, and a task-list checkbox) and
      visually confirm all read correctly in both themes.
- [ ] Confirm code block syntax highlighting (if `highlight.js` or
      similar is in use — check `lib/markdown.ts` / the preview renderer
      for a syntax theme) doesn't visually clash with the new
      `bg-surface` code background; swap the syntax-highlight theme too
      if needed, but only if the current one assumes the old
      background color.
- [ ] `npx tsc --noEmit` and `npm run lint` clean; run
      `tests/lib/markdown.test.ts` and any preview component tests to
      confirm no assertions on old literal hex values broke.
