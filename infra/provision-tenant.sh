#!/usr/bin/env bash
# Provisions (or updates) one single-tenant Dillinger instance on AWS
# Lambda. Each tenant gets a fully isolated CloudFormation stack, Lambda
# function, and Function URL — no state or infra is shared between
# tenants. Run this once per new user.
#
# Usage: infra/provision-tenant.sh <tenant-id> [aws-region]
#
# Requires: AWS CLI configured with credentials that have the
# least-privilege permissions described in spec/01-aws-account-onboarding.md,
# and the AWS SAM CLI installed.

set -euo pipefail

TENANT_ID="${1:?Usage: provision-tenant.sh <tenant-id> [aws-region]}"
REGION="${2:-${AWS_DEFAULT_REGION:-us-east-1}}"
STACK_NAME="dillinger-${TENANT_ID}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! [[ "$TENANT_ID" =~ ^[a-z0-9-]+$ ]]; then
  echo "tenant-id must match [a-z0-9-]+ (got: ${TENANT_ID})" >&2
  exit 1
fi

echo "==> Building ${STACK_NAME} (tenant: ${TENANT_ID}, region: ${REGION})"
cd "$REPO_ROOT/infra"
sam build --template-file template.yaml

echo "==> Deploying ${STACK_NAME}"
sam deploy \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --resolve-image-repos \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides "TenantId=${TENANT_ID}" \
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
  --capabilities CAPABILITY_IAM \
  --parameter-overrides "TenantId=${TENANT_ID}" "NextPublicBaseUrl=${FUNCTION_URL}" \
  --no-confirm-changeset \
  --no-fail-on-empty-changeset

echo "==> Recording tenant in infra/tenants.json"
python3 "$REPO_ROOT/infra/record-tenant.py" "$TENANT_ID" "$REGION" "$FUNCTION_URL"

echo
echo "Tenant '${TENANT_ID}' is live at: ${FUNCTION_URL}"
