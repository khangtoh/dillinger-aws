#!/usr/bin/env bash
# Tests bootstrap-account.sh against the mocked `aws` CLI (mock-aws.sh).
# Three scenarios: fresh account (everything created), fully-bootstrapped
# account (complete no-op), and drifted documents (policy version bump
# with 5-version pruning + trust policy update).

set -euo pipefail

TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BOOTSTRAP="$TEST_DIR/../bootstrap-account.sh"

PASS=0
FAIL=0
pass() { echo "PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "FAIL: $1"; FAIL=$((FAIL + 1)); }

ACCOUNT="111122223333"
REGION="eu-west-2"
REPO="someone/some-fork"

setup() {
  WORK="$(mktemp -d)"
  export MOCK_STATE_DIR="$WORK/state"
  export MOCK_CALL_LOG="$WORK/calls.log"
  mkdir -p "$MOCK_STATE_DIR" "$WORK/bin"
  : >"$MOCK_CALL_LOG"
  echo "$ACCOUNT" >"$MOCK_STATE_DIR/account.txt"
  echo "arn:aws:iam::${ACCOUNT}:policy/dillinger-deploy-policy" >"$MOCK_STATE_DIR/policy_arn.txt"
  echo "arn:aws:iam::${ACCOUNT}:oidc-provider/token.actions.githubusercontent.com" >"$MOCK_STATE_DIR/oidc_arn.txt"
  ln -s "$TEST_DIR/mock-aws.sh" "$WORK/bin/aws"
  export PATH="$WORK/bin:$PATH"
}

render() { # render a template with this test's account/region/repo
  sed "s/__ACCOUNT__/${ACCOUNT}/g; s/__REGION__/${REGION}/g; s#__REPO__#${REPO}#g" "$1"
}

called() { grep -q "$1" "$MOCK_CALL_LOG"; }

# --- Scenario 1: fresh account - everything gets created --------------------

setup
if OUT="$("$BOOTSTRAP" "$REGION" --repo "$REPO" 2>&1)"; then
  pass "fresh account: exits 0"
else
  fail "fresh account: exited non-zero: $OUT"
fi
for expected in "iam create-policy " "iam create-user" "iam attach-user-policy" \
    "iam create-open-id-connect-provider" "iam create-role" "iam attach-role-policy"; do
  if called "$expected"; then
    pass "fresh account: called ${expected% }"
  else
    fail "fresh account: never called ${expected% }"
  fi
done
if called "create-access-key"; then
  fail "fresh account: created an access key without --create-access-key"
else
  pass "fresh account: no access key without the flag"
fi
# The rendered policy handed to create-policy must have no placeholders left
POLICY_FILE="$(grep "iam create-policy " "$MOCK_CALL_LOG" | grep -oE 'file://[^ ]+' | sed 's#file://##')"
if [[ -n "$POLICY_FILE" ]] && ! grep -q "__ACCOUNT__\|__REGION__" <(render "$TEST_DIR/../deploy-policy.template.json") \
    && grep -q "$ACCOUNT" <(render "$TEST_DIR/../deploy-policy.template.json"); then
  pass "fresh account: template renders with real account/region substituted"
else
  fail "fresh account: placeholder substitution broken"
fi

# --- Scenario 2: fully bootstrapped - complete no-op -------------------------

setup
touch "$MOCK_STATE_DIR"/{policy_exists,user_exists,user_policy_attached,oidc_exists,role_exists,role_policy_attached}
render "$TEST_DIR/../deploy-policy.template.json" >"$MOCK_STATE_DIR/policy_doc.json"
render "$TEST_DIR/../ci-trust-policy.template.json" >"$MOCK_STATE_DIR/role_trust.json"
if OUT="$("$BOOTSTRAP" "$REGION" --repo "$REPO" 2>&1)"; then
  pass "bootstrapped account: exits 0"
else
  fail "bootstrapped account: exited non-zero: $OUT"
fi
if grep -qE "create-|update-|delete-|attach-" "$MOCK_CALL_LOG"; then
  fail "bootstrapped account: expected full no-op, but mutations happened: $(grep -E 'create-|update-|delete-|attach-' "$MOCK_CALL_LOG")"
else
  pass "bootstrapped account: zero mutating calls"
fi
if [[ "$OUT" == *"nothing to do"* ]]; then
  pass "bootstrapped account: reports nothing to do"
else
  fail "bootstrapped account: missing 'nothing to do' summary"
fi

# --- Scenario 3: drifted documents - version bump + prune + trust update -----

setup
touch "$MOCK_STATE_DIR"/{policy_exists,user_exists,user_policy_attached,oidc_exists,role_exists,role_policy_attached}
echo '{"Version": "2012-10-17", "Statement": []}' >"$MOCK_STATE_DIR/policy_doc.json"
echo '{"Version": "2012-10-17", "Statement": [{"Effect": "Allow"}]}' >"$MOCK_STATE_DIR/role_trust.json"
echo 5 >"$MOCK_STATE_DIR/policy_version_count"
if OUT="$("$BOOTSTRAP" "$REGION" --repo "$REPO" 2>&1)"; then
  pass "drifted account: exits 0"
else
  fail "drifted account: exited non-zero: $OUT"
fi
if called "iam delete-policy-version" && called "iam create-policy-version"; then
  # prune must happen before publish
  if [[ "$(grep -n "delete-policy-version" "$MOCK_CALL_LOG" | head -1 | cut -d: -f1)" \
      -lt "$(grep -n "create-policy-version" "$MOCK_CALL_LOG" | head -1 | cut -d: -f1)" ]]; then
    pass "drifted account: pruned oldest version before publishing (5-version cap)"
  else
    fail "drifted account: publish happened before prune"
  fi
else
  fail "drifted account: expected delete-policy-version + create-policy-version"
fi
if called "iam update-assume-role-policy"; then
  pass "drifted account: trust policy updated from template"
else
  fail "drifted account: trust drift not corrected"
fi
if called "iam create-policy " || called "iam create-user" || called "iam create-role"; then
  fail "drifted account: recreated entities that already exist"
else
  pass "drifted account: no spurious creates"
fi

echo "===================================="
echo "bootstrap.test.sh: ${PASS} passed, ${FAIL} failed"
[[ "$FAIL" -eq 0 ]]
