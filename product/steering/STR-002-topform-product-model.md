---
schema_version: 1
id: STR-002
type: steering
title: Topform promise and product model
status: applied
owner: khangtoh
created: 2026-09-26
updated: 2026-09-26
related: [STR-001, OUT-001]
---

# Topform promise and product model

- Speaker, date, and source: khangtoh (repository owner), 2026-09-26, Claude Code cloud session on branch `claude/topform-repo-setup-d0q5t3`.
- Exact instruction:

  > Topform — an open surface for work.
  > And the product model stays:
  >
  > ```
  > Topform
  >   ├── Markdown as durable state
  >   ├── AI-native editing
  >   ├── Personalization
  >   ├── Private microVM runtime
  >   └── AppContext
  >         ├── appcontext://product-os
  >         ├── appcontext://work-desk
  >         └── appcontext://community
  > ```
  >
  > The strongest product sentence is probably:
  > Topform is an open work surface that takes the form of the work you're doing.
  > https://github.com/khangtoh/TopForm.git

- Intent: direction on product identity and the top-level product model. The repository URL confirms `khangtoh/TopForm` as the new home and authorizes pushing the fork there.
- Scope, timeframe, constraints, and expiry: identity and model only. "The product model stays" means these five pillars are the committed shape. The promise sentence is qualified as "probably", so it is recorded as the working promise, not final copy.
- Interpretation and unresolved ambiguity:
  - Not supplied: target users, the specific core job beyond "work", the business model, and non-goals.
  - Not defined yet: what an AppContext is. The `appcontext://` names suggest addressable contexts the surface can take on. `product-os` plausibly corresponds to the ProductOS instance in `product/`; `work-desk` and `community` are undefined.
  - Spelling: the owner writes "Topform" in product copy and "TopForm" in the repository name. Product copy uses "Topform"; repository references use `khangtoh/TopForm`.
- Impact on active work and priority order: fills the promise and model in PRODUCT.md, VISION.md, and STRATEGY.md. OUT-001 stays proposed until target users and the core job are supplied.
- Documents and decisions updated to apply the direction: [PRODUCT.md](../PRODUCT.md), [VISION.md](../VISION.md), [STRATEGY.md](../STRATEGY.md), [OUT-001](../outcomes/OUT-001-confirm-topform-product-contract.md), `spec/21-topform-product-foundation.md`.
- Supersedes / superseded by: extends [STR-001](STR-001-create-topform.md).
