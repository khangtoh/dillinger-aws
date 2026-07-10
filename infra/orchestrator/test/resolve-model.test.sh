#!/usr/bin/env bash
# Test suite for infra/orchestrator/resolve-model.sh (Module B).
#
# Pure bash, no test framework - each case sets up a scratch directory
# with its own deployment-model.json / desired-tenants.json, points
# resolve-model.sh at them via env var overrides (DEPLOYMENT_MODEL_FILE /
# DESIRED_TENANTS_FILE / DESIRED_STATE_FILE), and asserts on exit code +
# stderr/output. The real committed infra/deployment-model.json and
# infra/desired-tenants.json are never touched or read by these tests.
#
# Usage: infra/orchestrator/test/resolve-model.test.sh

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
RESOLVE_MODEL="$REPO_ROOT/infra/orchestrator/resolve-model.sh"

PASS_COUNT=0
FAIL_COUNT=0

pass() {
  echo "PASS: $1"
  PASS_COUNT=$((PASS_COUNT + 1))
}

fail() {
  echo "FAIL: $1"
  FAIL_COUNT=$((FAIL_COUNT + 1))
}

# Runs resolve-model.sh against a scratch dir's fixtures.
# Sets globals: RUN_EXIT, RUN_STDOUT, RUN_STDERR, RUN_STATE_FILE
run_resolve_model() {
  local scratch_dir="$1"
  RUN_STATE_FILE="$scratch_dir/state/desired-state.json"

  local stdout_file="$scratch_dir/.stdout"
  local stderr_file="$scratch_dir/.stderr"

  DEPLOYMENT_MODEL_FILE="$scratch_dir/deployment-model.json" \
    DESIRED_TENANTS_FILE="$scratch_dir/desired-tenants.json" \
    DESIRED_STATE_FILE="$RUN_STATE_FILE" \
    "$RESOLVE_MODEL" >"$stdout_file" 2>"$stderr_file"
  RUN_EXIT=$?

  RUN_STDOUT="$(cat "$stdout_file")"
  RUN_STDERR="$(cat "$stderr_file")"
}

new_scratch_dir() {
  mktemp -d "${TMPDIR:-/tmp}/resolve-model-test.XXXXXX"
}

# --- Test 1: valid config (one tenant) --------------------------------
test_valid_one_tenant() {
  local scratch_dir
  scratch_dir="$(new_scratch_dir)"

  cat > "$scratch_dir/deployment-model.json" <<'EOF'
{
  "model": "isolated-single-tenant-per-instance",
  "gateway": { "enabled": true, "domain": "", "acmCertificateArn": "" }
}
EOF
  cat > "$scratch_dir/desired-tenants.json" <<'EOF'
{
  "tenants": [ { "tenantId": "acme", "region": "us-east-1" } ]
}
EOF

  run_resolve_model "$scratch_dir"

  if [[ "$RUN_EXIT" -ne 0 ]]; then
    fail "valid config (one tenant): expected exit 0, got $RUN_EXIT (stderr: $RUN_STDERR)"
  elif [[ ! -f "$RUN_STATE_FILE" ]]; then
    fail "valid config (one tenant): desired-state.json was not written"
  elif ! jq -e '.tenants | length == 1 and .[0].tenantId == "acme" and .[0].region == "us-east-1"' "$RUN_STATE_FILE" >/dev/null 2>&1; then
    fail "valid config (one tenant): desired-state.json does not contain expected tenant (got: $(cat "$RUN_STATE_FILE"))"
  else
    pass "valid config (one tenant) -> exit 0, tenant present in desired-state.json"
  fi

  rm -rf "$scratch_dir"
}

# --- Test 2: empty desired-tenants.json is valid, not an error -------
test_empty_tenants_is_valid() {
  local scratch_dir
  scratch_dir="$(new_scratch_dir)"

  cat > "$scratch_dir/deployment-model.json" <<'EOF'
{
  "model": "isolated-single-tenant-per-instance",
  "gateway": { "enabled": true, "domain": "", "acmCertificateArn": "" }
}
EOF
  cat > "$scratch_dir/desired-tenants.json" <<'EOF'
{
  "tenants": []
}
EOF

  run_resolve_model "$scratch_dir"

  if [[ "$RUN_EXIT" -ne 0 ]]; then
    fail "empty tenants: expected exit 0, got $RUN_EXIT (stderr: $RUN_STDERR)"
  elif ! jq -e '.tenants == []' "$RUN_STATE_FILE" >/dev/null 2>&1; then
    fail "empty tenants: expected empty tenants array in desired-state.json (got: $(cat "$RUN_STATE_FILE"))"
  else
    pass "empty desired-tenants.json -> exit 0, empty tenants array (not treated as an error)"
  fi

  rm -rf "$scratch_dir"
}

