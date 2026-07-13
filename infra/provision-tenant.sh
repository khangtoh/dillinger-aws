#!/usr/bin/env bash
# Provisions (or updates) one single-tenant Dillinger instance on AWS
# Lambda. Each tenant gets a fully isolated CloudFormation stack, Lambda
# function, and Function URL — no state or infra is shared between
# tenants. Run this once per new user.
#
# Usage: infra/provision-tenant.sh <tenant-id> [aws-region] [max-concurrency]
#
# max-concurrency overrides the template's MaxTenantConcurrency (default
# 2, i.e. the ReservedConcurrentExecutions on that tenant's Lambda
# function — see ARCHITECTURE.md's "Reserved concurrency and the
# microVM pool" section for what this actually caps). Every AWS account
# must keep at least 10 units of *unreserved* concurrency free at all
# times; on accounts with a low total Lambda concurrency quota, adding
# a new tenant at the default of 2 can fail with "decreases account's
# UnreservedConcurrentExecution below its minimum value of [10]" once
# enough tenants exist. Pass a smaller value (as low as 1) to fit a new
# tenant into whatever headroom remains, at the cost of that tenant only
# being able to run one concurrent request before others are throttled.
#
# Requires: AWS CLI configured with credentials that have the
# least-privilege permissions described in spec/01-aws-account-onboarding.md,
# and the AWS SAM CLI installed.

set -euo pipefail

TENANT_ID="${1:?Usage: provision-tenant.sh <tenant-id> [aws-region] [max-concurrency]}"
REGION="${2:-${AWS_DEFAULT_REGION:-us-east-1}}"
MAX_CONCURRENCY="${3:-}"
STACK_NAME="dillinger-${TENANT_ID}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! [[ "$TENANT_ID" =~ ^[a-z0-9-]+$ ]]; then
  echo "tenant-id must match [a-z0-9-]+ (got: ${TENANT_ID})" >&2
  exit 1
fi

PARAM_OVERRIDES=("TenantId=${TENANT_ID}")
if [[ -n "$MAX_CONCURRENCY" ]]; then
  PARAM_OVERRIDES+=("MaxTenantConcurrency=${MAX_CONCURRENCY}")
fi

# A stack left in ROLLBACK_COMPLETE (or ROLLBACK_FAILED) by a previous
# failed create is a CloudFormation dead end: CreateChangeSet always
# rejects it with "can not be updated", regardless of what changed.
# The only way forward is to delete it and let sam deploy create it
# fresh - safe here because these states mean nothing was ever
# successfully created, there is no live resource to lose.
EXISTING_STATUS=$(aws cloudformation describe-stacks \
  --region "$REGION" --stack-name "$STACK_NAME" \
  --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "DOES_NOT_EXIST")
if [[ "$EXISTING_STATUS" == "ROLLBACK_COMPLETE" || "$EXISTING_STATUS" == "ROLLBACK_FAILED" ]]; then
  echo "==> ${STACK_NAME} is stuck in ${EXISTING_STATUS} from a previous failed create - deleting before redeploy"
  aws cloudformation delete-stack --region "$REGION" --stack-name "$STACK_NAME"
  aws cloudformation wait stack-delete-complete --region "$REGION" --stack-name "$STACK_NAME"
fi

# shellcheck source=orchestrator/lib/config-hash.sh
source "$REPO_ROOT/infra/orchestrator/lib/config-hash.sh"
CONFIG_HASH=$(compute_config_hash "$REPO_ROOT/infra/template.yaml" "${PARAM_OVERRIDES[@]}")
TAGS=("DillingerConfigHash=${CONFIG_HASH}" "Project=dillinger-aws" "TenantId=${TENANT_ID}")

echo "==> Building ${STACK_NAME} (tenant: ${TENANT_ID}, region: ${REGION})"
cd "$REPO_ROOT/infra"
sam build --template-file template.yaml

echo "==> Deploying ${STACK_NAME}"
sam deploy \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --resolve-image-repos \
  --resolve-s3 \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides "${PARAM_OVERRIDES[@]}" \
  --tags "${TAGS[@]}" \
  --no-confirm-changeset \
  --no-fail-on-empty-changeset

FUNCTION_URL=$(aws cloudformation describe-stacks \
  --region "$REGION" \
  --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='FunctionUrl'].OutputValue" \
  --output text)

echo "==> Setting NEXT_PUBLIC_BASE_URL to ${FUNCTION_URL} and redeploying"
sam deploy \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --resolve-image-repos \
  --resolve-s3 \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides "${PARAM_OVERRIDES[@]}" "NextPublicBaseUrl=${FUNCTION_URL}" \
  --tags "${TAGS[@]}" \
  --no-confirm-changeset \
  --no-fail-on-empty-changeset

echo "==> Recording tenant in infra/tenants.json"
python3 "$REPO_ROOT/infra/record-tenant.py" "$TENANT_ID" "$REGION" "$FUNCTION_URL"

echo "==> Registering route with the shared gateway (if deployed; see spec/10-gateway.md)"
"$REPO_ROOT/infra/register-tenant-route.sh" "$TENANT_ID" "$FUNCTION_URL"

echo
echo "Tenant '${TENANT_ID}' is live at: ${FUNCTION_URL}"
