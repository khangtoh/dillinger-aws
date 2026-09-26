# Phase 21 — TopForm Product Foundation (ProductOS)

Goal: give TopForm a real, owner-confirmed product contract and a first
accepted outcome in ProductOS (`product/`), and decide what happens to each
Dillinger surface the fork inherited, so later build phases are written
against TopForm's intent rather than Dillinger's.

Depends on: none to start. The product-contract tasks are blocked on the
owner's TopForm description (promise, target users, core job). ProductOS
forbids inventing those facts.

ProductOS records: [STR-001](../product/steering/STR-001-create-topform.md),
[OUT-001](../product/outcomes/OUT-001-confirm-topform-product-contract.md),
[DEC-001](../product/decisions/DEC-001-keep-inherited-specs-in-place.md),
[CYC-20260926-01](../product/cycles/CYC-20260926-01-topform-bootstrap.md).

## ProductOS adoption

- [x] Copy the ProductOS 0.1.0 bare template (`khangtoh/product-os`, `template/product/`) into `product/` without overwriting existing context
- [x] Connect root agent instructions to product context (`AGENTS.md` and `CLAUDE.md` point at `product/AGENTS.md`, `product/PRODUCT.md`, and `product/STATE.md`)
- [x] Record the owner's founding direction as steering record STR-001
- [x] Record inherited capabilities and actual authority in `product/operations/README.md`, marking anything not yet configured for TopForm
- [x] Create proposed outcome OUT-001 and bootstrap cycle CYC-20260926-01, linked from `product/STATE.md` and `product/ROADMAP.md`

## Product contract

- [ ] (p1) Record the owner's TopForm promise, target users and context, and core user job in `product/PRODUCT.md`, citing the source
- [ ] Record constraints, non-goals, the role of AI (if any), and the business model (or `unknown` with a reason) in `product/PRODUCT.md`
- [ ] Fill `product/VISION.md` and `product/STRATEGY.md` from owner direction, keeping unknowns explicit
- [ ] Accept OUT-001, or replace it with TopForm's first user-facing outcome with a metric or evaluation method, baseline, target, and review window

## Inherited surfaces and next phases

- [ ] Record a decision (DEC-002) that marks each inherited Dillinger surface keep, replace, or remove: Markdown editor, cloud-storage integrations, PDF/HTML export, Astryx UI and the Phase 20 visual system, AWS Lambda multi-tenant infra and gateway, and the open Phase 12 security backlog
- [ ] Decompose TopForm's first build into numbered phases (23+), each linking its ProductOS record, and rank them in `spec/BACKLOG.md` above the inherited phases

## Findings / Results

- 2026-09-26: ProductOS 0.1.0 template copied into `product/`. The owner
  gave the product name only ("TopForm"), so `PRODUCT.md` records the name
  and fork provenance and leaves the rest `Unknown` per ProductOS rules. The
  next action is the owner's product description.
