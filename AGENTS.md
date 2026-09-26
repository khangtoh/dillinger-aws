# Repository Agent Instructions

This repository is **Topform**, forked from `dillinger-aws`. Phases 1-20
under `spec/` are inherited Dillinger history; Topform work starts at
Phase 21.

## Product context

For product work, read product/AGENTS.md, product/PRODUCT.md, and
product/STATE.md before making changes. Follow linked product records as
needed and update product context after material decisions or results.
ProductOS (`product/`) owns product intent, outcomes, and decisions;
specloop (`spec/`) owns the phased task checklists and the work order.

## Mandatory spec completion handoff

All coding, documentation, review, and scheduled agents working in this
repository **must** follow
[`spec/spec-summary-status.md`](spec/spec-summary-status.md).

Before reporting a task complete—or closing a task after partial, blocked,
implementation, or documentation progress—the final handoff must include a
section named exactly `Spec Summary/Status`. Use the prescribed phase and
component/deliverable tables, calculate progress from current spec checkboxes,
and include the required `Overall`, `Evidence`, and `Change state` lines.

Update affected spec checkboxes, Findings/Results, the phase index, and the
session ledger first when the canonical completion procedure requires those
changes. Never infer completion from code or prose when checklist evidence can
be inspected directly.
