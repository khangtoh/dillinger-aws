# Measurement contract

Updated: unknown — set when adopted or changed.

No metric definitions, baselines, or product targets are supplied by this template. Establish them from the actual project context, selected outcome, and verified data sources.

## Metric registry

| ID | Name | Definition and population | Source | Baseline / window | Target / window | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |

Use `MET-001`, `MET-002`, and so on. These IDs identify definitions in this file. Add one subsection per adopted metric with the fields below.

## Required definition

- **Purpose:** which user or business outcome this metric represents.
- **Calculation:** numerator, denominator, unit, and aggregation; for a count or direct measure, state the event or measurement rule.
- **Population:** eligibility, cohort, exclusions, deduplication, and relevant segmentation.
- **Time:** event time, observation window, reporting timezone, and handling of late events.
- **Source:** verified event names, dashboard or query location, query version, and access requirements.
- **Quality:** instrumentation checks, sample coverage, known missing data, and freshness limit.
- **Baseline:** value, sample size, interval, and collection method; use `unknown` until measured.
- **Target:** desired change and evaluation window, including whether it is proposed or accepted.
- **Owner:** who or which agent is responsible for checking it and when.

Changing a definition requires a dated revision. Preserve the definition used by a completed experiment; do not compare incompatible historical numbers as if they were the same metric.

## What to measure

Choose a small set appropriate to the product:

| Layer | Question |
| --- | --- |
| User value | Did the user accomplish the intended job successfully? |
| Continued value | Do users return when the need recurs? |
| AI quality | Are outputs useful and correct for representative tasks? |
| Reliability | Are completion, errors, and latency within defined limits? |
| Economics | What does a successful user outcome cost to deliver? |
| Learning loop | Do completed changes produce evidence and a subsequent decision? |

For AI behavior changes, record the model, prompt, tool, and evaluation set versions. Use representative cases and product-specific failure cases. Automated judges need a stated rubric and checks against trustworthy labels; passing an evaluation alone does not prove real-user value.

## Evaluation discipline

Define success, failure, guardrails, exposure, and stop criteria before starting an experiment. Select a comparison and sample plan appropriate to the evidence available. Small qualitative studies can guide a decision but do not establish statistical significance. Report an inconclusive result when the data cannot support the claim.

If telemetry is absent, delayed, or broken, report the measurement as unavailable and repair or substitute a stated method. Do not infer success from silence.
