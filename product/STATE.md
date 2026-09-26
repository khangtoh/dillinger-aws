# Current state

Updated: 2026-09-26.

## Snapshot

- Product stage: pre-product. TopForm was forked from `dillinger-aws` on 2026-09-26, and the product definition is pending.
- Product owner: khangtoh. Active work owner: khangtoh, with agent sessions.
- Current app and service health: TopForm has not been deployed. The inherited code builds as Dillinger, and inherited Dillinger stacks still run from `khangtoh/dillinger-aws`. They are not TopForm's.
- Home: private repository `khangtoh/topform` (not yet created). Work is staged on `khangtoh/dillinger-aws`, branch `claude/topform-repo-setup-d0q5t3`.

## Active work

| Work | Owner | State | Record |
| --- | --- | --- | --- |
| Confirm TopForm product contract | khangtoh | Waiting on owner description | [OUT-001](outcomes/OUT-001-confirm-topform-product-contract.md), `spec/21` |
| Create `khangtoh/topform` and push the fork | khangtoh | Blocked: session integration cannot create repositories (HTTP 403) | `spec/22` |

Active cycle: [CYC-20260926-01](cycles/CYC-20260926-01-topform-bootstrap.md) (waiting).

## Next action

1. Owner creates the private `khangtoh/topform` repository with no initial commit. An agent session then pushes this branch's history to its `main` (`spec/22`).
2. Owner describes TopForm (promise, target users, core job). Record it as steering and fill [PRODUCT.md](PRODUCT.md) (`spec/21`).

## Dependencies

Owner action for both next steps. Everything else in `spec/21` and `spec/22` depends on one of them.

## Next review

Trigger: the owner's next product-direction message or confirmation that the repository exists. Scheduling: manual. No scheduler is registered.
