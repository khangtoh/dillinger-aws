# PRODUCT.md

> The shared product contract for humans and AI: what we are building, for whom, why it matters, how we choose, and how we learn.

Updated: 2026-09-26 (adoption, [STR-001](steering/STR-001-create-topform.md)).

## Purpose and identity

This is the canonical local product definition. Replace unknowns only with supplied direction or evidence. Hypotheses should be labeled as such.

| Field | Current definition |
| --- | --- |
| Product name | TopForm |
| Purpose and one-sentence promise | Unknown — awaiting owner description ([OUT-001](outcomes/OUT-001-confirm-topform-product-contract.md)) |
| Target users and context | Unknown — awaiting owner description |
| Core user job and recurring need | Unknown — awaiting owner description |
| Distinctive value and role of AI, if any | Unknown |
| Current experience and maturity | Pre-product. The codebase is a full fork of `dillinger-aws` (a Next.js Markdown editor on AWS Lambda). No TopForm-specific behavior exists yet, and which inherited surfaces TopForm keeps is undecided (`spec/21`). |
| Business model, if applicable | Unknown |
| Constraints and non-goals | Unknown |
| Source of product direction | Owner khangtoh: [STR-001](steering/STR-001-create-topform.md) |

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
