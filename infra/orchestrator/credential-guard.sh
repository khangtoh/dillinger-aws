#!/usr/bin/env bash
# The single place that answers "do we have AWS access, and is it enough
# to do this project's job." Nothing else in the orchestrator re-implements
# this check - check-state.sh and sync.sh read the JSON this script writes
# instead of calling AWS themselves to figure out credential/permission
# status.
#
# Usage: infra/orchestrator/credential-guard.sh
#
# Requires: AWS CLI on PATH (real, or a mock for testing - see
# infra/orchestrator/test/). Reads AWS_REGION / AWS_DEFAULT_REGION / the
# CLI's configured region to resolve which region to check permissions in.
#
# Writes: infra/orchestrator/state/credential-status.json (schema
# documented in spec/11-deployment-orchestrator/README.md).
#
# Exit codes:
#   0 - credentialsPresent: true, permissionsOk is true or null (unknown
#       counts as "proceed cautiously", not "blocked")
#   1 - credentialsPresent: false
#   2 - credentialsPresent: true, permissionsOk: false (see
#       missingPermissions in the JSON)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
STATE_DIR="$REPO_ROOT/infra/orchestrator/state"
OUTPUT_FILE="$STATE_DIR/credential-status.json"

mkdir -p "$STATE_DIR"

TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# --- Step 1: do we have credentials at all? ---------------------------------

IDENTITY_ERR_FILE="$(mktemp)"
IDENTITY_JSON=""
if ! IDENTITY_JSON="$(aws sts get-caller-identity --output json 2>"$IDENTITY_ERR_FILE")"; then
  IDENTITY_ERR="$(cat "$IDENTITY_ERR_FILE" 2>/dev/null || true)"
  rm -f "$IDENTITY_ERR_FILE"

  python3 - "$OUTPUT_FILE" "$TIMESTAMP" "$IDENTITY_ERR" <<'PYEOF'
import json
import sys

output_file, timestamp, err = sys.argv[1], sys.argv[2], sys.argv[3]
data = {
    "timestamp": timestamp,
    "credentialsPresent": False,
    "identity": None,
    "region": None,
    "permissionsChecked": [],
    "permissionsOk": False,
    "missingPermissions": [],
    "errors": [err.strip() or "aws sts get-caller-identity failed with no error output"],
}
with open(output_file, "w") as f:
    json.dump(data, f, indent=2)
    f.write("\n")
PYEOF

  echo "Credentials not present or invalid - see ${OUTPUT_FILE}" >&2
  exit 1
fi
rm -f "$IDENTITY_ERR_FILE"

# --- Step 2: parse identity, resolve region ---------------------------------

ACCOUNT="$(python3 -c "import json,sys; print(json.load(sys.stdin)['Account'])" <<<"$IDENTITY_JSON")"
ARN="$(python3 -c "import json,sys; print(json.load(sys.stdin)['Arn'])" <<<"$IDENTITY_JSON")"
USER_ID="$(python3 -c "import json,sys; print(json.load(sys.stdin)['UserId'])" <<<"$IDENTITY_JSON")"

REGION=""
if [[ -n "${AWS_REGION:-}" ]]; then
  REGION="$AWS_REGION"
elif [[ -n "${AWS_DEFAULT_REGION:-}" ]]; then
  REGION="$AWS_DEFAULT_REGION"
else
  REGION="$(aws configure get region 2>/dev/null || true)"
fi

ERRORS=()

if [[ -z "$REGION" ]]; then
  ERRORS+=("No region configured (checked AWS_REGION, AWS_DEFAULT_REGION, aws configure get region) - permission checks skipped, region left null")
fi

# --- Step 3: permission checks (skipped entirely if no region) -------------

# Each row mirrors spec/01-aws-account-onboarding.md's least-privilege
# policy exactly - do not add/remove actions here without updating that
# spec first. Format per group: "resource-arn|action1,action2,...".
# Multiple actions sharing a resource pattern are batched into one
# simulate-principal-policy call, so "N permission checks" in the summary
# line below counts these groups (7), not individual actions (20).
declare -a PERMISSION_GROUPS=()

if [[ -n "$REGION" ]]; then
  PERMISSION_GROUPS+=(
    "arn:aws:lambda:${REGION}:${ACCOUNT}:function:dillinger-*|lambda:CreateFunction,lambda:UpdateFunctionCode,lambda:GetFunction,lambda:CreateFunctionUrlConfig,lambda:InvokeFunction"
    "arn:aws:ecr:${REGION}:${ACCOUNT}:repository/dillinger*|ecr:CreateRepository,ecr:PutImage"
    "*|ecr:GetAuthorizationToken"
    "arn:aws:iam::${ACCOUNT}:role/dillinger-*|iam:CreateRole,iam:PassRole,iam:AttachRolePolicy,iam:PutRolePolicy,iam:GetRole"
    "arn:aws:logs:${REGION}:${ACCOUNT}:log-group:/aws/lambda/dillinger*|logs:CreateLogGroup,logs:PutRetentionPolicy"
    "arn:aws:cloudformation:${REGION}:${ACCOUNT}:stack/dillinger-*/*|cloudformation:CreateStack,cloudformation:UpdateStack,cloudformation:DescribeStacks"
    "*|cloudfront:CreateFunction,cloudfront:CreateDistribution"
  )
fi

# permissionsChecked entries accumulate as tab-separated
# "action<TAB>resourceArn<TAB>allowed(true/false)" lines in a temp file,
# since bash arrays don't nest cleanly and this data needs to reach the
# python3 JSON writer at the end.
CHECKED_FILE="$(mktemp)"
SIM_ERR_FILE="$(mktemp)"
trap 'rm -f "$CHECKED_FILE" "$SIM_ERR_FILE"' EXIT

