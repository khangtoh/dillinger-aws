#!/usr/bin/env bash
# Mock `aws` CLI for deprovision-tenant.test.sh (same pattern as the
# orchestrator and bootstrap test mocks). Logs every invocation to
# $MOCK_CALL_LOG; behavior driven by files in $MOCK_STATE_DIR:
#   gateway_exists       gateway describe-stacks succeeds (KVS output)
#   tenant_stack_exists  tenant describe-stacks succeeds
#   companion_stacks.txt list-stacks output (newline separated)
#   companion_repos.txt  list-stack-resources ECR repo names
#   log_groups.txt       describe-log-groups output
#   kvs_key_missing      delete-key fails (key not in store)

set -euo pipefail

echo "$*" >>"$MOCK_CALL_LOG"

STATE="$MOCK_STATE_DIR"
has() { [[ -e "$STATE/$1" ]]; }
args="$*"

case "$1 $2" in
  "cloudformation describe-stacks")
    if [[ "$args" == *"dillinger-gateway"* ]]; then
      has gateway_exists || exit 255
      echo "arn:aws:cloudfront::111122223333:key-value-store/mock-kvs"
    else
      has tenant_stack_exists || exit 255
      echo '{"Stacks": [{"StackStatus": "UPDATE_COMPLETE"}]}'
    fi
    ;;
  "cloudformation list-stacks")
    cat "$STATE/companion_stacks.txt" 2>/dev/null | tr '\n' '\t' || echo ""
    ;;
  "cloudformation list-stack-resources")
    cat "$STATE/companion_repos.txt" 2>/dev/null | tr '\n' '\t' || echo ""
    ;;
  "cloudformation delete-stack"|"cloudformation wait")
    ;;
  "cloudfront-keyvaluestore describe-key-value-store")
    echo "MOCK-ETAG"
    ;;
  "cloudfront-keyvaluestore delete-key")
    has kvs_key_missing && exit 254
    ;;
  "ecr delete-repository")
    ;;
  "logs describe-log-groups")
    cat "$STATE/log_groups.txt" 2>/dev/null | tr '\n' '\t' || echo ""
    ;;
  "logs delete-log-group")
    ;;
  *)
    echo "mock-aws-deprovision.sh: unhandled command: $args" >&2
    exit 99
    ;;
esac
