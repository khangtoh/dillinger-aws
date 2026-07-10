#!/usr/bin/env bash
# Direct tests for infra/orchestrator/verify-tenant.sh's own HTTP-status
# logic (sync.test.sh only exercises it as a stub through sync.sh's
# control flow - this tests the real script). Uses a mock `curl` so no
# real network call is made.
#
# Usage: infra/orchestrator/test/verify-tenant.test.sh

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
VERIFY_SH="$REPO_ROOT/infra/orchestrator/verify-tenant.sh"

SCRATCH="$(mktemp -d)"
MOCK_BIN="$SCRATCH/bin"
mkdir -p "$MOCK_BIN"

cleanup() { rm -rf "$SCRATCH"; }
trap cleanup EXIT

# Mock curl: reads desired status codes from env vars set per-test
# (MOCK_HOME_STATUS, MOCK_NOTFOUND_STATUS), decides which one applies by
# whether the requested URL ends in the probe path pattern this script
# uses (__dillinger_verify_probe_<pid>__).
cat >"$MOCK_BIN/curl" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
url="${@: -1}"
if [[ "$url" == *"__dillinger_verify_probe_"* ]]; then
  echo -n "${MOCK_NOTFOUND_STATUS:-404}"
else
  echo -n "${MOCK_HOME_STATUS:-200}"
fi
EOF
chmod +x "$MOCK_BIN/curl"

PASS_COUNT=0
FAIL_COUNT=0
assert_exit() {
  local description="$1" expected="$2" actual="$3"
  if [[ "$expected" == "zero" && "$actual" -eq 0 ]] || [[ "$expected" == "nonzero" && "$actual" -ne 0 ]]; then
    echo "  PASS: $description"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "  FAIL: $description (expected $expected, got $actual)"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
}
assert_contains() {
  local description="$1" haystack="$2" needle="$3"
  if grep -qi "$needle" <<<"$haystack"; then
    echo "  PASS: $description"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "  FAIL: $description (did not find '$needle')"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
}

echo "Test 1: home 200, unknown route 404 -> pass, exit 0"
OUT=$(MOCK_HOME_STATUS=200 MOCK_NOTFOUND_STATUS=404 PATH="$MOCK_BIN:$PATH" "$VERIFY_SH" acme "https://acme.example/" 2>&1)
assert_exit "exit zero" "zero" "$?"
assert_contains "reports overall OK" "$OUT" "verified OK"

echo "Test 2: home 500 -> fail, exit 1"
OUT=$(MOCK_HOME_STATUS=500 MOCK_NOTFOUND_STATUS=404 PATH="$MOCK_BIN:$PATH" "$VERIFY_SH" acme "https://acme.example/" 2>&1)
CODE=$?
assert_exit "exit nonzero" "nonzero" "$CODE"
assert_contains "flags the home page check" "$OUT" "GET / -> 500"

echo "Test 3: unknown route returns 200 instead of 404 -> fail, exit 1"
OUT=$(MOCK_HOME_STATUS=200 MOCK_NOTFOUND_STATUS=200 PATH="$MOCK_BIN:$PATH" "$VERIFY_SH" acme "https://acme.example/" 2>&1)
CODE=$?
assert_exit "exit nonzero" "nonzero" "$CODE"
assert_contains "flags the unknown-route check" "$OUT" "expected 404"

echo "Test 4: connection failure (curl reports 000) -> fail, exit 1"
OUT=$(MOCK_HOME_STATUS=000 MOCK_NOTFOUND_STATUS=000 PATH="$MOCK_BIN:$PATH" "$VERIFY_SH" acme "https://acme.example/" 2>&1)
CODE=$?
assert_exit "exit nonzero" "nonzero" "$CODE"

echo "Test 5: trailing slash on input URL is handled consistently (no double slash issues)"
OUT=$(MOCK_HOME_STATUS=200 MOCK_NOTFOUND_STATUS=404 PATH="$MOCK_BIN:$PATH" "$VERIFY_SH" acme "https://acme.example" 2>&1)
assert_exit "exit zero even without trailing slash on input" "zero" "$?"

echo
echo "===================================="
echo "verify-tenant.test.sh: ${PASS_COUNT} passed, ${FAIL_COUNT} failed"
echo "===================================="

if [[ "$FAIL_COUNT" -gt 0 ]]; then
  echo "FAIL"
  exit 1
fi
echo "PASS"
exit 0
