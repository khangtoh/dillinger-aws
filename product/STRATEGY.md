# Current strategy

Updated: 2026-09-26.

## Thesis

Confirmed direction: the five-pillar product model in [PRODUCT.md](PRODUCT.md) ([STR-002](steering/STR-002-topform-product-model.md)). How Topform creates value for specific users, and how it sustains its operation, is unknown until target users and a business model are supplied.

## Bets and choices

No bets are supplied by the template. For each real choice, record the rationale, evidence, uncertainty, and conditions that would change it.

| Choice | Evidence / rationale | Uncertainty | Revisit condition |
| --- | --- | --- | --- |
| Build Topform on a full fork of `dillinger-aws` ([STR-001](steering/STR-001-create-topform.md)) | Owner direction | How much inherited code survives | DEC-002 (`spec/21`) |

**Hypothesis (agent, unconfirmed): inherited surfaces map onto the product model.** This is input to DEC-002, not a decision.

| Pillar | Closest inherited asset | Gap |
| --- | --- | --- |
| Markdown as durable state | Markdown editor and preview; documents in a client-side Zustand/localStorage store; folders/tags plan (spec 16) | State is browser-local today, not durable server-side state |
| AI-native editing | Spec 17 plan (document API contract, in-editor AI actions, MCP server); not built | Nothing shipped yet |
| Personalization | Light/dark/system theming and editor settings (Vim/Emacs) | No per-user model of the work |
| Private microVM runtime | One isolated AWS Lambda (Firecracker microVM) deployment per tenant, a CloudFront gateway, and a deployment orchestrator (specs 9-11) | Whether a per-tenant Lambda is the intended "private microVM runtime" is unconfirmed; security backlog in spec 12 is open |
| AppContext: `product-os` | The ProductOS instance in `product/` | No runtime notion of an AppContext exists |
| AppContext: `work-desk`, `community` | None | Undefined |

## Constraints and discovery

Product maturity: pre-product. No user evidence yet. Most consequential uncertainty: who Topform is for and what an AppContext is. Both shape every build phase. Next step: owner supplies target users and an AppContext definition, then DEC-002 settles the inherited surfaces. Do not let unrelated gaps block useful work.

Link material changes to decisions and evidence. Keep ordering in [ROADMAP.md](ROADMAP.md) and immediate next actions in [STATE.md](STATE.md).
