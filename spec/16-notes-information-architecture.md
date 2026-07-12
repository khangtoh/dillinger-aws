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

- [ ] Read `lib/types.ts`'s current `Document` shape in full (not just
      the fields referenced in Phase 13) to confirm exactly what a
      migration needs to add vs. what already exists.
- [ ] Measure the current `persist()` debounce/storage path
      (`stores/CLAUDE.md` documents a 2s debounce) against a
      representative folder+tag dataset size to confirm localStorage
      remains sufficient; only escalate to IndexedDB if this check fails,
      and record the measurement either way.
- [ ] Decide the folder model shape: single-level folders (simplest,
      matches "beat StackEdit's UI" without matching its full nested-
      subfolder depth) vs. arbitrary nesting (matches StackEdit exactly,
      more UI complexity). Default to **single-level folders + free-form
      tags** unless this task's research finds a concrete reason nesting
      is needed for v1 — record the decision either way as a finding.
- [ ] Confirm whether any existing OAuth cloud-provider import/save flow
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

_(append dated migration/verification results here)_