# --- Test 3: invalid model value is a hard error ----------------------
test_invalid_model_value() {
  local scratch_dir
  scratch_dir="$(new_scratch_dir)"

  cat > "$scratch_dir/deployment-model.json" <<'EOF'
{
  "model": "something-else",
  "gateway": { "enabled": true, "domain": "", "acmCertificateArn": "" }
}
EOF
  cat > "$scratch_dir/desired-tenants.json" <<'EOF'
{
  "tenants": []
}
EOF

  run_resolve_model "$scratch_dir"

  if [[ "$RUN_EXIT" -eq 0 ]]; then
    fail "invalid model: expected non-zero exit, got 0"
  elif [[ "$RUN_STDERR" != *"something-else"* ]]; then
    fail "invalid model: expected stderr to name the bad value 'something-else' (got: $RUN_STDERR)"
  else
    pass "invalid model value 'something-else' -> non-zero exit, stderr names the bad value"
  fi

  rm -rf "$scratch_dir"
}

# --- Test 4: duplicate tenantId is a hard error ------------------------
test_duplicate_tenant_id() {
  local scratch_dir
  scratch_dir="$(new_scratch_dir)"

  cat > "$scratch_dir/deployment-model.json" <<'EOF'
{
  "model": "isolated-single-tenant-per-instance",
  "gateway": { "enabled": true, "domain": "", "acmCertificateArn": "" }
}
EOF
  cat > "$scratch_dir/desired-tenants.json" <<'EOF'
{
  "tenants": [
    { "tenantId": "acme", "region": "us-east-1" },
    { "tenantId": "acme", "region": "us-west-2" }
  ]
}
EOF

  run_resolve_model "$scratch_dir"

  if [[ "$RUN_EXIT" -eq 0 ]]; then
    fail "duplicate tenantId: expected non-zero exit, got 0"
  elif [[ "$RUN_STDERR" != *"acme"* ]]; then
    fail "duplicate tenantId: expected stderr to name the duplicate 'acme' (got: $RUN_STDERR)"
  else
    pass "duplicate tenantId 'acme' -> non-zero exit, stderr names the duplicate"
  fi

  rm -rf "$scratch_dir"
}

# --- Test 5: invalid tenantId (uppercase/spaces) is a hard error -------
test_invalid_tenant_id() {
  local scratch_dir
  scratch_dir="$(new_scratch_dir)"

  cat > "$scratch_dir/deployment-model.json" <<'EOF'
{
  "model": "isolated-single-tenant-per-instance",
  "gateway": { "enabled": true, "domain": "", "acmCertificateArn": "" }
}
EOF
  cat > "$scratch_dir/desired-tenants.json" <<'EOF'
{
  "tenants": [ { "tenantId": "Acme Corp", "region": "us-east-1" } ]
}
EOF

  run_resolve_model "$scratch_dir"

  if [[ "$RUN_EXIT" -eq 0 ]]; then
    fail "invalid tenantId: expected non-zero exit, got 0"
  else
    pass "invalid tenantId 'Acme Corp' (uppercase + space) -> non-zero exit"
  fi

  rm -rf "$scratch_dir"
}

# --- Bonus: missing input files fall back to defaults, still succeed --
test_missing_files_fall_back_to_defaults() {
  local scratch_dir
  scratch_dir="$(new_scratch_dir)"
  # Deliberately do not create deployment-model.json or desired-tenants.json.

  run_resolve_model "$scratch_dir"

  if [[ "$RUN_EXIT" -ne 0 ]]; then
    fail "missing input files: expected exit 0 (defensive fallback), got $RUN_EXIT (stderr: $RUN_STDERR)"
  elif [[ ! -f "$scratch_dir/deployment-model.json" ]] || [[ ! -f "$scratch_dir/desired-tenants.json" ]]; then
    fail "missing input files: expected default files to be created"
  elif ! jq -e '.tenants == [] and .model == "isolated-single-tenant-per-instance"' "$RUN_STATE_FILE" >/dev/null 2>&1; then
    fail "missing input files: unexpected desired-state.json content (got: $(cat "$RUN_STATE_FILE"))"
  else
    pass "missing input files -> defaults created, exit 0"
  fi

  rm -rf "$scratch_dir"
}

echo "==> Running resolve-model.sh tests"
test_valid_one_tenant
test_empty_tenants_is_valid
test_invalid_model_value
test_duplicate_tenant_id
test_invalid_tenant_id
test_missing_files_fall_back_to_defaults

echo
echo "==> ${PASS_COUNT} passed, ${FAIL_COUNT} failed"

if [[ "$FAIL_COUNT" -ne 0 ]]; then
  exit 1
fi

exit 0
