#!/usr/bin/env bash
# The one command that ties Phase 11's four modules together: validate
# AWS credentials, resolve what should be deployed, check what actually
# is, and sync the difference. Safe to run repeatedly - every stage is
# idempotent and this script stops early (rather than plowing ahead on
# bad data) the moment an earlier stage isn't healthy.
#
# Usage: infra/orchestrator/run.sh
#
# Chain: credential-guard.sh -> resolve-model.sh -> check-state.sh -> sync.sh
# See spec/11-deployment-orchestrator/README.md for the full architecture
# and the JSON contract each stage reads/writes.
#
# Exit code is sync.sh's exit code on a full run (0 = everything is now
# in sync), or a distinct non-zero code if an earlier stage blocked the
# run - see the per-stage messages below for which stage failed and why.

set -euo pipefail

ORCH_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v jq >/dev/null 2>&1; then
  echo "run.sh: this pipeline requires jq (used by resolve-model.sh, check-state.sh, sync.sh, deploy-gateway.sh) - install it and re-run" >&2
  exit 1
fi

if ! command -v aws >/dev/null 2>&1; then
  echo "run.sh: AWS CLI not found on PATH - see spec/01-aws-account-onboarding.md" >&2
  exit 1
fi

echo "=========================================="
echo "Stage 1/4: credential-guard.sh"
echo "=========================================="
if "$ORCH_DIR/credential-guard.sh"; then
  :
else
  code=$?
  if [[ "$code" -eq 1 ]]; then
    echo
    echo "STOPPED: no AWS credentials present. See spec/01-aws-account-onboarding.md" >&2
    echo "for how to provide them, then re-run this script." >&2
  else
    echo
    echo "STOPPED: AWS credentials present but missing required permissions." >&2
    echo "See infra/orchestrator/state/credential-status.json for exactly which." >&2
  fi
  exit "$code"
fi

echo
echo "=========================================="
echo "Stage 2/4: resolve-model.sh"
echo "=========================================="
if "$ORCH_DIR/resolve-model.sh"; then
  :
else
  code=$?
  echo
  echo "STOPPED: desired-state config is invalid (see error above)." >&2
  echo "Fix infra/deployment-model.json and/or infra/desired-tenants.json and re-run." >&2
  exit "$code"
fi

echo
echo "=========================================="
echo "Stage 3/4: check-state.sh"
echo "=========================================="
if "$ORCH_DIR/check-state.sh"; then
  :
else
  code=$?
  echo
  echo "STOPPED: could not determine actual deployment state (see error above)." >&2
  exit "$code"
fi

echo
echo "=========================================="
echo "Stage 4/4: sync.sh"
echo "=========================================="
set +e
"$ORCH_DIR/sync.sh"
sync_exit=$?
set -e

echo
if [[ "$sync_exit" -eq 0 ]]; then
  echo "Done: all tenants and the gateway (if enabled) are in sync."
else
  echo "Done with issues: see the summary above - something failed to deploy," >&2
  echo "or a previously FAILED stack was skipped and needs manual attention." >&2
fi
exit "$sync_exit"
