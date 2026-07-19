# Phase 16 — Document Organization: Folders, Tags, Search (UI-1)

Goal: evolve `stores/store.ts`'s flat `Document[]` into a lightly
hierarchical, client-only model (folders/tags + search) that closes the
Phase 13 Section C gap #1 (StackEdit has folders; Dillinger-aws doesn't) —
without taking on the full notes-app scope Phase 13 Section D explicitly
deferred to v2.

Depends on: Phase 13 decisions (multi-doc manager direction, UI-1 in
scope). Independent of Phase 14/15 at the data-model level, but the
sidebar UI for this depends on Phase 15's migrated `Sidebar.tsx`/
`DocumentList.tsx` — sequence data-model tasks first, sidebar-surface
tasks after Phase 15 lands.

> **Visual-system dependency — 2026-07-19:** the data model and behavior in
> this phase remain independent of the rebrand, but every new folder, tag,
> search, empty, selected, and command-palette surface must consume the owned
> semantic theme defined in
> [`20-clean-visual-rebrand.md`](20-clean-visual-rebrand.md). Do not add new
> uses of the legacy `plum`, `bg-sidebar`, `bg-navbar`, or related visual
> tokens while Phase 20 is pending. Phase 18 verifies the combined result.

## Working rules

- **No server-side database.** This phase is bound by the same non-goal
  Phase 1-12 already established (`spec/README.md` "Non-goals for v1"):
  state stays client-side. Folders/tags/search live in the existing
  Zustand + localStorage persistence path, extended to IndexedDB only if
  the clarification pass below shows localStorage is insufficient.
- Every data-model change must ship with a migration for existing
  persisted state (`hydrate()` in `stores/store.ts`) — a real user with
  documents saved under the current flat schema must not lose data when
  this phase ships.

## Clarification pass

- [x] Read `lib/types.ts`'s current `Document` shape in full (not just
      the fields referenced in Phase 13) to confirm exactly what a
      migration needs to add vs. what already exists.
- [x] Measure the current `persist()` debounce/storage path
      (`stores/CLAUDE.md` documents a 2s debounce) against a
      representative folder+tag dataset size to confirm localStorage
      remains sufficient; only escalate to IndexedDB if this check fails,
      and record the measurement either way.
- [x] Decide the folder model shape: single-level folders (simplest,
      matches "beat StackEdit's UI" without matching its full nested-
      subfolder depth) vs. arbitrary nesting (matches StackEdit exactly,
      more UI complexity). Default to **single-level folders + free-form
      tags** unless this task's research finds a concrete reason nesting
      is needed for v1 — record the decision either way as a finding.
- [x] Confirm whether any existing OAuth cloud-provider import/save flow
      (`hooks/useGitHub.ts` etc.) encodes folder-like paths today (e.g.
      GitHub repo paths) that this model should align with, so folder
      semantics don't diverge between local documents and cloud-synced
      ones.

## Data model

- [ ] Add `folderId: string | null` and `tags: string[]` to the
      `Document` type in `lib/types.ts` (or the shape decided above).
- [ ] Add a `Folder` type (`id`, `name`, `createdAt`) and a `folders:
      Folder[]` slice to `stores/store.ts`.
- [ ] Add store actions: `createFolder`, `renameFolder`, `deleteFolder`
      (reassigning its documents to no folder, never silently deleting
      documents), `moveDocumentToFolder`, `addTagToDocument`,
      `removeTagFromDocument`.
- [ ] Write a `hydrate()` migration: documents persisted under the old
      schema (no `folderId`/`tags`) load with `folderId: null` and
      `tags: []`, not a crash or data loss.
- [ ] Add unit tests in `tests/store/store.test.ts` for every new action
      and for the migration path specifically (seed old-shape localStorage
      state, call `hydrate()`, assert the migrated shape).

## Search

- [ ] Add a client-side search function (title + tag match to start;
      full-text body search is explicitly v2 scope per Phase 13 Section D)
      over `documents`, exposed as a store selector or `lib/` utility.
- [ ] Add unit tests in `tests/lib/` covering title match, tag match, and
      empty-query behavior.

## Sidebar surface (sequence after Phase 15)

- [ ] Extend `DocumentList.tsx` (migrated in Phase 15) to group documents
      by folder, with an "unfiled" bucket for `folderId: null`.
- [ ] Add folder create/rename/delete affordances using the Astryx
      primitives already adopted in Phase 15 — no new bespoke modal
      pattern.
- [ ] Add a tag filter/chips row above `DocumentList.tsx`, wired to the
      search function above.
- [ ] Wire the Phase 15 command palette (UI-5) to include "search
      documents" as a palette action using the same search function, so
      the capability isn't duplicated between sidebar and palette.
- [ ] Verify every new sidebar affordance meets the Phase 13 UI-7
      accessibility gate.

## Verification

- [ ] Run the full existing document-list/sidebar test suite plus the new
      tests above; confirm green.
- [ ] Manual test: create 3 folders, move documents between them, add
      tags, delete a folder with documents in it, reload the page, and
      confirm no data loss and correct grouping — record the result as a
      dated finding below.
- [ ] Check this phase off in `spec/README.md` once complete.

## Findings

**2026-07-15 — Clarification pass:**

- Current `Document` shape (`lib/types.ts`): `{ id, title, body, createdAt,
  github?: { sha, path, repo, owner, branch } }`. No `folderId`/`tags`,
  no other cloud-provider metadata blocks (Dropbox/Google Drive/OneDrive/
  Bitbucket don't attach per-document fields the way GitHub does) — so the
  migration only needs to add the two new optional-becomes-required
  fields; nothing else in the shape overlaps or conflicts with them.
- `persist()` (`stores/store.ts`) writes `documents`/`currentDocument`/
  `settings` to `localStorage` synchronously on most actions; the 2s
  debounce specifically wraps body edits in
  `components/editor/MonacoEditor.tsx`'s `handleChange`. Measured a
  representative 500-document library (~4.5KB body each, a realistic
  upper bound for this app's typical note size) at 2316.8 KB serialized
  today; adding `folderId` (null or `folder-N`) and up to 3 tags per
  document raised that to 2335.4 KB — **19,026 bytes total, ~38 bytes/doc,
  0.36% of a conservative 5MB localStorage quota**. A `folders: Folder[]`
  slice (a handful of `{id, name, createdAt}` entries) adds negligible
  bytes on top. **localStorage remains sufficient; no escalation to
  IndexedDB needed for this phase.**
- Folder model: going with the spec's default — **single-level folders +
  free-form tags**. Nothing in the codebase or Phase 13's scope call
  (multi-doc manager, not full notes-app) motivates nested subfolders;
  single-level keeps `moveDocumentToFolder`/sidebar grouping trivial.
- `hooks/useGitHub.ts`'s `path` field is an opaque GitHub repo file path
  string (e.g. `docs/notes.md`, may contain slashes) stored only inside
  `Document.github.path` for round-tripping saves back to the same repo
  file — it is not surfaced as folder navigation in the UI today and none
  of the other four OAuth providers (Dropbox/Google Drive/OneDrive/
  Bitbucket) attach path-like metadata to `Document` at all. **No
  alignment needed**: the new local `folderId` model is independent of
  and doesn't conflict with this field — a document can have both a local
  `folderId` and a `github.path`, and they mean different things.
