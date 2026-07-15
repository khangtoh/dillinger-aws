# 14e — Modals & Overlays

Goal: re-theme every modal dialog — settings and all five cloud-storage
OAuth connect dialogs, plus the delete-confirmation dialog — onto the new
palette, including their overlay/backdrop, z-index-layered surfaces
(per `CLAUDE.md`'s z-index scale: `modal(50)` above `toast(60)`... note
toast is actually *above* modal per that scale, confirm this is
intentional and preserved, not accidentally inverted during this pass).

Depends on: 14a (semantic tokens must exist first).

Owns: `components/modals/SettingsModal.tsx`,
`components/modals/GitHubModal.tsx`,
`components/modals/DropboxModal.tsx`,
`components/modals/GoogleDriveModal.tsx`,
`components/modals/OneDriveModal.tsx`,
`components/modals/BitbucketModal.tsx`,
`components/modals/DeleteConfirmModal.tsx`.

## Current state (for reference while migrating)

All 7 modal components reference `plum` (per the earlier repo-wide grep).
`SettingsModal.tsx` additionally uses `border-settings` and `switchery`
(the toggle-switch track color, per Tailwind config) — both retired in
14a. `DeleteConfirmModal.tsx` uses ad hoc red styling for the destructive
action, not a shared token — this phase introduces the `danger` semantic
token from 14a specifically so this stops being ad hoc.

## Tasks

### Shared modal chrome

- [ ] Re-theme the shared backdrop/overlay treatment (likely a fixed,
      semi-transparent full-screen div behind every modal) onto a
      `bg-canvas`-derived overlay token — confirm all 7 modals use the
      same overlay opacity/color today before consolidating; if they've
      drifted apart, converge them as part of this task.
- [ ] Re-theme each modal's surface (`bg-surface-raised`), border
      (`border-subtle`), and close-button hover state
      (`hover:text-accent` or `hover:bg-surface-hover`) consistently
      across all 7 files.
- [ ] Confirm the z-index layering documented in `CLAUDE.md`
      (`modal(50) < toast(60)`) is unchanged by this pass — this task is
      purely visual, not structural, but modals are exactly where a
      copy-paste z-index typo would hide.

### Settings modal specifics

- [ ] Replace `border-settings` divider usage with `border-subtle`.
- [ ] Replace the `switchery` toggle-track color (theme toggle, vim-mode
      toggle, etc.) with a new `bg-toggle-track` / `bg-toggle-track-active`
      pair — active state should use `accent`, matching how toggles
      typically communicate "on" state.
- [ ] If 14a's `ThemeProvider` added a light/dark/system selector, wire
      it into `SettingsModal.tsx` here (this is likely where a
      user-facing theme switcher belongs) — confirm with 14a whether the
      UI control itself is in scope for 14a or deferred to this file;
      resolve any ambiguity before starting, don't duplicate the control
      in two places.

### OAuth connect modals (GitHub, Dropbox, Google Drive, OneDrive, Bitbucket)

- [ ] Re-theme each provider's modal body (form fields, "Connect"
      button, cancel/close) onto `accent` / `bg-surface-raised` /
      `text-primary` tokens, keeping each provider's own brand-colored
      logo/icon untouched — provider brand marks (GitHub octocat,
      Dropbox logo, etc.) are third-party trademarks and are explicitly
      **not** part of this rebrand's scope; only this app's own chrome
      around them changes.
- [ ] Confirm error/validation states (e.g. invalid token, failed OAuth
      callback) use the new `danger` token instead of any hardcoded red.

### Delete confirmation modal

- [ ] Replace `DeleteConfirmModal.tsx`'s ad hoc destructive-action red
      with the `danger` token from 14a, applied consistently to both the
      confirm button and any warning icon/text.
- [ ] Confirm the non-destructive "Cancel" action is visually
      de-emphasized relative to "Delete" using neutral tokens, not
      another bright color competing with `danger`.

### Verification

- [ ] `grep -rn "plum\|border-settings\|switchery" components/modals`
      returns no matches.
- [ ] Manually open each of the 7 modals in both light and dark mode;
      confirm consistent chrome and no leftover hardcoded colors.
- [ ] Run `tests/components/settings-modal.test.tsx`,
      `tests/components/github-modal.test.tsx`, and
      `tests/components/delete-confirm-modal.test.tsx` — update any
      assertions on old class names, don't just make them pass by
      weakening them.
- [ ] `npx tsc --noEmit` and `npm run lint` clean.
