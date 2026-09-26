# TopForm

TopForm is a new product forked on 2026-09-26 from `dillinger-aws`. It is
run with two methods:

- **[ProductOS](product/README.md)**: product intent, outcomes, decisions,
  and the current product state (`product/`).
- **[specloop](spec/README.md)**: numbered phase checklists, the
  [BACKLOG](spec/BACKLOG.md) work order, and the `Spec Summary/Status`
  handoff (`spec/`). TopForm phases start at 21.

The product definition is still being written. See
[`product/STATE.md`](product/STATE.md) for the next action.

## Inherited: dillinger-aws

Runs [Dillinger](https://github.com/joemccann/dillinger) on AWS Lambda
(container-image packaging, executed in Lambda's Firecracker microVM
runtime) instead of a Docker host.

See [`spec/README.md`](spec/README.md) for the phased, checkbox-driven plan
and current status.

## CI and deployment

Use [GitHub Actions](.github/workflows/README.md) by default, or follow the [Buildkite deployment guide](docs/buildkite.md) to configure and activate Buildkite through the shared provider selector.
