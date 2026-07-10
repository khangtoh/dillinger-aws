#!/usr/bin/env bash
# Mock `aws` CLI simulating a completely unconfigured environment (no
# credentials present at all). Only needs to handle `sts get-caller-
# identity`, since credential-guard.sh exits immediately after that call
# fails and never reaches any other `aws` subcommand.
#
# Usage: symlink (or copy) this file to a directory named "aws" and put
# that directory first on PATH before running credential-guard.sh - see
# credential-guard.test.sh for how it's wired up.

set -euo pipefail

case "${1:-} ${2:-}" in
  "sts get-caller-identity")
    # Mirrors the real AWS CLI's wording/behavior when no credentials are
    # configured anywhere (env vars, shared config, instance profile, ...).
    echo "Unable to locate credentials. You can configure credentials by running \"aws configure\"." >&2
    exit 253
    ;;
  *)
    echo "mock-aws-no-creds.sh: unhandled command: $*" >&2
    exit 1
    ;;
esac
