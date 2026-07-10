#!/usr/bin/env bash
# Control-flow tests for infra/orchestrator/sync.sh (Module D). This
# cannot hit real AWS (no credentials, Docker pulls blocked in this
# sandbox - see Phase 1/3), so it verifies *control flow only*: given a
# fixture deployment-state.json / credential-status.json, does sync.sh
# call the right stub deploy scripts for the right tenants, skip the
# right ones, and exit with the right code.
#
# Stub replacements for provision-tenant.sh / deploy-gateway.sh are
# written to a scratch directory and placed earlier in $PATH than the
# real scripts (sync.sh appends the real scripts' directories to $PATH as
# a fallback, precisely so a test-provided stub directory earlier in
# $PATH always wins - see sync.sh's own comment on this). The real
# scripts under infra/ are never modified or executed by this test.
#
# Usage: infra/orchestrator/test/sync.test.sh

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
SYNC_SH="$REPO_ROOT/infra/orchestrator/sync.sh"
STATE_DIR="$REPO_ROOT/infra/orchestrator/state"
CREDENTIAL_STATUS_FILE="$STATE_DIR/credential-status.json"
DEPLOYMENT_STATE_FILE="$STATE_DIR/deployment-state.json"

SCRATCH="$(mktemp -d)"
STUB_SUCCESS_DIR="$SCRATCH/stubs-success"
STUB_FAIL_DIR="$SCRATCH/stubs-fail"
MARKER_DIR="$SCRATCH/markers"
LOG_FILE="$SCRATCH/invocations.log"

# Did infra/orchestrator/state/ exist (with files) before this test ran?
# If so, preserve/restore it rather than clobbering another module's
# fixtures. It's gitignored runtime output, so under normal circumstances
# it won't exist yet in a fresh checkout.
PRE_EXISTING_STATE_BACKUP=""
if [[ -d "$STATE_DIR" ]]; then
  PRE_EXISTING_STATE_BACKUP="$SCRATCH/state-backup"
  cp -r "$STATE_DIR" "$PRE_EXISTING_STATE_BACKUP"
fi

cleanup() {
  rm -f "$CREDENTIAL_STATUS_FILE" "$DEPLOYMENT_STATE_FILE"
  if [[ -n "$PRE_EXISTING_STATE_BACKUP" ]]; then
    cp -r "$PRE_EXISTING_STATE_BACKUP"/. "$STATE_DIR"/ 2>/dev/null || true
  else
    rmdir "$STATE_DIR" 2>/dev/null || true
  fi
  rm -rf "$SCRATCH"
}
trap cleanup EXIT

mkdir -p "$STATE_DIR" "$STUB_SUCCESS_DIR" "$STUB_FAIL_DIR" "$MARKER_DIR"

# --- Stub scripts ----------------------------------------------------------
# Success stubs: log their invocation and touch a marker file.
cat >"$STUB_SUCCESS_DIR/provision-tenant.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
echo "provision-tenant.sh $*" >> "$SYNC_TEST_LOG"
touch "$SYNC_TEST_MARKER_DIR/deployed-$1"
EOF

cat >"$STUB_SUCCESS_DIR/deploy-gateway.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
echo "deploy-gateway.sh $*" >> "$SYNC_TEST_LOG"
touch "$SYNC_TEST_MARKER_DIR/deployed-gateway"
EOF

# Failure stubs: log their invocation, do NOT touch a marker, exit non-zero.
cat >"$STUB_FAIL_DIR/provision-tenant.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
echo "provision-tenant.sh $*" >> "$SYNC_TEST_LOG"
exit 1
EOF

cat >"$STUB_FAIL_DIR/deploy-gateway.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
echo "deploy-gateway.sh $*" >> "$SYNC_TEST_LOG"
exit 1
EOF

