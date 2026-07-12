#!/usr/bin/env bash
# Tests deprovision-tenant.sh against a mocked `aws` CLI: full teardown
# order (route -> ECR -> stack -> companion -> logs -> registries),
# registry cleanup in BOTH tenants.json and desired-tenants.json, the
# no-gateway and route-already-absent paths, and prompt refusal.

set -euo pipefail

TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPROVISION="$TEST_DIR/../deprovision-tenant.sh"

PASS=0
FAIL=0
pass() { echo "PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "FAIL: $1"; FAIL=$((FAIL + 1)); }

setup() {
  WORK="$(mktemp -d)"
  export MOCK_STATE_DIR="$WORK/state"
  export MOCK_CALL_LOG="$WORK/calls.log"
  export DILLINGER_ROOT="$WORK/repo"
  mkdir -p "$MOCK_STATE_DIR" "$WORK/bin" "$WORK/repo/infra"
  : >"$MOCK_CALL_LOG"
  # populated fake repo registries
  cat >"$WORK/repo/infra/tenants.json" <<'EOF'
{"tenants": [
  {"tenantId": "staging", "region": "eu-west-2", "functionUrl": "https://x.lambda-url.eu-west-2.on.aws/"},
  {"tenantId": "alice", "region": "eu-west-2", "functionUrl": "https://y.lambda-url.eu-west-2.on.aws/"}
]}
EOF
  cat >"$WORK/repo/infra/desired-tenants.json" <<'EOF'
{"tenants": [
  {"tenantId": "staging", "region": "eu-west-2"},
  {"tenantId": "alice", "region": "eu-west-2"}
]}
EOF
  # fully-deployed tenant
  touch "$MOCK_STATE_DIR"/{gateway_exists,tenant_stack_exists}
  echo "dillinger-staging-abc123-CompanionStack" >"$MOCK_STATE_DIR/companion_stacks.txt"
  echo "dillingerstagingabc123/dillingerfunctionrepo" >"$MOCK_STATE_DIR/companion_repos.txt"
  echo "/aws/lambda/dillinger-staging-Fn-XYZ" >"$MOCK_STATE_DIR/log_groups.txt"
  ln -s "$TEST_DIR/mock-aws-deprovision.sh" "$WORK/bin/aws"
  export PATH="$WORK/bin:$PATH"
}

line_of() { grep -n "$1" "$MOCK_CALL_LOG" | head -1 | cut -d: -f1; }

# --- Scenario 1: full deprovision --------------------------------------------

setup
if OUT="$("$DEPROVISION" staging --yes 2>&1)"; then
  pass "full: exits 0"
else
  fail "full: exited non-zero: $OUT"
fi
for expected in "cloudfront-keyvaluestore delete-key" \
    "ecr delete-repository" \
    "delete-stack --region eu-west-2 --stack-name dillinger-staging" \
    "delete-stack --region eu-west-2 --stack-name dillinger-staging-abc123-CompanionStack" \
    "logs delete-log-group"; do
  if grep -q "$expected" "$MOCK_CALL_LOG"; then
    pass "full: called ${expected}"
  else
    fail "full: never called ${expected}"
  fi
done
ROUTE="$(line_of 'delete-key')"
ECRDEL="$(line_of 'ecr delete-repository')"
STACK="$(line_of 'delete-stack --region eu-west-2 --stack-name dillinger-staging$')"
STACK="${STACK:-$(grep -n 'delete-stack --region eu-west-2 --stack-name dillinger-staging' "$MOCK_CALL_LOG" | grep -v CompanionStack | head -1 | cut -d: -f1)}"
COMP="$(line_of 'delete-stack --region eu-west-2 --stack-name dillinger-staging-abc123-CompanionStack')"
if [[ "$ROUTE" -lt "$ECRDEL" && "$ECRDEL" -lt "$STACK" && "$STACK" -lt "$COMP" ]]; then
  pass "full: order is route -> ECR -> stack -> companion"
else
  fail "full: wrong order (route=$ROUTE ecr=$ECRDEL stack=$STACK companion=$COMP)"
fi
if jq -e '.tenants | map(.tenantId) == ["alice"]' "$DILLINGER_ROOT/infra/tenants.json" >/dev/null \
    && jq -e '.tenants | map(.tenantId) == ["alice"]' "$DILLINGER_ROOT/infra/desired-tenants.json" >/dev/null; then
  pass "full: removed from BOTH registries, other tenants untouched"
else
  fail "full: registry cleanup wrong: $(cat "$DILLINGER_ROOT/infra/tenants.json" "$DILLINGER_ROOT/infra/desired-tenants.json")"
fi
if [[ "$OUT" == *"region: eu-west-2"* ]]; then
  pass "full: region resolved from tenants.json"
else
  fail "full: region not resolved from tenants.json"
fi

# --- Scenario 2: gateway not deployed / route already absent -----------------

setup
rm "$MOCK_STATE_DIR/gateway_exists"
if OUT="$("$DEPROVISION" staging --yes 2>&1)"; then
  pass "no gateway: exits 0"
else
  fail "no gateway: exited non-zero: $OUT"
fi
if grep -q "delete-key" "$MOCK_CALL_LOG"; then
  fail "no gateway: tried to delete a route anyway"
else
  pass "no gateway: skipped route removal"
fi

setup
touch "$MOCK_STATE_DIR/kvs_key_missing"
if OUT="$("$DEPROVISION" staging --yes 2>&1)" && [[ "$OUT" == *"already absent"* ]]; then
  pass "missing route: tolerated and reported"
else
  fail "missing route: not tolerated: $OUT"
fi

# --- Scenario 3: declining the prompt deletes nothing -------------------------

setup
OUT="$(echo "no" | "$DEPROVISION" staging 2>&1)" || true
if grep -qE "delete-key|delete-stack|delete-repository|delete-log-group" "$MOCK_CALL_LOG"; then
  fail "declined: deletions happened anyway"
else
  pass "declined: zero deletions"
fi
if jq -e '.tenants | length == 2' "$DILLINGER_ROOT/infra/tenants.json" >/dev/null; then
  pass "declined: registries untouched"
else
  fail "declined: registries were modified"
fi

echo "===================================="
echo "deprovision-tenant.test.sh: ${PASS} passed, ${FAIL} failed"
[[ "$FAIL" -eq 0 ]]
