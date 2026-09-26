# Product model

ProductOS uses Markdown for readability and YAML front matter for predictable record metadata. The established document history preserves changes. A future runner can index the model; no indexer is installed by these files.

## Canonical homes

PRODUCT.md holds local product identity and the product contract. VISION.md holds company intent; STRATEGY.md holds current bets; ROADMAP.md holds priority order; STATE.md holds the current handoff. METRICS.md defines measurements and LEARNINGS.md stores reusable conclusions. Operations holds actual service context and operating scope. Typed records hold the detail behind these summaries.

Link to the canonical fact instead of maintaining parallel copies.

## Record types

| Type | ID | Directory | Answers |
| --- | --- | --- | --- |
| `steering` | `STR-001` | `steering/` | What direction was given, by whom, within what scope? |
| `outcome` | `OUT-001` | `outcomes/` | What observable change matters? |
| `opportunity` | `OPP-001` | `opportunities/` | What user problem could produce that change? |
| `feature` | `FEAT-001` | `features/` | What behavior will we deliver and verify? |
| `experiment` | `EXP-001` | `experiments/` | What uncertain claim are we testing? |
| `evidence` | `EV-001` | `evidence/` | What was observed, where, when, and how? |
| `decision` | `DEC-001` | `decisions/` | What did we choose and why? |
| `cycle` | `CYC-YYYYMMDD-01` | `cycles/` | What happened, and how does the work resume? |
| `incident` | `INC-001` | `operations/incidents/` | What failed and how was it resolved? |
| `runbook` | `RUN-001` | `operations/runbooks/` | How do we carry out or recover an operation? |

MET IDs and LRN IDs identify entries in METRICS.md and LEARNINGS.md. Create a directory with its first real record; do not manufacture work to populate folders.

## Metadata

Copy the relevant template. Every typed record has these fields:

```yaml
---
schema_version: 1
id: OPP-001
type: opportunity
title: A concise description of the user problem
status: proposed
owner: unassigned
created: YYYY-MM-DD
updated: YYYY-MM-DD
related: []
---
```

Use a stable unique ID and a filename such as `OPP-001-descriptive-slug.md`. Select the next unused ID after checking records; coordinate allocation if several actors write. Never reuse IDs. Keep IDs when retiring or moving records and repair affected links.

Dates use ISO `YYYY-MM-DD`; observations and execution use UTC ISO timestamps when precision matters. Active work must have a named human or agent owner. Proposed work may be `unassigned`. `related` lists existing record, metric, or learning IDs. Use relative Markdown links in the body for human navigation.

Replace template blanks before creating a real record. Use `unknown`, `not_applicable` with a reason, or an explicit proposal where appropriate. Root summary documents do not require front matter.

## Relationships

- Outcome → vision/steering, metric or evaluation definition, and success criteria.
- Opportunity → outcome and evidence, or an explicit untested hypothesis.
- Feature → outcome plus opportunity or incident; implementation and verification artifacts when available.
- Experiment → outcome, intervention or feature, evaluation method, result evidence, and decision.
- Evidence → original source and relevant records; separate observation from interpretation.
- Decision → evidence/steering, affected records, and superseded decision when applicable.
- Cycle → work records, actual execution artifacts, and next action or review trigger.
- Incident → affected service, evidence, recovery work, and prevention/runbook changes.

Research need not create a feature. A fix need not create an experiment. User feedback need not become owner steering. The requirements are traceable purpose and an honest result.

## Lifecycle

| Type | Allowed states | Transition evidence |
| --- | --- | --- |
| Steering | `captured`, `applied`, `superseded`, `withdrawn` | Applied direction links to affected documents/decisions |
| Outcome | `proposed`, `active`, `achieved`, `missed`, `retired` | Achievement needs evidence against its criteria |
| Opportunity | `proposed`, `investigating`, `selected`, `deferred`, `rejected`, `resolved` | Selection needs rationale; resolution needs a disposition |
| Feature | `proposed`, `ready`, `building`, `verifying`, `released`, `evaluated`, `retired` | Ready needs scope/validation; released needs an artifact; evaluated needs a result |
| Experiment | `draft`, `ready`, `running`, `analyzing`, `concluded`, `cancelled` | Running needs fixed criteria and working observation; concluded needs results/decision |
| Evidence | `recorded`, `superseded`, `invalidated` | Preserve sources and reasons for invalidation |
| Decision | `proposed`, `accepted`, `superseded`, `reversed` | Acceptance identifies decider, rationale, and authority |
| Cycle | `planned`, `active`, `waiting`, `blocked`, `completed`, `cancelled` | Final or waiting state has an accurate handoff |
| Incident | `open`, `mitigating`, `monitoring`, `resolved` | Resolution needs verified recovery and assigned follow-up |
| Runbook | `draft`, `active`, `retired` | Active needs verified steps, authority, recovery, and verification date |

Explain reversals or skipped stages. Blocked work keeps its lifecycle state and records the blocker, responsible actor, and next check in the body and cycle. A blocked feature must not be marked ready or complete simply to clear a queue.

## Integrity

Check unique IDs, resolving links, valid metadata/states, and agreement between records and summary files. Active work needs ownership and a next action. Running experiments need an observation window and stop criteria. Conclusions link to evidence; material learning states its implications. Preserve original hypotheses and historical results.
