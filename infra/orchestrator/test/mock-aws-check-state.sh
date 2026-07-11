#!/usr/bin/env bash
# Fake `aws` CLI used by check-state.test.sh. Intercepts
# `cloudformation describe-stacks` and returns a canned response keyed off
# `--stack-name`, so a single test run can exercise all four deployment
# statuses check-state.sh must produce (NOT_DEPLOYED, IN_SYNC, DRIFTED,
# FAILED) without touching real AWS.
#
# If $MOCK_AWS_LOG_FILE is set, every invocation (the full argument list)
# is appended to it before anything else happens. This lets the test
# assert that check-state.sh's credential guard genuinely prevents any AWS
# calls when credentials are missing, by checking the log stays empty.
#
# --- How the "dillinger-insync" DillingerConfigHash tag below was derived ---
# From the repo root:
#   source infra/orchestrator/lib/config-hash.sh
#   compute_config_hash "$(pwd)/infra/template.yaml" "TenantId=insync"
# => 89ef5bdf182adc6f69d26eb5e3e265af7867686fed3bfa2d79d5cb8c73e43f53
# Regenerate this the same way (with TenantId=insync) if infra/template.yaml
# ever changes, or this fixture will start reporting DRIFTED instead of
# IN_SYNC. "dillinger-drifted" deliberately uses a tag value that will
# never match, so it doesn't need regenerating.

set -euo pipefail

if [[ -n "${MOCK_AWS_LOG_FILE:-}" ]]; then
  printf '%s\n' "$*" >>"$MOCK_AWS_LOG_FILE"
fi

if [[ "${1:-}" != "cloudformation" || "${2:-}" != "describe-stacks" ]]; then
  echo "mock-aws-check-state.sh: unsupported command: $*" >&2
  exit 1
fi

STACK_NAME=""
args=("$@")
for ((i = 0; i < ${#args[@]}; i++)); do
  if [[ "${args[$i]}" == "--stack-name" ]]; then
    STACK_NAME="${args[$((i + 1))]:-}"
  fi
done

IN_SYNC_HASH="45713594b07f1be9746b306179a701fe9b9e3a95706820e2c55c7a554a59f5cb"
WRONG_HASH="0000000000000000000000000000000000000000000000000000000000000000"

case "$STACK_NAME" in
  dillinger-notdeployed)
    echo "An error occurred (ValidationError) when calling the DescribeStacks operation: Stack with id dillinger-notdeployed does not exist" >&2
    exit 254
    ;;
  dillinger-insync)
    cat <<JSON
{
  "Stacks": [
    {
      "StackName": "dillinger-insync",
      "StackStatus": "UPDATE_COMPLETE",
      "Tags": [
        {"Key": "DillingerConfigHash", "Value": "${IN_SYNC_HASH}"},
        {"Key": "Project", "Value": "dillinger-aws"},
        {"Key": "TenantId", "Value": "insync"}
      ],
      "Outputs": [
        {"OutputKey": "FunctionUrl", "OutputValue": "https://insync.lambda-url.us-east-1.on.aws/"}
      ]
    }
  ]
}
JSON
    ;;
  dillinger-drifted)
    cat <<JSON
{
  "Stacks": [
    {
      "StackName": "dillinger-drifted",
      "StackStatus": "UPDATE_COMPLETE",
      "Tags": [
        {"Key": "DillingerConfigHash", "Value": "${WRONG_HASH}"},
        {"Key": "Project", "Value": "dillinger-aws"},
        {"Key": "TenantId", "Value": "drifted"}
      ],
      "Outputs": [
        {"OutputKey": "FunctionUrl", "OutputValue": "https://drifted.lambda-url.us-east-1.on.aws/"}
      ]
    }
  ]
}
JSON
    ;;
  dillinger-failed)
    cat <<JSON
{
  "Stacks": [
    {
      "StackName": "dillinger-failed",
      "StackStatus": "UPDATE_ROLLBACK_FAILED",
      "Tags": [
        {"Key": "DillingerConfigHash", "Value": "irrelevant-because-status-is-failed"},
        {"Key": "Project", "Value": "dillinger-aws"},
        {"Key": "TenantId", "Value": "failed"}
      ],
      "Outputs": []
    }
  ]
}
JSON
    ;;
  *)
    echo "mock-aws-check-state.sh: no canned response for stack '${STACK_NAME}'" >&2
    exit 1
    ;;
esac
