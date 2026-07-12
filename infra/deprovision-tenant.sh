#!/usr/bin/env bash
# Deprovisions one tenant: the exact inverse of provision-tenant.sh.
# Removes the tenant's gateway route, its ECR images/repo, its stack (and
# SAM's per-tenant companion stack), any leftover log groups, and its
# entries in tenants.json AND desired-tenants.json.
#
# Removing the desired-state entry matters: the orchestrator reconciles
# desired -> actual (create/update only), so a tenant left in
# desired-tenants.json would simply be redeployed on the next run.sh.
#
# Usage: infra/deprovision-tenant.sh <tenant-id> [region] [--yes]
#
#   region   defaults to the tenant's region in tenants.json, then
#            AWS_DEFAULT_REGION, then us-east-1 (matching
#            provision-tenant.sh's fallback chain)
#   --yes    skip the confirmation prompt
#
# Runs with the normal deploy credentials - every action here is covered
# by dillinger-deploy-policy (v7+), no admin/root profile needed.

set -euo pipefail

ROOT="${DILLINGER_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
GATEWAY_STACK="dillinger-gateway"
GATEWAY_REGION="us-east-1" # fixed - see infra/gateway/README.md

TENANT_ID="${1:?Usage: deprovision-tenant.sh <tenant-id> [region] [--yes]}"
shift

REGION=""
ASSUME_YES=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --yes) ASSUME_YES=1; shift ;;
    *) REGION="$1"; shift ;;
  esac
done

TENANTS_FILE="$ROOT/infra/tenants.json"
DESIRED_FILE="$ROOT/infra/desired-tenants.json"

if [[ -z "$REGION" ]]; then
  REGION="$(jq -r --arg t "$TENANT_ID" \
    '.tenants[] | select(.tenantId == $t) | .region // empty' \
    "$TENANTS_FILE" 2>/dev/null || true)"
  REGION="${REGION:-${AWS_DEFAULT_REGION:-us-east-1}}"
fi

STACK_NAME="dillinger-${TENANT_ID}"

# Companion stacks: SAM creates "dillinger-<tenant>-<hash>-CompanionStack"
# per tenant to hold the ECR repo (--resolve-image-repos).
COMPANION_STACKS="$(aws cloudformation list-stacks --region "$REGION" \
  --query "StackSummaries[?starts_with(StackName, 'dillinger-${TENANT_ID}-') && contains(StackName, 'CompanionStack') && StackStatus != 'DELETE_COMPLETE'].StackName" \
  --output text | tr '\t' '\n' | grep -v '^$' || true)"

STACK_EXISTS=0
aws cloudformation describe-stacks --region "$REGION" --stack-name "$STACK_NAME" >/dev/null 2>&1 && STACK_EXISTS=1

echo "Will deprovision tenant '${TENANT_ID}' (region: ${REGION}):"
echo "  Stack:            $([[ $STACK_EXISTS -eq 1 ]] && echo "$STACK_NAME" || echo "not deployed")"
echo "  Companion stacks: ${COMPANION_STACKS:-none}"
echo "  Gateway route:    key '${TENANT_ID}' (if the gateway is deployed)"
echo "  Registry entries: tenants.json + desired-tenants.json"
echo

if [[ "$ASSUME_YES" -ne 1 ]]; then
  read -r -p "Type 'delete' to proceed: " CONFIRM
  if [[ "$CONFIRM" != "delete" ]]; then
    echo "Aborted - nothing was deleted."
    exit 0
  fi
fi

# --- 1. Gateway route (so traffic stops resolving before the origin dies) ----

KVS_ARN="$(aws cloudformation describe-stacks \
  --region "$GATEWAY_REGION" \
  --stack-name "$GATEWAY_STACK" \
  --query "Stacks[0].Outputs[?OutputKey=='KeyValueStoreArn'].OutputValue" \
  --output text 2>/dev/null || true)"

if [[ -n "$KVS_ARN" && "$KVS_ARN" != "None" ]]; then
  ETAG="$(aws cloudfront-keyvaluestore describe-key-value-store \
    --kvs-arn "$KVS_ARN" --query "ETag" --output text)"
  if aws cloudfront-keyvaluestore delete-key \
      --kvs-arn "$KVS_ARN" --key "$TENANT_ID" --if-match "$ETAG" >/dev/null 2>&1; then
    echo "==> Removed gateway route for '${TENANT_ID}'"
  else
    echo "==> No gateway route for '${TENANT_ID}' (already absent)"
  fi
else
  echo "==> Gateway not deployed - no route to remove"
fi

# --- 2. ECR repos, then stacks (repos with images block stack deletion) ------

for companion in $COMPANION_STACKS; do
  REPOS="$(aws cloudformation list-stack-resources --region "$REGION" \
    --stack-name "$companion" \
    --query "StackResourceSummaries[?ResourceType=='AWS::ECR::Repository'].PhysicalResourceId" \
    --output text | tr '\t' '\n' | grep -v '^$' || true)"
  for repo in $REPOS; do
    echo "==> Deleting ECR repository ${repo}"
    aws ecr delete-repository --region "$REGION" --repository-name "$repo" --force >/dev/null
  done
done

if [[ "$STACK_EXISTS" -eq 1 ]]; then
  echo "==> Deleting stack ${STACK_NAME}"
  aws cloudformation delete-stack --region "$REGION" --stack-name "$STACK_NAME"
  aws cloudformation wait stack-delete-complete --region "$REGION" --stack-name "$STACK_NAME"
fi

for companion in $COMPANION_STACKS; do
  echo "==> Deleting companion stack ${companion}"
  aws cloudformation delete-stack --region "$REGION" --stack-name "$companion"
  aws cloudformation wait stack-delete-complete --region "$REGION" --stack-name "$companion"
done

# --- 3. Leftover log groups (the stack owns its log group, but orphans can
#        survive failed deletes or pre-LogGroup-resource deploys) -------------

LEFTOVER_LOGS="$(aws logs describe-log-groups --region "$REGION" \
  --log-group-name-prefix "/aws/lambda/${STACK_NAME}" \
  --query 'logGroups[].logGroupName' --output text | tr '\t' '\n' | grep -v '^$' || true)"
for lg in $LEFTOVER_LOGS; do
  echo "==> Deleting leftover log group ${lg}"
  aws logs delete-log-group --region "$REGION" --log-group-name "$lg"
done

# --- 4. Registry entries ------------------------------------------------------

python3 - "$TENANT_ID" "$TENANTS_FILE" "$DESIRED_FILE" <<'PYEOF'
import json, sys

tenant_id, tenants_path, desired_path = sys.argv[1:4]
for path in (tenants_path, desired_path):
    try:
        data = json.load(open(path))
    except FileNotFoundError:
        continue
    before = len(data.get("tenants", []))
    data["tenants"] = [t for t in data.get("tenants", []) if t.get("tenantId") != tenant_id]
    if len(data["tenants"]) != before:
        with open(path, "w") as f:
            json.dump(data, f, indent=2)
            f.write("\n")
        print(f"==> Removed '{tenant_id}' from {path}")
PYEOF

echo
echo "Tenant '${TENANT_ID}' deprovisioned."
echo "Note: infra/orchestrator/state/*.json may still mention it until the"
echo "next orchestrator run regenerates them."
