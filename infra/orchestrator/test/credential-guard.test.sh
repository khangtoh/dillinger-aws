#!/usr/bin/env bash
# Test runner for credential-guard.sh. Plain bash + python3 -c assertions
# - no external test framework, consistent with this repo's existing
# plain-bash script style. Exercises credential-guard.sh against two
# mocked `aws` CLIs (see mock-aws-no-creds.sh / mock-aws-with-creds.sh in
# this directory) so it's verified against realistic AWS CLI output
# shapes without needing real AWS access.
#
# Usage: infra/orchestrator/test/credential-guard.test.sh

set -uo pipefail
# Deliberately not `-e`: this script's whole job is capturing non-zero
# exit codes from the script under test and asserting on them, not
# aborting the first time one shows up.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
CREDENTIAL_GUARD="$REPO_ROOT/infra/orchestrator/credential-guard.sh"
OUTPUT_FILE="$REPO_ROOT/infra/orchestrator/state/credential-status.json"

PASS=0
FAIL=0

assert_true() {
  local description="$1"
  local ok="$2" # "true" or "false"
  if [[ "$ok" == "true" ]]; then
    echo "  PASS: $description"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $description"
    FAIL=$((FAIL + 1))
  fi
}

# run_with_mock <mock-script-path> -> sets RUN_EXIT_CODE, RUN_STDOUT
run_with_mock() {
  local mock_script="$1"
  local mock_dir
  mock_dir="$(mktemp -d)"
  ln -s "$mock_script" "$mock_dir/aws"
  chmod +x "$mock_dir/aws"

  RUN_STDOUT="$(PATH="$mock_dir:$PATH" AWS_DEFAULT_REGION=us-east-1 "$CREDENTIAL_GUARD" 2>&1)"
  RUN_EXIT_CODE=$?

  rm -rf "$mock_dir"
}

echo "== Test 1: no credentials =="
run_with_mock "$SCRIPT_DIR/mock-aws-no-creds.sh"
echo "$RUN_STDOUT" | sed 's/^/  (script output) /'

assert_true "exit code is 1" "$([[ "$RUN_EXIT_CODE" == "1" ]] && echo true || echo false)"

CREDENTIALS_PRESENT="$(python3 -c "import json; print(json.load(open('$OUTPUT_FILE'))['credentialsPresent'])" 2>/dev/null || echo "ERROR")"
assert_true "credentialsPresent is false in credential-status.json" "$([[ "$CREDENTIALS_PRESENT" == "False" ]] && echo true || echo false)"

echo
echo "== Test 2: credentials present, one permission denied (iam:PassRole) =="
run_with_mock "$SCRIPT_DIR/mock-aws-with-creds.sh"
echo "$RUN_STDOUT" | sed 's/^/  (script output) /'

assert_true "exit code is 2" "$([[ "$RUN_EXIT_CODE" == "2" ]] && echo true || echo false)"

CREDENTIALS_PRESENT="$(python3 -c "import json; print(json.load(open('$OUTPUT_FILE'))['credentialsPresent'])" 2>/dev/null || echo "ERROR")"
assert_true "credentialsPresent is true in credential-status.json" "$([[ "$CREDENTIALS_PRESENT" == "True" ]] && echo true || echo false)"

PERMISSIONS_OK="$(python3 -c "import json; print(json.load(open('$OUTPUT_FILE'))['permissionsOk'])" 2>/dev/null || echo "ERROR")"
assert_true "permissionsOk is false in credential-status.json" "$([[ "$PERMISSIONS_OK" == "False" ]] && echo true || echo false)"

HAS_DENIED_ACTION="$(python3 -c "
import json
data = json.load(open('$OUTPUT_FILE'))
actions = [p['action'] for p in data['missingPermissions']]
print('iam:PassRole' in actions)
" 2>/dev/null || echo "ERROR")"
assert_true "iam:PassRole appears in missingPermissions" "$([[ "$HAS_DENIED_ACTION" == "True" ]] && echo true || echo false)"

echo
echo "======================================"
echo "credential-guard.test.sh: ${PASS} passed, ${FAIL} failed"
echo "======================================"

if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
exit 0
