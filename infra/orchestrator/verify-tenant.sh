#!/usr/bin/env bash
# Post-deploy smoke test for one tenant. Closes a real gap: sync.sh only
# proves the deploy *command* succeeded (CloudFormation says the stack is
# complete) - nothing actually confirms the resulting Function URL is
# serving Dillinger. This does that minimal check.
#
# Usage: infra/orchestrator/verify-tenant.sh <tenant-id> <function-url>
#
# Checks:
#   1. GET <function-url>/                  -> expect 2xx
#   2. GET <function-url>/<random-unknown>  -> expect 404
#
# This is a lightweight smoke test, not the full spec/08-testing.md
# checklist (browser rendering, editor interactivity, OAuth flows, etc.
# still need a human or Playwright) - it only proves the Lambda function
# is reachable and responding sanely, catching the class of failure where
# CloudFormation reports success but the app itself is broken (crash
# loop, missing env var, cold-start timeout, etc.).
#
# Exit codes: 0 = both checks passed. 1 = a check failed (see stderr).

set -euo pipefail

TENANT_ID="${1:?Usage: verify-tenant.sh <tenant-id> <function-url>}"
FUNCTION_URL="${2:?Usage: verify-tenant.sh <tenant-id> <function-url>}"
FUNCTION_URL="${FUNCTION_URL%/}"

CURL_MAX_TIME="${VERIFY_TENANT_CURL_MAX_TIME:-15}"
FAILED=0

echo "==> Verifying tenant '${TENANT_ID}' at ${FUNCTION_URL}"

HOME_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$CURL_MAX_TIME" "${FUNCTION_URL}/" || echo "000")
if [[ "$HOME_STATUS" =~ ^2 ]]; then
  echo "  PASS: GET / -> ${HOME_STATUS}"
else
  echo "  FAIL: GET / -> ${HOME_STATUS} (expected 2xx)" >&2
  FAILED=1
fi

NOTFOUND_PATH="__dillinger_verify_probe_$$__"
NOTFOUND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$CURL_MAX_TIME" "${FUNCTION_URL}/${NOTFOUND_PATH}" || echo "000")
if [[ "$NOTFOUND_STATUS" == "404" ]]; then
  echo "  PASS: GET /<unknown-route> -> 404"
else
  echo "  FAIL: GET /<unknown-route> -> ${NOTFOUND_STATUS} (expected 404)" >&2
  FAILED=1
fi

if [[ "$FAILED" -eq 1 ]]; then
  echo "verify-tenant.sh: tenant '${TENANT_ID}' FAILED verification" >&2
  exit 1
fi

echo "verify-tenant.sh: tenant '${TENANT_ID}' verified OK"
exit 0
