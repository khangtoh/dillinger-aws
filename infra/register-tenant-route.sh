#!/usr/bin/env bash
# Registers (or updates) one tenant's route in the gateway's CloudFront
# KeyValueStore (see spec/10-gateway.md), so the shared entry gateway
# knows to route "<tenant-id>.<gateway-domain>" to that tenant's Lambda
# Function URL. Safe to run standalone; also called automatically by
# provision-tenant.sh once the gateway stack exists.
#
# Usage: infra/register-tenant-route.sh <tenant-id> <function-url> [gateway-stack-name]

set -euo pipefail

TENANT_ID="${1:?Usage: register-tenant-route.sh <tenant-id> <function-url> [gateway-stack-name]}"
FUNCTION_URL="${2:?Usage: register-tenant-route.sh <tenant-id> <function-url> [gateway-stack-name]}"
GATEWAY_STACK_NAME="${3:-dillinger-gateway}"

# Function URLs look like https://<id>.lambda-url.<region>.on.aws/ - the
# KVS should only ever hold the bare domain (no scheme, no trailing slash),
# since RouterFunction uses it directly as request.origin.custom.domainName.
ORIGIN_DOMAIN="$(echo "$FUNCTION_URL" | sed -E 's#^https?://##; s#/$##')"

# The gateway stack is always in us-east-1 (CloudFront/ACM requirement -
# same fixed constant as check-state.sh/sync.sh). Without an explicit
# --region this silently skipped registration whenever the ambient region
# was the tenant's (found in real use: CI provisioning staging in
# ap-southeast-1 never registered its route).
KVS_ARN=$(aws cloudformation describe-stacks \
  --region us-east-1 \
  --stack-name "$GATEWAY_STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='KeyValueStoreArn'].OutputValue" \
  --output text 2>/dev/null || true)

if [[ -z "$KVS_ARN" || "$KVS_ARN" == "None" ]]; then
  echo "Gateway stack '${GATEWAY_STACK_NAME}' not found or has no KeyValueStoreArn output - skipping route registration." >&2
  echo "(This is expected if the Phase 10 gateway hasn't been deployed yet; the tenant's own Function URL still works standalone.)" >&2
  exit 0
fi

# CloudFront KVS writes are optimistic-concurrency (ETag) based.
ETAG=$(aws cloudfront-keyvaluestore describe-key-value-store \
  --kvs-arn "$KVS_ARN" \
  --query "ETag" --output text)

aws cloudfront-keyvaluestore put-key \
  --kvs-arn "$KVS_ARN" \
  --key "$TENANT_ID" \
  --value "$ORIGIN_DOMAIN" \
  --if-match "$ETAG" > /dev/null

echo "Registered route: ${TENANT_ID} -> ${ORIGIN_DOMAIN} (gateway stack: ${GATEWAY_STACK_NAME})"
