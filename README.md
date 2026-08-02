# dillinger-aws

Runs [Dillinger](https://github.com/joemccann/dillinger) on AWS Lambda
(container-image packaging, executed in Lambda's Firecracker microVM
runtime) instead of a Docker host.

See [`spec/README.md`](spec/README.md) for the phased, checkbox-driven plan
and current status.

## CI and deployment

Use [GitHub Actions](.github/workflows/README.md) by default, or follow the [Buildkite deployment guide](docs/buildkite.md) to configure and activate Buildkite through the shared provider selector.
