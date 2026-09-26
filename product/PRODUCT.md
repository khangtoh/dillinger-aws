# PRODUCT.md

> The shared product contract for humans and AI: what we are building, for whom, why it matters, how we choose, and how we learn.

Updated: 2026-09-26 (adoption [STR-001](steering/STR-001-create-topform.md); promise and model [STR-002](steering/STR-002-topform-product-model.md)).

## Purpose and identity

This is the canonical local product definition. Replace unknowns only with supplied direction or evidence. Hypotheses should be labeled as such.

| Field | Current definition |
| --- | --- |
| Product name | Topform |
| Purpose and one-sentence promise | **Topform is an open work surface that takes the form of the work you're doing.** Tagline: "an open surface for work." Working wording; the owner qualified it as "probably" the strongest sentence ([STR-002](steering/STR-002-topform-product-model.md)) |
| Target users and context | Unknown. Not yet supplied by the owner ([OUT-001](outcomes/OUT-001-confirm-topform-product-contract.md)) |
| Core user job and recurring need | Doing work on a surface that adapts to that work (owner framing). The specific jobs and kinds of work are not yet supplied |
| Distinctive value and role of AI, if any | The surface takes the form of the work. AI is native to editing ("AI-native editing"); specific AI behaviors are not yet defined. See the product model below |
| Current experience and maturity | Pre-product. The codebase is a full fork of `dillinger-aws` (a Next.js Markdown editor on AWS Lambda). No Topform-specific behavior exists yet, and which inherited surfaces Topform keeps is undecided (`spec/21`). |
| Business model, if applicable | Unknown. Not supplied |
| Constraints and non-goals | The five-pillar product model below is fixed ("the product model stays"). Non-goals are not yet supplied |
| Source of product direction | Owner khangtoh: [STR-001](steering/STR-001-create-topform.md) |

### Product model (owner-fixed, [STR-002](steering/STR-002-topform-product-model.md))

```
Topform
  ├── Markdown as durable state
  ├── AI-native editing
  ├── Personalization
  ├── Private microVM runtime
  └── AppContext
        ├── appcontext://product-os
        ├── appcontext://work-desk
        └── appcontext://community
```

The pillar names are the owner's. What each pillar means in behavior, and what an AppContext is, have not been specified yet. Record definitions here as the owner supplies them.

Use [VISION.md](VISION.md) for longer-term ambition and [STRATEGY.md](STRATEGY.md) for current bets. Do not infer product facts from a repository name.

## Desired outcomes

Proposed: [OUT-001](outcomes/OUT-001-confirm-topform-product-contract.md), an owner-confirmed product contract (bounded discovery). No user-facing outcome is defined yet. Define a real desired change for users or the business and link its outcome record here. Specify a measurement or evaluation method, baseline, target, and review window appropriate to the decision. Keep proposed targets distinguishable from accepted ones.

The canonical priority order is [ROADMAP.md](ROADMAP.md); measurement definitions live in [METRICS.md](METRICS.md). A shipped feature is not proof that an outcome was achieved.

## Decision principles

These are starting conventions to adapt to the project:

- Follow explicit product direction within its scope.
- Use user feedback, behavior, research, and operating evidence to discover opportunities.
- Prefer the smallest useful intervention or informative experiment.
- Consider user value, confidence, effort, urgency, reliability, and cost together.
- Preserve uncertain claims as hypotheses and retain contrary evidence.
- Let results change product choices and operating practice.

## Shared control

Humans and agents can research, design, build, operate, and evaluate. Active work has an owner, criteria, and a handoff. Owner direction sets intent; user input provides evidence. Actual authority is recorded in [operations](operations/README.md) and comes from applicable project/session instructions.

This file does not grant external access, spending, or release permission. Existing authorization carries forward without repeated approval requests for work within scope.

## Evolution

**Steer → observe → prioritize → design → build → verify → release → operate → measure → learn → update the product model.**

Every material change should connect a reason to an observed result and a subsequent decision. Update the app, priorities, evaluation, or operating practice when learning warrants it. An explicit decision to retain an approach is also valid.

Read [STATE.md](STATE.md) to resume work, [AGENTS.md](AGENTS.md) for agent instructions, [WORKING_TOGETHER.md](WORKING_TOGETHER.md) for collaboration, and [LOOP.md](LOOP.md) for execution. Use [MODEL.md](MODEL.md) for records and [LEARNINGS.md](LEARNINGS.md) for durable knowledge.

Keep this contract brief and current. Link the direction or decision behind material changes; detailed specifications and results belong in their own records.
