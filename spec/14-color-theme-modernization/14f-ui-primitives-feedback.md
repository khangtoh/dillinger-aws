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

- [x] **Correction to this spec's own assumption**: `Toast.tsx`'s actual
      API is `notify(message: string, duration?: number)` — there is no
      variant parameter at all (no `'success'`/`'error'`/`'warning'`),
      contrary to what this task list (following `CLAUDE.md`'s example)
      assumed. Every call site (`useToast().notify(...)`) passes only a
      message string. No variant-to-token mapping exists to build — this
      task doesn't apply as written; noted here rather than silently
      dropped so the gap between `CLAUDE.md`'s documented pattern and
      actual behavior is visible.
- [x] Toast surface `bg-navbar` → `bg-chrome` (matching modal chrome
      from 14e for visual consistency between overlay types), dismiss
      button `focus-visible:ring-plum` → `focus-visible:ring-focus-ring`.
- [x] Entrance/exit animation (`animate-in`, the `opacity-0` exit
      transition) left untouched — confirmed no keyframe/timing values
      were touched, only color classes.
- [x] Toast renders via a fixed `bottom-4 right-4 z-toast` container —
      contrast reasoning: `bg-chrome` is a solid, always-dark
      background regardless of what's behind it (same chrome-stays-dark
      property established in 14b), so it doesn't depend on knowing
      what surface is beneath the toast layer.

### Skeleton

- [x] Base skeleton `bg-highlight` → `bg-surface-hover`; the sidebar
      skeleton's chrome background `bg-sidebar`/`bg-navbar` → `bg-chrome`,
      the canvas background `bg-primary` → `bg-canvas`, title-bar divider
      `border-light` → `border-subtle`. No separate shimmer gradient
      exists (`animate-pulse` is Tailwind's built-in opacity pulse, not a
      moving gradient) — nothing further to re-theme there.
- [x] `prefers-reduced-motion` handling lives in `app/globals.css`'s
      existing global media query (untouched by this phase) and applies
      to `animate-pulse` the same as any other animation — no
      per-component change needed.

### Keyboard shortcuts overlay

- [x] Overlay surface `bg-navbar` → `bg-chrome`, header text
      `text-invert` → `text-inverse`, close button
      `hover:text-plum`/`focus-visible:ring-plum` → `hover:text-accent`/
      `focus-visible:ring-focus-ring`, section labels and action text
      `text-muted` → `text-secondary`, key-cap chips `bg-highlight` →
      `bg-surface-hover`.
- [x] Key-cap contrast: `text-inverse` on `bg-surface-hover`, both
      always-dark-chrome-relative tokens (this overlay lives on
      `bg-chrome`, itself always dark) — high-contrast by construction
      in both themes since chrome doesn't invert. Flagged for 14h's
      formal WCAG check rather than asserted as verified here.

### Verification

- [x] `grep -rn "plum\|bg-navbar\|bg-sidebar\|bg-primary\|bg-highlight\|border-light\|text-invert\|text-muted" components/ui` — zero matches.
- [ ] Manual trigger-toast / open-shortcuts / view-skeleton visual pass
      in both themes — deferred to 14h (no interactive browser in this
      sandbox).
- [x] `tests/components/toast.test.tsx`: 3 pre-existing failures
      confirmed via `git stash` to exist on the pre-Phase-14 commit too
      (fake-timer/dismiss-animation related, unrelated to this change).
      `tests/components/skeleton.test.tsx`: all passing, no assertions
      on literal class names to update. No `KeyboardShortcuts` test
      file exists in the repo (confirmed by search) — nothing to update
      there.
- [x] `npx tsc --noEmit` and `npm run lint` clean.
