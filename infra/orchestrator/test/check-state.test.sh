#!/usr/bin/env bash
# Tests for infra/orchestrator/check-state.sh, using a mocked `aws` CLI
# (mock-aws-check-state.sh) placed first in PATH so nothing here ever
# calls real AWS. Covers:
#   1. All four deployment statuses (NOT_DEPLOYED, IN_SYNC, DRIFTED,
#      FAILED) in one run, checked against deployment-state.json.
#   2. The credential guard: missing/false credentialsPresent must exit
#      non-zero WITHOUT invoking `aws` at all (proven via the mock's call
#      log, not just the exit code).
#
# Usage: infra/orchestrator/test/check-state.test.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
CHECK_STATE_SH="$REPO_ROOT/infra/orchestrator/check-state.sh"
MOCK_AWS="$REPO_ROOT/infra/orchestrator/test/mock-aws-check-state.sh"
STATE_DIR="$REPO_ROOT/infra/orchestrator/state"
CREDENTIAL_STATUS_FILE="$STATE_DIR/credential-status.json"
DESIRED_STATE_FILE="$STATE_DIR/desired-state.json"
DEPLOYMENT_STATE_FILE="$STATE_DIR/deployment-state.json"

SCRATCH_DIR="$(mktemp -d)"
MOCK_BIN_DIR="$SCRATCH_DIR/bin"
mkdir -p "$MOCK_BIN_DIR"
ln -s "$MOCK_AWS" "$MOCK_BIN_DIR/aws"
export MOCK_AWS_LOG_FILE="$SCRATCH_DIR/aws-calls.log"
: >"$MOCK_AWS_LOG_FILE"

PASS_COUNT=0
FAIL_COUNT=0

pass() {
  PASS_COUNT=$((PASS_COUNT + 1))
  echo "PASS: $1"
}

fail() {
  FAIL_COUNT=$((FAIL_COUNT + 1))
  echo "FAIL: $1"
}

# infra/orchestrator/state/ is gitignored runtime output; back up whatever
# is already there (if anything) so this test can freely overwrite it as
# scratch space and restore it afterward, leaving the repo untouched.
BACKUP_DIR="$SCRATCH_DIR/state-backup"
mkdir -p "$BACKUP_DIR"
if [[ -d "$STATE_DIR" ]]; then
  cp -a "$STATE_DIR/." "$BACKUP_DIR/" 2>/dev/null || true
fi

cleanup() {
  rm -rf "$STATE_DIR"
  mkdir -p "$STATE_DIR"
  if [[ -n "$(ls -A "$BACKUP_DIR" 2>/dev/null)" ]]; then
    cp -a "$BACKUP_DIR/." "$STATE_DIR/"
  fi
  rm -rf "$SCRATCH_DIR"
}
trap cleanup EXIT

mkdir -p "$STATE_DIR"

# ============================================================================
# Test 1: all four statuses in one run
# ============================================================================

cat >"$CREDENTIAL_STATUS_FILE" <<'JSON'
{
  "timestamp": "2026-07-10T12:00:00Z",
  "credentialsPresent": true,
  "identity": { "account": "123456789012", "arn": "arn:aws:iam::123456789012:user/test", "userId": "AIDATEST" },
  "region": "us-east-1",
  "permissionsChecked": [],
  "permissionsOk": true,
  "missingPermissions": [],
  "errors": []
}
JSON

cat >"$DESIRED_STATE_FILE" <<'JSON'
{
  "model": "isolated-single-tenant-per-instance",
  "gateway": { "enabled": false, "domain": "", "acmCertificateArn": "" },
  "tenants": [
    { "tenantId": "notdeployed", "region": "us-east-1" },
    { "tenantId": "insync", "region": "us-east-1" },
    { "tenantId": "drifted", "region": "us-east-1" },
    { "tenantId": "failed", "region": "us-east-1" }
  ]
}
JSON

set +e
OUTPUT="$(PATH="$MOCK_BIN_DIR:$PATH" "$CHECK_STATE_SH" 2>&1)"
RC=$?
set -e

echo "--- check-state.sh output (test 1) ---"
echo "$OUTPUT"
echo "---------------------------------------"

if [[ "$RC" -eq 0 ]]; then
  pass "exit code 0 when all four tenant statuses are represented"
else
  fail "expected exit code 0, got ${RC}"
fi

if [[ -f "$DEPLOYMENT_STATE_FILE" ]]; then
  pass "deployment-state.json was written"
