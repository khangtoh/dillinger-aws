# 14f — UI Primitives & Feedback

Goal: re-theme the small, reused-everywhere primitives — toast
notifications, loading skeletons, and the keyboard-shortcuts overlay —
onto the new palette. These are lower surface area than 14b–14e but
appear across nearly every user flow, so inconsistency here is
disproportionately visible.

Depends on: 14a (semantic tokens must exist first).

Owns: `components/ui/Toast.tsx`, `components/ui/Skeleton.tsx`,
`components/ui/KeyboardShortcuts.tsx`.

## Current state (for reference while migrating)

- `Toast.tsx`: implements `useToast()` / `ToastProvider`
  (`CLAUDE.md`'s documented pattern: `showToast('message', 'success')`),
  so it already has a variant concept (`'success'` and presumably
  `'error'`/`'info'`) — today likely mapped to ad hoc colors rather than
  the semantic `success`/`danger`/`warning` tokens 14a introduces.
- `Skeleton.tsx`: loading-state placeholders, currently likely a static
  gray with a shimmer/pulse animation — check whether the shimmer
  gradient itself is hardcoded (not just the base color).
- `KeyboardShortcuts.tsx`: an overlay listing keybindings (per
  `CLAUDE.md`'s documented shortcuts: zen mode toggle, escape, Vim/Emacs
  Monaco keybindings) — likely styled similarly to a modal.

## Tasks

### Toast

- [ ] Map each toast variant to its semantic token: `'success'` →
      `success`, `'error'` → `danger`, any `'warning'`/`'info'` variant
      → `warning` / `accent` respectively — confirm the full set of
      variants `Toast.tsx` actually supports before assuming only
      `'success'` exists (`CLAUDE.md`'s example only shows one call).
- [ ] Re-theme the toast surface (`bg-surface-raised`), border, and
      dismiss-button hover state consistent with modals (14e) for visual
      coherence between the two overlay types.
- [ ] Confirm toast entrance/exit animation (`animate-in` /
      `slide-in-from-right` per `tailwind.config.ts`'s existing keyframes)
      is unaffected — this phase changes colors, not motion; note this
      explicitly rather than silently touching animation timing.
- [ ] Confirm toast contrast holds at the `toast(60)` z-index layer
      against whatever surface happens to be behind it (could be canvas,
      a modal, or chrome, since toast renders above everything per
      `CLAUDE.md`'s z-index scale).

### Skeleton

- [ ] Re-theme the base skeleton color and shimmer/pulse gradient (if
      any) using new neutral-scale tokens (e.g. `bg-surface` at rest,
      a lighter/darker neutral stop for the shimmer highlight) —
      confirm the shimmer remains visible against both light and dark
      canvas without being distracting.
- [ ] Confirm `prefers-reduced-motion` handling (already present
      app-wide per `app/globals.css`'s existing media query) still
      applies to any skeleton animation after re-theming.

### Keyboard shortcuts overlay

- [ ] Re-theme the overlay surface, key-cap styling (the small boxed
      keybinding labels like `Cmd` `Shift` `Z`), and section headers
      onto `bg-surface-raised` / `border-subtle` / `text-primary` /
      `text-secondary` tokens.
- [ ] Confirm key-cap contrast is legible in both themes — these are
      small text elements and a common place for accessibility contrast
      failures.

### Verification

- [ ] `grep -rn "plum" components/ui` returns no matches.
- [ ] Trigger each toast variant, open the keyboard-shortcuts overlay,
      and view a loading skeleton state, in both light and dark mode.
- [ ] Run `tests/components/toast.test.tsx` and
      `tests/components/skeleton.test.tsx` — update any assertions
      pinned to old class/color names.
- [ ] `npx tsc --noEmit` and `npm run lint` clean.
