# Operating context

Updated: 2026-09-26.

Record the actual app and loop capabilities here. The template supplies no integrations, access, credentials, permissions, or claims about production state.

## Capabilities

| Capability | System / reference | Status | Owner / next action |
| --- | --- | --- | --- |
| App code and verification commands | Repo root. `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run test:e2e`, `npm run verify`, `npm run check:legacy-theme`. Spec structure: `specloop check` | Inherited from Dillinger and working. It still builds Dillinger, not TopForm | Agents run these before every push |
| Environments and release workflow | `.github/workflows/` (deploy-lambda, deploy-branch-tenant, tenant-lifecycle) or Buildkite (`scripts/ci-provider.sh`, `docs/buildkite.md`). AWS Lambda per-tenant stacks and CloudFront gateway under `infra/` | Inherited and **not configured for TopForm**: OIDC trust names `khangtoh/dillinger-aws`, and stack and tag names say `dillinger` | `spec/22` retargets them before any TopForm deploy |
| User feedback and observation sources | Unknown | Unknown | Verify available sources |
| Product metrics and queries | Unknown | Unknown | Define from the selected outcome |
| Quality evaluations, including AI where applicable | Unknown | Unknown | Link verified methods |
| Reliability and operating-cost signals | Unknown | Unknown | Establish definitions and limits |
| Runner, triggers, and logs | Claude Code cloud sessions started by the owner. specloop `/spec-loop` commands in `.claude/commands/` | Manual. No scheduled runner | Record a runner here if one is registered |
| Coordination, retries, and recovery | Unknown | Unknown | Verify before dependent actions |

## Authority

No authority is inherited from this template. Record existing project/session authorization with its source; carry it forward rather than asking again each cycle. Written records cannot expand runtime tool permissions.

| Actor / role | Allowed action and environment | Limits / expiry | Source | Stop / revocation condition |
| --- | --- | --- | --- | --- |
| Agent sessions (Claude Code) | Edit, commit, and push to the session's assigned branch. Read attached repositories | GitHub integration cannot create repositories (HTTP 403 on 2026-09-26). No AWS deploy authority for TopForm yet | Session instructions and [STR-001](../steering/STR-001-create-topform.md) | End of session, or owner direction |
| khangtoh (owner) | Everything: repository creation, secrets, AWS, product direction | None recorded | Repository owner | Not applicable |

Unknown scope blocks only the action requiring it. Continue other authorized work. Keep credentials outside this folder and store references only.

## Runbooks and incidents

Create `runbooks/` and `incidents/` with their first real record, using the [runbook](../templates/runbook.md) and [incident](../templates/incident.md) templates.

Runbooks need observable triggers, actual authority, verified steps, failure handling, recovery, and final-state checks. Keep unverified procedures in draft. Incidents preserve impact, timeline, recovery evidence, uncertainty, and prevention follow-up.

## Runner handoff

When available, record runner identity, invocation, event/schedule source, logs, access references, and last successful cycle. Record external action IDs and idempotency keys where relevant. Use real coordination for overlapping work or serialize mutations.

A next-check field is not proof of scheduling. Verify registration, actual execution, persisted results, and recovery after interruption before claiming a continuous autonomous loop is running.
