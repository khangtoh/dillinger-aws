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

- [x] All 7 modals confirmed to share the same backdrop pattern
      (`absolute inset-0 bg-black/50`, click-to-close) — left as-is
      (a raw black scrim rather than a token, which is intentional:
      it needs to darken whatever's behind it regardless of theme, not
      shift color with it).
- [x] Modal surfaces `bg-navbar` → `bg-chrome` (matching 14b's app
      chrome — modals visually read as an extension of the same dark
      chrome, not a separate surface color), borders `border-settings`
      → `border-subtle`, close-button hover `hover:text-plum` →
      `hover:text-accent`, consistent across all 7 files.
- [x] Z-index classes (`z-modal`, `z-settings`) untouched — confirmed
      unchanged by grepping the diff, this was a token/color-only pass.

### Settings modal specifics

- [x] `border-settings` → `border-subtle` (done in 14a, when
      `SettingsModal.tsx` first needed fixing to keep the build green
      after `enableNightMode` was removed).
- [x] `switchery` → `bg-surface-hover` for the toggle track's off-state;
      `plum`/`accent` for the on-state — resolved without a dedicated
      `bg-toggle-track` pair as originally proposed: the existing
      `bg-surface-hover`/`accent` tokens already express "off (neutral)"
      vs. "on (accent)" without adding two more single-purpose tokens
      (simpler token surface, same visual result).
- [x] Theme selector **already wired** — done in 14a as part of keeping
      the app buildable after `enableNightMode`'s removal (a
      light/dark/system `<select>` replacing the old night-mode toggle).
      Resolving this sub-spec's original ambiguity: the functional
      control lives in `SettingsModal.tsx` (there was never anywhere
      else it could sensibly go), 14a just ended up building it instead
      of this file — no duplicate control exists.

### OAuth connect modals (GitHub, Dropbox, Google Drive, OneDrive, Bitbucket)

- [x] All 5 re-themed via the same token set as the shared chrome above:
      `bg-navbar`→`bg-chrome`, `text-invert`→`text-inverse`,
      `text-muted`→`text-secondary`, `plum`→`accent`,
      `focus-visible:ring-plum`→`focus-visible:ring-focus-ring`. Primary
      "Connect"/"Save to X" buttons (`bg-plum text-bg-sidebar`) →
      `bg-accent text-on-accent`, mirroring the same fix made to
      Sidebar's "New Document" button in 14b. Provider logos/icons
      (`<Github>`, etc. from `lucide-react`) left untouched — those are
      generic outline icons, not the providers' actual trademarked
      logos, so there was no third-party brand color to preserve or
      violate either way.
- [x] `bg-highlight` usage split by actual meaning (same split as 14b's
      sidebar): `hover:bg-bg-highlight` (org/repo/branch/file list rows)
      → `hover:bg-bg-surface-hover`; the "currently selected file"
      ternary (`file.path === current ? "bg-bg-highlight" : ""`,
      present in GitHub/Dropbox/GoogleDrive/OneDrive/Bitbucket) →
      `bg-bg-selected`, for the same reason DocumentList's active row
      got its own token in 14b — a persistent selection state reads
      differently from a transient hover.
- [x] No dedicated invalid-token/failed-callback error UI exists in any
      of the 5 modals to re-theme (checked all 5 — errors surface via
      the shared `useToast()` notify() calls instead, which is 14f's
      scope, not this file's).

### Delete confirmation modal

- [x] `bg-red-600`/`text-red-500`/`ring-red-400` → `bg-danger`/
      `text-danger`/`ring-danger` throughout (icon background, icon
      color, confirm button, focus ring).
- [x] "Cancel" de-emphasized: `bg-bg-button-save` (a bespoke
      secondary-button color, same one retired in 14b) → `bg-surface-hover`,
      a clearly neutral tone next to the now-`bg-danger` "Delete" button.
- [x] Bonus, found while establishing the `danger` convention here:
      `Sidebar.tsx`'s own "Delete Document" button and the cloud-service
      "Unlink" action still used raw Tailwind `red-600`/`red-400`/
      `red-300` (never `plum`-based, so 14b's grep sweep didn't catch
      them) — converted to `danger` too for a single consistent
      destructive-action color across the whole app, not just this modal.

### Verification

- [x] `grep -rn "plum\|border-settings\|switchery\|bg-highlight\|red-[0-9]" components/modals components/sidebar/Sidebar.tsx` — zero matches.
- [ ] Manual open-each-of-7-modals visual pass in both themes — deferred
      to 14h (no interactive browser in this sandbox).
- [x] `tests/components/settings-modal.test.tsx` (1 pre-existing
      unrelated failure, confirmed in 14a), `tests/components/github-modal.test.tsx`
      (1 assertion updated from `bg-bg-highlight` to `bg-bg-selected`,
      now 34/34 passing), `tests/components/delete-confirm-modal.test.tsx`
      (all passing, no changes needed — it didn't assert literal color
      classes).
- [x] `npx tsc --noEmit` and `npm run lint` clean.