else
  fail "deployment-state.json was not written"
fi

assert_status() {
  local tenant_id="$1" expected="$2"
  local actual
  actual="$(jq -r --arg id "$tenant_id" '.tenants[] | select(.tenantId == $id) | .status' "$DEPLOYMENT_STATE_FILE")"
  if [[ "$actual" == "$expected" ]]; then
    pass "${tenant_id}: status is ${expected}"
  else
    fail "${tenant_id}: expected status ${expected}, got '${actual}'"
  fi
}

assert_status "notdeployed" "NOT_DEPLOYED"
assert_status "insync" "IN_SYNC"
assert_status "drifted" "DRIFTED"
assert_status "failed" "FAILED"

NOTDEPLOYED_URL="$(jq -r '.tenants[] | select(.tenantId == "notdeployed") | .functionUrl' "$DEPLOYMENT_STATE_FILE")"
if [[ "$NOTDEPLOYED_URL" == "null" ]]; then
  pass "notdeployed: functionUrl is null"
else
  fail "notdeployed: expected functionUrl null, got '${NOTDEPLOYED_URL}'"
fi

INSYNC_URL="$(jq -r '.tenants[] | select(.tenantId == "insync") | .functionUrl' "$DEPLOYMENT_STATE_FILE")"
if [[ "$INSYNC_URL" == "https://insync.lambda-url.us-east-1.on.aws/" ]]; then
  pass "insync: functionUrl populated from stack Outputs"
else
  fail "insync: expected populated functionUrl, got '${INSYNC_URL}'"
fi

DRIFTED_REASON="$(jq -r '.tenants[] | select(.tenantId == "drifted") | .reason' "$DEPLOYMENT_STATE_FILE")"
if [[ "$DRIFTED_REASON" == *"DillingerConfigHash"* ]]; then
  pass "drifted: reason explains the config hash mismatch"
else
  fail "drifted: expected a hash-mismatch reason, got '${DRIFTED_REASON}'"
fi

FAILED_REASON="$(jq -r '.tenants[] | select(.tenantId == "failed") | .reason' "$DEPLOYMENT_STATE_FILE")"
if [[ "$FAILED_REASON" == "UPDATE_ROLLBACK_FAILED" ]]; then
  pass "failed: reason is the actual StackStatus"
else
  fail "failed: expected reason UPDATE_ROLLBACK_FAILED, got '${FAILED_REASON}'"
fi

GATEWAY_KEY_PRESENT="$(jq 'has("gateway")' "$DEPLOYMENT_STATE_FILE")"
if [[ "$GATEWAY_KEY_PRESENT" == "false" ]]; then
  pass "gateway key omitted entirely when gateway.enabled is false"
else
  fail "expected gateway key to be absent when gateway.enabled is false"
fi

# ============================================================================
# Test 2: credential guard blocks before any AWS call
# ============================================================================

: >"$MOCK_AWS_LOG_FILE" # reset call log

cat >"$CREDENTIAL_STATUS_FILE" <<'JSON'
{
  "timestamp": "2026-07-10T12:00:00Z",
  "credentialsPresent": false,
  "identity": null,
  "region": "us-east-1",
  "permissionsChecked": [],
  "permissionsOk": null,
  "missingPermissions": [],
  "errors": ["no credentials found"]
}
JSON

set +e
OUTPUT2="$(PATH="$MOCK_BIN_DIR:$PATH" "$CHECK_STATE_SH" 2>&1)"
RC2=$?
set -e

echo "--- check-state.sh output (test 2, credentials missing) ---"
echo "$OUTPUT2"
echo "-------------------------------------------------------------"

if [[ "$RC2" -ne 0 ]]; then
  pass "exit code non-zero when credentialsPresent is false"
else
  fail "expected non-zero exit code when credentialsPresent is false, got 0"
fi

if [[ ! -s "$MOCK_AWS_LOG_FILE" ]]; then
  pass "mock aws was never invoked when credentialsPresent is false"
else
  fail "mock aws was invoked despite credentialsPresent being false (log: $(cat "$MOCK_AWS_LOG_FILE"))"
fi

# ============================================================================
# Summary
# ============================================================================

echo
echo "===================================="
echo "check-state.test.sh: ${PASS_COUNT} passed, ${FAIL_COUNT} failed"
echo "===================================="

if [[ "$FAIL_COUNT" -gt 0 ]]; then
  exit 1
fi

exit 0
