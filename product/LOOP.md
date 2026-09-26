# Development and operations loop

Humans and agents can execute each step within their role and authority. ProductOS preserves their shared context across steps and sessions.

## Triggers

Start or resume on owner steering, meaningful user evidence, a selected outcome, a due experiment, a deployment evaluation, or an operational signal. A configured runner may schedule reviews. Writing a schedule here does not create one.

## One cycle

| Step | Action | Persisted result |
| --- | --- | --- |
| Orient | Read PRODUCT, STATE, current direction, and relevant records | Named owner, scope, current truth |
| Observe | Retrieve relevant feedback, behavior, evaluation, and service evidence; check freshness | Sources, observations, limitations |
| Select | Apply roadmap priority, dependencies, and existing authority | One concrete next action and rationale |
| Design | Define smallest scope, criteria, and observation method | Feature or experiment ready to execute |
| Build | Implement the authorized change | Linked code, design, or research artifact |
| Verify | Check acceptance, regression risk, and instrumentation | Actual results and unresolved limitations |
| Release | Use the established authority and rollout plan; verify deployment | Live reference, exposure, recovery plan, observation time |
| Operate | Monitor user experience, reliability, AI quality, and cost | Observations, incidents, recovery actions |
| Evaluate | Compare results with original criteria; explain uncertainty | Experiment result or outcome evaluation |
| Learn | Choose continue, expand, revise, revert, stop, or gather evidence | Decision, learning, changed product memory |
| Handoff | Update STATE and affected records | Next action or exact wake trigger |

Not every cycle builds or releases. Research, incidents, and due evaluations enter at the relevant step. Preserve purpose and evidence.

## Choose eligible work

Address active incidents and breached constraints first. Apply owner direction and roadmap priorities. Prefer completing verification or a due evaluation to opening another feature. Within an outcome, choose the smallest step that delivers value or reduces a consequential uncertainty.

If blocked, name the dependency and choose independent work. If none exists, hand off with a specific trigger. Do not create repetitive plans or empty cycles.

## Bound the run

Record actor, task, environment, effort/cost limit, exposure limit when applicable, and stop conditions. Use actual project limits or explicit session scope, never an invented budget. A research cycle may be bounded by a deliverable rather than a spend amount.

Existing authorization persists. Missing access blocks the action that needs it, not other authorized preparation or work.

## Release and observation

A change needs acceptance evidence, an identified release target, working observation, and recovery appropriate to the change. Preserve model, prompt, tool, and evaluation versions for AI behavior changes. Record limitations in the release decision.

Fix an experiment's primary measure, comparison, population, duration/sample plan, guardrails, and stopping criteria before exposure. Later changes are dated protocol amendments; retain the original criteria and explain effects on interpretation.

Record an exact next observation time or event trigger. Avoid repeated checks before evidence can change. The runner must register the wake-up separately; record whether that succeeded.

## Close the loop

Evaluation answers: what happened, for whom, under which conditions, and with what confidence; how it compares with the hypothesis; and what changes because of it.

Write the result in an experiment/evidence record, the choice in a decision, and reusable knowledge in LEARNINGS.md. Update the actual roadmap, feature, strategy, evaluation, metric definition, or runbook when warranted. An explicit evidence-backed decision to retain the approach is valid.

Insufficient data is inconclusive. Decide whether more observation is worth its cost. Do not relabel uncertainty as success.

## Interruptions and retries

Before resuming, inspect actual code, deployment, experiment exposure, and external action state. Record external action IDs or idempotency keys where available. A timeout does not prove failure; confirm the result before retrying.

On takeover, preserve prior work and update ownership. A Markdown owner field is not a lock. Use real runner coordination if available; otherwise serialize mutations. This model does not require multiple agents.

## Completion

A cycle can finish its scoped deliverable while a feature remains released and an outcome remains active. Keep evaluation scheduled in STATE and its record. Only mark an outcome achieved with evidence against its own criteria.

Waiting or blocked work names the dependency, responsible actor if known, next action, and wake condition. Stop at the recorded run limit or stop condition and leave an accurate handoff.