SIMULATE_UNAVAILABLE=0
GROUPS_CHECKED=0

for group in "${PERMISSION_GROUPS[@]+"${PERMISSION_GROUPS[@]}"}"; do
  resource_arn="${group%%|*}"
  actions_csv="${group#*|}"
  IFS=',' read -r -a actions <<<"$actions_csv"

  SIM_JSON=""
  if ! SIM_JSON="$(aws iam simulate-principal-policy \
        --policy-source-arn "$ARN" \
        --action-names "${actions[@]}" \
        --resource-arns "$resource_arn" \
        --output json 2>"$SIM_ERR_FILE")"; then
    SIM_ERR="$(cat "$SIM_ERR_FILE" 2>/dev/null || true)"

    # Caller might not have iam:SimulatePrincipalPolicy itself. Treat that
    # as "can't pre-verify", not "confirmed missing" - see step 4 of the
    # sub-spec. Detect it by the usual AccessDenied wording rather than
    # assuming every simulate failure means this.
    if grep -qiE "AccessDenied|is not authorized to perform.*SimulatePrincipalPolicy" <<<"$SIM_ERR"; then
      SIMULATE_UNAVAILABLE=1
      ERRORS+=("iam:SimulatePrincipalPolicy denied - permissions could not be pre-verified and will only be discovered at actual deploy time (${SIM_ERR//$'\n'/ })")
      break
    else
      ERRORS+=("simulate-principal-policy call failed for actions [${actions_csv}] on resource ${resource_arn}: ${SIM_ERR//$'\n'/ }")
      continue
    fi
  fi
  GROUPS_CHECKED=$((GROUPS_CHECKED + 1))

  # Real aws iam simulate-principal-policy output shape (verified against
  # botocore's iam service model, iam/service-2.json's
  # PolicyEvaluationDecisionType shape): EvaluationResults[].EvalDecision
  # is one of "allowed" | "explicitDeny" | "implicitDeny" - there is no
  # "allowedForAll" value in this shape (that only shows up in some docs
  # examples for multi-resource ResourceSpecificResults, which we don't
  # hit here since each call passes exactly one resource ARN) - only
  # "allowed" counts as allowed.
  while IFS=$'\t' read -r eval_action eval_decision; do
    [[ -z "$eval_action" ]] && continue
    allowed="false"
    if [[ "$eval_decision" == "allowed" ]]; then
      allowed="true"
    fi
    printf '%s\t%s\t%s\n' "$eval_action" "$resource_arn" "$allowed" >>"$CHECKED_FILE"
  done < <(python3 -c "
import json, sys
data = json.load(sys.stdin)
for r in data.get('EvaluationResults', []):
    print(f\"{r.get('EvalActionName','')}\t{r.get('EvalDecision','')}\")
" <<<"$SIM_JSON")
done

# --- Step 4: assemble permissionsOk / missingPermissions --------------------

PERMISSIONS_OK="true"
if [[ -z "$REGION" ]]; then
  PERMISSIONS_OK="null"
elif [[ "$SIMULATE_UNAVAILABLE" == "1" ]]; then
  PERMISSIONS_OK="null"
elif [[ -s "$CHECKED_FILE" ]] && grep -qP '\tfalse$' "$CHECKED_FILE"; then
  PERMISSIONS_OK="false"
fi

# --- Step 5: write output JSON + summary line -------------------------------

python3 - "$OUTPUT_FILE" "$TIMESTAMP" "$ACCOUNT" "$ARN" "$USER_ID" "$REGION" "$CHECKED_FILE" "$PERMISSIONS_OK" <<'PYEOF' "${ERRORS[@]+"${ERRORS[@]}"}"
import json
import sys

output_file, timestamp, account, arn, user_id, region, checked_file, permissions_ok = sys.argv[1:9]
errors = sys.argv[9:]

permissions_checked = []
missing_permissions = []
with open(checked_file) as f:
    for line in f:
        line = line.rstrip("\n")
        if not line:
            continue
        action, resource_arn, allowed = line.split("\t")
        allowed_bool = allowed == "true"
        entry = {"action": action, "resourceArn": resource_arn, "allowed": allowed_bool}
        permissions_checked.append(entry)
        if not allowed_bool:
            missing_permissions.append(entry)

permissions_ok_value = {"true": True, "false": False, "null": None}[permissions_ok]

data = {
    "timestamp": timestamp,
    "credentialsPresent": True,
    "identity": {"account": account, "arn": arn, "userId": user_id},
    "region": region if region else None,
    "permissionsChecked": permissions_checked,
    "permissionsOk": permissions_ok_value,
    "missingPermissions": missing_permissions,
    "errors": errors,
}

with open(output_file, "w") as f:
    json.dump(data, f, indent=2)
    f.write("\n")
PYEOF

if [[ "$PERMISSIONS_OK" == "true" ]]; then
  echo "Credentials OK (account ${ACCOUNT}, region ${REGION}) - all ${GROUPS_CHECKED} permission checks passed"
  exit 0
elif [[ "$PERMISSIONS_OK" == "null" ]]; then
  echo "Credentials present but permissions could not be fully pre-verified (account ${ACCOUNT}) - see credential-status.json errors"
  exit 0
else
  MISSING_COUNT="$(grep -cP '\tfalse$' "$CHECKED_FILE" || true)"
  echo "Credentials present but missing ${MISSING_COUNT}/${GROUPS_CHECKED} permission checks - see credential-status.json"
  exit 2
fi
