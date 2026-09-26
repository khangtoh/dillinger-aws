# Current state

Updated: 2026-09-26.

## Snapshot

- Product stage: pre-product. Topform was forked from `dillinger-aws` on 2026-09-26, and the product definition is pending.
- Product owner: khangtoh. Active work owner: khangtoh, with agent sessions.
- Current app and service health: Topform has not been deployed. The inherited code builds as Dillinger, and inherited Dillinger stacks still run from `khangtoh/dillinger-aws`. They are not Topform's.
- Home: private repository `khangtoh/TopForm`, branch `main` (pushed 2026-09-26 with the full fork history).
- Promise and product model: set by [STR-002](steering/STR-002-topform-product-model.md). See [PRODUCT.md](PRODUCT.md).

## Active work

| Work | Owner | State | Record |
| --- | --- | --- | --- |
| Confirm Topform product contract | khangtoh | Promise and model recorded; waiting on target users, core job, AppContext definition | [OUT-001](outcomes/OUT-001-confirm-topform-product-contract.md), `spec/21` |
| Repository bootstrap: package rename, identity, CI, deploy targets | khangtoh / agent | Repository live; retargeting not started | `spec/22` |

Active cycle: [CYC-20260926-01](cycles/CYC-20260926-01-topform-bootstrap.md) (waiting).

## Next action

1. Owner supplies the target users, the core job, and what an AppContext is (`spec/21`, [OUT-001](outcomes/OUT-001-confirm-topform-product-contract.md)).
2. An agent works `spec/22` in `khangtoh/TopForm`: package rename, identity, OIDC and deploy-target retargeting, and first green CI. None of it needs owner input except CI secrets.

## Dependencies

Step 1 is owner input. Step 2 needs owner-configured secrets only for its CI task.

## Next review

Trigger: the owner's next product-direction message. Scheduling: manual. No scheduler is registered.
