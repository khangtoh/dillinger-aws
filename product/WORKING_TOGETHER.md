# Working together in ProductOS

Humans and agents share one product model, one roadmap, and one evidence trail. Autonomy lets work progress without a human at every step, while humans can steer, contribute, inspect, and take over at any point.

## Entry points

| I want to… | Start here | Leave behind |
| --- | --- | --- |
| Understand the product | [PRODUCT.md](PRODUCT.md), [STATE.md](STATE.md) | Sourced corrections if needed |
| Change direction or priorities | [ROADMAP.md](ROADMAP.md), `steering/` | Direction, scope, source, and affected priorities |
| Share feedback or research | `evidence/` | Observation, source, context, and limitations |
| Suggest a problem to solve | `opportunities/` | User need and the outcome it could improve |
| Design or build a feature | `features/` | Behavior, scope, criteria, and verification |
| Test an idea | `experiments/` | Hypothesis, criteria, result, and decision |
| Run or recover the app | [operations/README.md](operations/README.md) | Evidence and an updated runbook if needed |
| Pick up or hand off work | [STATE.md](STATE.md), `cycles/` | Exact current step and next action |

Directories are created when their first real record is needed. Use [templates](templates/README.md).

## Roles

- **Product owner:** supplies purpose, resolves conflicting strategic direction, and establishes operating scope.
- **Work owner:** a named human or agent accountable for the next action and keeping a record current.
- **Contributor:** adds design, code, research, evidence, or operational work.
- **Reviewer:** checks a result against recorded criteria. Identify whether review was independent or a self-check.

One actor can hold several roles. Do not require a separate reviewer for every reversible edit. Existing review requirements apply regardless of who performed the work.

## Ordinary language is enough to steer

A human can say, for example, “Focus on first-use success this week; defer growth work.” The agent captures the source, date, scope, and duration in a steering record and updates affected priorities. Humans do not have to fill out templates.

Distinguish suggestions, direction, and authorization. Record what was actually said. Apply explicit direction within its scope; preserve superseded direction and link its replacement. Do not turn an inferred preference into an approval.

App-user feedback becomes evidence and opportunities. Group repeated feedback, consider affected cohorts and behavior, and explain the resulting choice. Evidence can drive product changes autonomously within existing direction and authority.

## Shared editing and handoffs

Use the established version-control and review workflow. Attribute material decisions and evidence. Check for newer edits before writing; do not overwrite another actor's work or silently resolve substantive disagreements.

When actors disagree, document alternatives, evidence, and consequences. Use a small reversible test where useful. Resolve conflicts about strategic intent or decision authority with the product owner.

A handoff states what is complete, what is in progress, what evidence exists, what is blocked, and the next concrete action. Link relevant branches, PRs, deployments, dashboards, or queries. STATE.md is the short shared summary; a cycle record holds execution detail.

Reading or making a small standalone correction does not require a new cycle. Track substantive work and interrupted work. Human participation is available throughout the loop without becoming a required gate for every cycle.
