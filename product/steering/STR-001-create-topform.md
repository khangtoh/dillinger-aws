---
schema_version: 1
id: STR-001
type: steering
title: Create TopForm as a new product forked from dillinger-aws
status: applied
owner: khangtoh
created: 2026-09-26
updated: 2026-09-26
related: [OUT-001, DEC-001, CYC-20260926-01]
---

# Create TopForm as a new product forked from dillinger-aws

- Speaker, date, and source: khangtoh (repository owner), 2026-09-26, Claude Code cloud session on branch `claude/topform-repo-setup-d0q5t3`.
- Exact instruction: "Let's create a new repo off this branch and start building a new product called TopForm. And we will start setting the specloop and product_os."
- Clarifications from the same session: seed the new repository as a **full fork** of this branch, with history. Name it `khangtoh/topform` and make it **private**. The owner will describe the product separately.
- Intent: direction and authorization to create the repository and set up ProductOS and specloop.
- Scope, timeframe, constraints, and expiry: repository creation plus process setup. It does not authorize product decisions, deploys, or spending.
- Interpretation and unresolved ambiguity: what TopForm is (promise, users, core job) was not supplied. How much of the inherited Dillinger product carries into TopForm is also undecided.
- Impact on active work and priority order: TopForm phases 21-22 go to the top of `spec/BACKLOG.md`, ahead of inherited Dillinger work.
- Documents and decisions updated to apply the direction: [PRODUCT.md](../PRODUCT.md), [STATE.md](../STATE.md), [ROADMAP.md](../ROADMAP.md), [operations](../operations/README.md), [DEC-001](../decisions/DEC-001-keep-inherited-specs-in-place.md), `spec/21-topform-product-foundation.md`, `spec/22-topform-repository-bootstrap.md`.
- Supersedes / superseded by: none.
