#!/usr/bin/env bash
# Tests teardown-account.sh against the mocked `aws` CLI (mock-aws.sh):
# deletion order (tenants -> gateway -> bucket purge -> companion -> IAM),
# the --keep-iam boundary, the shared-OIDC-provider guard, and that
# nothing is deleted when the confirmation prompt is declined.

set -euo pipefail

TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEARDOWN="$TEST_DIR/../teardown-account.sh"

PASS=0
FAIL=0
pass() { echo "PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "FAIL: $1"; FAIL=$((FAIL + 1)); }

ACCOUNT="111122223333"
REGION="eu-west-2"

setup() {
  WORK="$(mktemp -d)"
  export MOCK_STATE_DIR="$WORK/state"
  export MOCK_CALL_LOG="$WORK/calls.log"
  mkdir -p "$MOCK_STATE_DIR" "$WORK/bin"
  : >"$MOCK_CALL_LOG"
  echo "$ACCOUNT" >"$MOCK_STATE_DIR/account.txt"
  echo "arn:aws:iam::${ACCOUNT}:policy/dillinger-deploy-policy" >"$MOCK_STATE_DIR/policy_arn.txt"
  echo "arn:aws:iam::${ACCOUNT}:oidc-provider/token.actions.githubusercontent.com" >"$MOCK_STATE_DIR/oidc_arn.txt"
  # A fully-populated account
  printf 'dillinger-staging\ndillinger-alice\n' >"$MOCK_STATE_DIR/tenant_stacks.txt"
  touch "$MOCK_STATE_DIR"/{gateway_exists,companion_exists,policy_exists,user_exists,role_exists,oidc_exists,bucket_has_versions}
  echo "aws-sam-cli-managed-default-samclisourcebucket-abc123" >"$MOCK_STATE_DIR/sam_buckets.txt"
  echo "dillingerstagingxyz" >"$MOCK_STATE_DIR/ecr_repos.txt"
  echo "/aws/lambda/dillinger-staging-fn" >"$MOCK_STATE_DIR/log_groups.txt"
  echo "AKIAOLDKEY" >"$MOCK_STATE_DIR/access_keys.txt"
  ln -s "$TEST_DIR/mock-aws.sh" "$WORK/bin/aws"
  export PATH="$WORK/bin:$PATH"
}

line_of() { grep -n "$1" "$MOCK_CALL_LOG" | head -1 | cut -d: -f1; }

# --- Scenario 1: full teardown with --yes ------------------------------------

setup
if OUT="$("$TEARDOWN" "$REGION" --yes 2>&1)"; then
  pass "full teardown: exits 0"
else
  fail "full teardown: exited non-zero: $OUT"
fi
for expected in "delete-stack --region ${REGION} --stack-name dillinger-staging" \
    "delete-stack --region ${REGION} --stack-name dillinger-alice" \
    "delete-stack --region us-east-1 --stack-name dillinger-gateway" \
    "delete-stack --region ${REGION} --stack-name aws-sam-cli-managed-default" \
    "s3api delete-objects" \
    "ecr delete-repository" \
    "logs delete-log-group" \
    "iam delete-role" "iam delete-user" "iam delete-policy " \
    "iam delete-access-key" \
    "iam delete-open-id-connect-provider"; do
  if grep -q "$expected" "$MOCK_CALL_LOG"; then
    pass "full teardown: ${expected}"
  else
    fail "full teardown: never called ${expected}"
  fi
done
# Order: tenants before gateway before companion; purge before companion
ECRDEL="$(line_of 'ecr delete-repository')"
T1="$(line_of 'delete-stack --region eu-west-2 --stack-name dillinger-staging')"
GW="$(line_of 'delete-stack --region us-east-1 --stack-name dillinger-gateway')"
PURGE="$(line_of 's3api delete-objects')"
COMP="$(line_of 'delete-stack --region eu-west-2 --stack-name aws-sam-cli-managed-default')"
IAMDEL="$(line_of 'iam delete-role')"
if [[ "$ECRDEL" -lt "$T1" && "$T1" -lt "$GW" && "$GW" -lt "$COMP" && "$PURGE" -lt "$COMP" && "$COMP" -lt "$IAMDEL" ]]; then
  pass "full teardown: order is ECR -> tenants -> gateway -> purge -> companion -> IAM"
else
  fail "full teardown: wrong order (ecr=$ECRDEL tenant=$T1 gw=$GW purge=$PURGE companion=$COMP iam=$IAMDEL)"
fi

# --- Scenario 2: --keep-iam leaves IAM alone ---------------------------------

setup
"$TEARDOWN" "$REGION" --yes --keep-iam >/dev/null 2>&1
if grep -qE "iam delete-|iam detach-" "$MOCK_CALL_LOG"; then
  fail "--keep-iam: IAM mutations happened anyway"
else
  pass "--keep-iam: zero IAM mutations"
fi
if grep -q "delete-stack --region us-east-1 --stack-name dillinger-gateway" "$MOCK_CALL_LOG"; then
  pass "--keep-iam: workloads still deleted"
else
  fail "--keep-iam: workloads were not deleted"
fi

# --- Scenario 3: OIDC provider kept when another role trusts it --------------

setup
cat >"$MOCK_STATE_DIR/trusting_roles.json" <<EOF
{"Roles": [{"RoleName": "unrelated-ci-role", "AssumeRolePolicyDocument": {"Statement": [{"Principal": {"Federated": "arn:aws:iam::${ACCOUNT}:oidc-provider/token.actions.githubusercontent.com"}}]}}]}
EOF
OUT="$("$TEARDOWN" "$REGION" --yes 2>&1)"
if grep -q "iam delete-open-id-connect-provider" "$MOCK_CALL_LOG"; then
  fail "shared OIDC: provider deleted despite another trusting role"
else
  pass "shared OIDC: provider kept"
fi
if [[ "$OUT" == *"unrelated-ci-role"* ]]; then
  pass "shared OIDC: names the trusting role in output"
else
  fail "shared OIDC: doesn't say why the provider was kept"
fi

# --- Scenario 4: declining the prompt deletes nothing -------------------------

setup
OUT="$(echo "no" | "$TEARDOWN" "$REGION" 2>&1)" || true
if grep -qE "delete-|detach-" "$MOCK_CALL_LOG"; then
  fail "declined prompt: deletions happened anyway"
else
  pass "declined prompt: zero deletions"
fi
if [[ "$OUT" == *"Aborted"* ]]; then
  pass "declined prompt: reports aborted"
else
  fail "declined prompt: missing aborted message"
fi

echo "===================================="
echo "teardown.test.sh: ${PASS} passed, ${FAIL} failed"
[[ "$FAIL" -eq 0 ]]
