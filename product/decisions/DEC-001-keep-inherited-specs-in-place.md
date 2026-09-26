---
schema_version: 1
id: DEC-001
type: decision
title: Keep inherited Dillinger spec phases in place and number Topform phases from 21
status: accepted
owner: khangtoh
created: 2026-09-26
updated: 2026-09-26
related: [STR-001]
---

# Keep inherited Dillinger spec phases in place and number Topform phases from 21

- Question and context: the full fork brings `spec/01`-`spec/20` (Dillinger on AWS, including open security and UI work). Should they be archived or deleted, or should they stay put?
- Decision and effective date: they stay in `spec/` as inherited phases. Topform phases start at 21 and rank above them in `spec/BACKLOG.md`. Effective 2026-09-26.
- Decider and authority: the setup agent chose this within STR-001's "set up specloop" scope. The owner can revisit it.
- Supporting evidence: over 40 files in `infra/`, `.github/`, docs, and `CLAUDE.md` link to `spec/NN-*` paths. The inherited code and infra still exist in the tree, and the open Phase 12 security items still apply to it. `specloop check` enforces index/BACKLOG consistency, and keeping the phases passes it without link rewrites.
- Alternatives and tradeoffs: moving the phases to an archive folder would give a clean index but break or force rewriting many links, and would hide open security work that still applies. Deleting them would lose history and the security backlog.
- Expected consequence and remaining uncertainty: the index is longer, but inherited status is clearly labeled. Phase 21's keep/replace/remove decision (DEC-002) may retire phases later.
- Affected records and changes actually made: `spec/README.md` (Topform header, acceptance checkbox, inherited labels), `spec/BACKLOG.md`.
- Revisit date or condition: when DEC-002 retires inherited surfaces, or when the owner asks for a clean spec index.
- Supersedes / superseded by: none.
