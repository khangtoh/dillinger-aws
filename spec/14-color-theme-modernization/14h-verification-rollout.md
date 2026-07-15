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

- [ ] `grep -rn "35D7BB\|plum\|bg-sidebar\|bg-navbar\|bg-highlight\|bg-button-save\|border-settings\|switchery\|dropdown-link\|icon-default" --include="*.ts" --include="*.tsx" --include="*.css"` across the whole repo returns **zero** matches outside of `spec/13-editor-selection-highlight-bug.md` and this phase's own spec files (historical record, not live code) — this is the single task that proves "moved entirely away from Dillinger's current brand color," not just "added a new one alongside it."
- [ ] Remove the now-dead literal-hex color entries from
      `tailwind.config.ts` (the task 14a deferred to here specifically so
      it wouldn't break 14b–14g mid-migration).
- [ ] Confirm no component still imports or references a hardcoded hex
      color string that duplicates a semantic token's value (a common
      half-migration bug: the class name changed but a `style={{ color:
      "#..." }}` inline override was missed).

### Accessibility / contrast audit

- [ ] Run every text/background pairing defined in 14a's token table
      through a WCAG contrast checker (e.g. the same tool/method used
      for any prior accessibility work in this repo, or a scriptable
      contrast-ratio check) for both light and dark mode: body text on
      canvas, secondary text on canvas, text-inverse on chrome,
      text-on-accent on accent, link text in the preview pane on its
      background.
- [ ] Confirm every pairing meets **WCAG AA** (4.5:1 for normal text,
      3:1 for large text/UI components) per `CLAUDE.md`'s stated
      accessibility principle — this is a hard requirement, not
      best-effort; if the proposed accent fails against one background,
      that's a finding to take back to 14a's palette, not something to
      wave through.
- [ ] Confirm focus rings (`focus-ring` token) are visible against every
      surface they can appear on (canvas, chrome, surface-raised,
      accent-colored buttons).
- [ ] Confirm the `success` / `warning` / `danger` semantic tokens are
      distinguishable from each other and from `accent` for a
      deuteranopia/protanopia simulation (common red-green color
      vision deficiency) — don't rely on color alone to distinguish
      toast variants; confirm icons/text already carry the meaning
      redundantly (check `Toast.tsx`'s existing variant icons, if any).

### Visual regression / cross-surface coherence

- [ ] Full manual pass through every surface touched by 14b–14g, in
      both light and dark mode, using the theme-preference toggle added
      in 14a (not just OS-level dark mode): navbar, sidebar, editor,
      preview, all 7 modals, toasts, skeletons, keyboard-shortcuts
      overlay, 404/error pages, and at least 3 marketing content pages.
- [ ] If Playwright visual/screenshot tests exist for any of these
      surfaces (check `tests/e2e/`), update baseline screenshots and
      confirm they pass; if none exist for a given surface, note that as
      a gap rather than silently skipping verification for it.
- [ ] Run the full test suite: `npm run verify` (lint + typecheck + unit
      + E2E per `CLAUDE.md`'s Quick Reference) clean from a fresh
      install.
- [ ] Confirm coverage hasn't regressed below the documented baseline
      (98% statements / 91% branches / 99.5% functions / 98% lines per
      `CLAUDE.md`) — a pure styling change shouldn't reduce coverage,
      but renamed class names can break assertions in ways that
      silently reduce effective test value even if the numeric
      percentage holds.

### Documentation

- [ ] Update `CLAUDE.md`'s "Design Context" section (Brand Personality,
      Theme Modes, and the specific "#35D7BB... single bright voice"
      line) to describe the new palette instead of the old one.
- [ ] Update or remove the `.impeccable.md` reference in `CLAUDE.md`'s
      Key Files Reference table if that file doesn't actually exist in
      the repo (confirmed absent as of this phase being written) — either
      create it as the actual design-system reference this phase
      produces, or stop pointing to a nonexistent file.
- [ ] Update any screenshot or color swatch embedded in `README.md` /
      `ARCHITECTURE.md` if either references the old brand color
      visually, not just in prose.

### Rollout

- [ ] Confirm this phase's changes are pure client-side styling with no
      new environment variables, infra changes, or API surface changes
      — so rollout is a normal deploy through the existing Phase 7 CI/CD
      pipeline and Phase 11 orchestrator, not a special procedure.
- [ ] Deploy to the `staging` tenant via the existing deploy workflow and
      visually confirm the new theme is live, the same way Phase 13's
      fix is documented as still pending a redeploy in
      `spec/README.md`'s Status section — update that Status section's
      Phase 13 entry and add a Phase 14 entry once this phase's changes
      are actually live, not just merged.
- [ ] Record a rollback note: reverting this phase is a straightforward
      revert of the merged PRs (styling-only, no data migration), but
      call out explicitly if 14a's `themePreference` addition to
      `stores/store.ts`'s persisted schema needs a compatibility note
      for users who already have the old (theme-preference-less) schema
      cached in `localStorage`.