chmod +x "$STUB_SUCCESS_DIR"/*.sh "$STUB_FAIL_DIR"/*.sh

# --- Assertion helpers -------------------------------------------------

PASS_COUNT=0
FAIL_COUNT=0

assert_true() {
  local description="$1"
  local condition="$2"
  if [[ "$condition" == "true" ]]; then
    echo "  PASS: $description"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "  FAIL: $description"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
}

assert_file_exists() {
  local description="$1"
  local file="$2"
  if [[ -f "$file" ]]; then
    assert_true "$description" "true"
  else
    assert_true "$description" "false"
  fi
}

assert_file_not_exists() {
  local description="$1"
  local file="$2"
  if [[ ! -f "$file" ]]; then
    assert_true "$description" "true"
  else
    assert_true "$description" "false"
  fi
}

assert_exit_code() {
  local description="$1"
  local expected="$2"
  local actual="$3"
  if [[ "$expected" == "zero" && "$actual" -eq 0 ]]; then
    assert_true "$description" "true"
  elif [[ "$expected" == "nonzero" && "$actual" -ne 0 ]]; then
    assert_true "$description" "true"
  else
    assert_true "$description (expected $expected, got $actual)" "false"
  fi
}

reset_markers_and_log() {
  rm -rf "$MARKER_DIR"
  mkdir -p "$MARKER_DIR"
  : > "$LOG_FILE"
}

write_credential_status() {
  local credentials_present="$1"
  local permissions_ok="$2"
  cat >"$CREDENTIAL_STATUS_FILE" <<JSON
{
  "timestamp": "2026-07-10T12:00:00Z",
  "credentialsPresent": ${credentials_present},
  "identity": { "account": "123456789012", "arn": "arn:aws:iam::123456789012:user/test", "userId": "AIDATEST" },
  "region": "us-east-1",
  "permissionsChecked": [],
  "permissionsOk": ${permissions_ok},
  "missingPermissions": [],
  "errors": []
}
JSON
}

export SYNC_TEST_LOG="$LOG_FILE"
export SYNC_TEST_MARKER_DIR="$MARKER_DIR"

# =========================================================================
# Test 1: mixed statuses + DRIFTED gateway, success stubs.
# =========================================================================
echo "Test 1: NOT_DEPLOYED/DRIFTED tenants deployed, IN_SYNC skipped, FAILED not retried, gateway synced, exit non-zero"

cat >"$DEPLOYMENT_STATE_FILE" <<'JSON'
{
  "timestamp": "2026-07-10T12:05:00Z",
  "tenants": [
    { "tenantId": "acme", "region": "us-east-1", "status": "NOT_DEPLOYED", "functionUrl": null, "reason": null },
    { "tenantId": "beta", "region": "us-east-1", "status": "IN_SYNC", "functionUrl": "https://beta.lambda-url.us-east-1.on.aws/", "reason": null },
    { "tenantId": "gamma", "region": "us-east-1", "status": "DRIFTED", "functionUrl": "https://gamma.lambda-url.us-east-1.on.aws/", "reason": "stack DillingerConfigHash tag (abc) does not match current local template hash (def)" },
    { "tenantId": "delta", "region": "us-east-1", "status": "FAILED", "functionUrl": null, "reason": "stack DILLINGER-delta is in ROLLBACK_FAILED" }
  ],
  "gateway": { "status": "DRIFTED", "distributionDomainName": "d123.cloudfront.net", "reason": "stack DillingerConfigHash tag (abc) does not match current local template hash (def)" }
}
JSON
write_credential_status "true" "true"
reset_markers_and_log

PATH="$STUB_SUCCESS_DIR:$PATH" "$SYNC_SH" >"$SCRATCH/test1.out" 2>&1
TEST1_EXIT=$?

assert_file_exists "acme (NOT_DEPLOYED) marker created" "$MARKER_DIR/deployed-acme"
assert_file_exists "gamma (DRIFTED) marker created" "$MARKER_DIR/deployed-gamma"
assert_file_not_exists "beta (IN_SYNC) marker NOT created (correctly skipped)" "$MARKER_DIR/deployed-beta"
assert_file_not_exists "delta (FAILED) marker NOT created (correctly not auto-retried)" "$MARKER_DIR/deployed-delta"
assert_file_exists "gateway (DRIFTED) marker created" "$MARKER_DIR/deployed-gateway"
assert_exit_code "exit code non-zero (a FAILED tenant was present)" "nonzero" "$TEST1_EXIT"

# =========================================================================
# Test 2: everything IN_SYNC, no gateway key - nothing to do.
# =========================================================================
echo "Test 2: all-IN_SYNC, no gateway key - exit 0, no stub invoked"

cat >"$DEPLOYMENT_STATE_FILE" <<'JSON'
{
  "timestamp": "2026-07-10T12:05:00Z",
  "tenants": [
    { "tenantId": "acme", "region": "us-east-1", "status": "IN_SYNC", "functionUrl": "https://acme.lambda-url.us-east-1.on.aws/", "reason": null },
    { "tenantId": "beta", "region": "us-east-1", "status": "IN_SYNC", "functionUrl": "https://beta.lambda-url.us-east-1.on.aws/", "reason": null }
  ]
}
JSON
write_credential_status "true" "true"
reset_markers_and_log

PATH="$STUB_SUCCESS_DIR:$PATH" "$SYNC_SH" >"$SCRATCH/test2.out" 2>&1
TEST2_EXIT=$?

assert_exit_code "exit code zero (nothing to do)" "zero" "$TEST2_EXIT"
assert_true "no stub script was invoked (log file empty)" "$([[ ! -s "$LOG_FILE" ]] && echo true || echo false)"

# =========================================================================
# Test 3: credential gate - credentialsPresent: false.
# =========================================================================
echo "Test 3: unhealthy credentials - exit non-zero, nothing invoked"

cat >"$DEPLOYMENT_STATE_FILE" <<'JSON'
{
  "timestamp": "2026-07-10T12:05:00Z",
  "tenants": [
    { "tenantId": "acme", "region": "us-east-1", "status": "NOT_DEPLOYED", "functionUrl": null, "reason": null }
  ],
  "gateway": { "status": "NOT_DEPLOYED", "distributionDomainName": null, "reason": null }
}
JSON
write_credential_status "false" "false"
reset_markers_and_log

PATH="$STUB_SUCCESS_DIR:$PATH" "$SYNC_SH" >"$SCRATCH/test3.out" 2>&1
TEST3_EXIT=$?

assert_exit_code "exit code non-zero (credentials not present)" "nonzero" "$TEST3_EXIT"
assert_true "no stub script was invoked (log file empty)" "$([[ ! -s "$LOG_FILE" ]] && echo true || echo false)"
assert_file_not_exists "acme marker NOT created" "$MARKER_DIR/deployed-acme"

# Also check the permissionsOk: false half of the gate independently.
write_credential_status "true" "false"
reset_markers_and_log

PATH="$STUB_SUCCESS_DIR:$PATH" "$SYNC_SH" >"$SCRATCH/test3b.out" 2>&1
TEST3B_EXIT=$?

assert_exit_code "exit code non-zero (permissionsOk: false)" "nonzero" "$TEST3B_EXIT"
assert_true "no stub script was invoked (log file empty)" "$([[ ! -s "$LOG_FILE" ]] && echo true || echo false)"

# =========================================================================
# Test 4 (bonus): a failing deploy for one tenant doesn't abort the run -
# other tenants/gateway are still attempted, and the failure surfaces via
# a non-zero exit code plus a "failed" outcome in the summary.
# =========================================================================
echo "Test 4: one tenant's deploy fails - others still attempted, exit non-zero"

cat >"$DEPLOYMENT_STATE_FILE" <<'JSON'
{
  "timestamp": "2026-07-10T12:05:00Z",
  "tenants": [
    { "tenantId": "acme", "region": "us-east-1", "status": "NOT_DEPLOYED", "functionUrl": null, "reason": null },
    { "tenantId": "zeta", "region": "us-east-1", "status": "NOT_DEPLOYED", "functionUrl": null, "reason": null }
  ],
  "gateway": { "status": "DRIFTED", "distributionDomainName": "d123.cloudfront.net", "reason": "hash mismatch" }
}
JSON
write_credential_status "true" "true"
reset_markers_and_log

# provision-tenant.sh fails for every tenant; deploy-gateway.sh still succeeds.
FAIL_TENANT_ONLY_DIR="$SCRATCH/stubs-fail-tenant-only"
mkdir -p "$FAIL_TENANT_ONLY_DIR"
cp "$STUB_FAIL_DIR/provision-tenant.sh" "$FAIL_TENANT_ONLY_DIR/provision-tenant.sh"
cp "$STUB_SUCCESS_DIR/deploy-gateway.sh" "$FAIL_TENANT_ONLY_DIR/deploy-gateway.sh"
chmod +x "$FAIL_TENANT_ONLY_DIR"/*.sh

PATH="$FAIL_TENANT_ONLY_DIR:$PATH" "$SYNC_SH" >"$SCRATCH/test4.out" 2>&1
TEST4_EXIT=$?

assert_exit_code "exit code non-zero (a deploy failed)" "nonzero" "$TEST4_EXIT"
assert_true "both failing tenants were attempted (log has 2 provision-tenant.sh lines)" \
  "$([[ "$(grep -c '^provision-tenant.sh' "$LOG_FILE")" -eq 2 ]] && echo true || echo false)"
assert_file_not_exists "acme marker NOT created (deploy failed)" "$MARKER_DIR/deployed-acme"
assert_file_not_exists "zeta marker NOT created (deploy failed)" "$MARKER_DIR/deployed-zeta"
assert_file_exists "gateway still attempted and succeeded despite tenant failures" "$MARKER_DIR/deployed-gateway"

# =========================================================================
# Summary
# =========================================================================
echo
echo "==================================="
echo "sync.test.sh: ${PASS_COUNT} passed, ${FAIL_COUNT} failed"
echo "==================================="

if [[ "$FAIL_COUNT" -gt 0 ]]; then
  echo "FAIL"
  exit 1
fi

echo "PASS"
exit 0
