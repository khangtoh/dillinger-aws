# Phase 21 — Topform Product Foundation (ProductOS)

Goal: give Topform a real, owner-confirmed product contract and a first
accepted outcome in ProductOS (`product/`), and decide what happens to each
Dillinger surface the fork inherited, so later build phases are written
against Topform's intent rather than Dillinger's.

Depends on: none to start. The product-contract tasks are blocked on the
owner's Topform description (promise, target users, core job). ProductOS
forbids inventing those facts.

ProductOS records: [STR-001](../product/steering/STR-001-create-topform.md),
[OUT-001](../product/outcomes/OUT-001-confirm-topform-product-contract.md),
[STR-002](../product/steering/STR-002-topform-product-model.md),
[DEC-001](../product/decisions/DEC-001-keep-inherited-specs-in-place.md),
[CYC-20260926-01](../product/cycles/CYC-20260926-01-topform-bootstrap.md).

## ProductOS adoption

- [x] Copy the ProductOS 0.1.0 bare template (`khangtoh/product-os`, `template/product/`) into `product/` without overwriting existing context
- [x] Connect root agent instructions to product context (`AGENTS.md` and `CLAUDE.md` point at `product/AGENTS.md`, `product/PRODUCT.md`, and `product/STATE.md`)
- [x] Record the owner's founding direction as steering record STR-001
- [x] Record inherited capabilities and actual authority in `product/operations/README.md`, marking anything not yet configured for Topform
- [x] Create proposed outcome OUT-001 and bootstrap cycle CYC-20260926-01, linked from `product/STATE.md` and `product/ROADMAP.md`

## Product contract

- [x] Record the owner's Topform promise and product model in `product/PRODUCT.md`, citing the source (STR-002)
- [ ] (p1) Record the owner's target users and context, and the specific core user job, in `product/PRODUCT.md`, citing the source
- [ ] (p1) Record the owner's definition of an AppContext, and of `appcontext://work-desk` and `appcontext://community`, in `product/PRODUCT.md`
- [ ] Record constraints, non-goals, the role of AI (if any), and the business model (or `unknown` with a reason) in `product/PRODUCT.md`
- [x] Fill `product/VISION.md` and `product/STRATEGY.md` from owner direction, keeping unknowns explicit
- [ ] Accept OUT-001, or replace it with Topform's first user-facing outcome with a metric or evaluation method, baseline, target, and review window

## Inherited surfaces and next phases

- [ ] Record a decision (DEC-002) that marks each inherited Dillinger surface keep, replace, or remove: Markdown editor, cloud-storage integrations, PDF/HTML export, Astryx UI and the Phase 20 visual system, AWS Lambda multi-tenant infra and gateway, and the open Phase 12 security backlog
- [ ] Decompose Topform's first build into numbered phases (23+), each linking its ProductOS record, and rank them in `spec/BACKLOG.md` above the inherited phases

## Findings / Results

- 2026-09-26: ProductOS 0.1.0 template copied into `product/`. The owner
  gave the product name only ("Topform"), so `PRODUCT.md` records the name
  and fork provenance and leaves the rest `Unknown` per ProductOS rules. The
  next action is the owner's product description.
- 2026-09-26: STR-002 supplied the promise ("Topform is an open work
  surface that takes the form of the work you're doing") and the fixed
  five-pillar product model. These are recorded in PRODUCT, VISION, and
  STRATEGY. STRATEGY also records an unconfirmed agent hypothesis mapping
  inherited Dillinger surfaces onto the pillars, as input to DEC-002.
  Still missing: target users, the specific core job, and the meaning of
  AppContext.
