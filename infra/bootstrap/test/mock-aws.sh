#!/usr/bin/env bash
# Mock `aws` CLI for bootstrap/teardown tests (same pattern as
# infra/orchestrator/test/mock-aws-*.sh): placed first on PATH as `aws`,
# switches on the subcommand, returns canned output shaped like the real
# CLI, and appends every invocation to $MOCK_CALL_LOG so tests can assert
# exactly which mutations happened and in what order.
#
# Behavior is driven by flag/content files in $MOCK_STATE_DIR:
#   account.txt              account id for sts get-caller-identity
#   policy_exists            iam get-policy succeeds
#   policy_doc.json          live default policy version document
#   policy_version_count     output for length(Versions) query
#   user_exists              iam get-user succeeds
#   user_policy_attached     list-attached-user-policies returns the arn
#   oidc_exists              provider arn appears in list output
#   role_exists              iam get-role succeeds
#   role_trust.json          live assume-role-policy document
#   role_policy_attached     list-attached-role-policies returns the arn
#   tenant_stacks.txt        newline list for cloudformation list-stacks
#   gateway_exists           describe-stacks dillinger-gateway succeeds
#   companion_exists         describe-stacks aws-sam-cli-managed-default succeeds
#   sam_buckets.txt          newline list for s3api list-buckets
#   ecr_repos.txt            newline list for ecr describe-repositories
#   log_groups.txt           newline list for logs describe-log-groups
#   bucket_has_versions      first list-object-versions returns one batch
#                            (cleared by the mock after delete-objects)
#   access_keys.txt          key ids for iam list-access-keys
#   trusting_roles.json      iam list-roles output

set -euo pipefail

echo "$*" >>"$MOCK_CALL_LOG"

STATE="$MOCK_STATE_DIR"
has() { [[ -e "$STATE/$1" ]]; }

args="$*"

case "$1 $2" in
  "sts get-caller-identity")
    cat "$STATE/account.txt"
    ;;

  "iam get-policy")
    has policy_exists || exit 255
    if [[ "$args" == *"DefaultVersionId"* ]]; then echo "v1"; fi
    ;;
  "iam get-policy-version")
    cat "$STATE/policy_doc.json"
    ;;
  "iam list-policy-versions")
    if [[ "$args" == *"length(Versions)"* ]]; then
      cat "$STATE/policy_version_count" 2>/dev/null || echo 1
    elif [[ "$args" == *"IsDefaultVersion"*"CreateDate"* ]]; then
      echo "v2" # oldest non-default
    else
      echo "v3" # non-default versions (teardown delete loop)
    fi
    ;;
  "iam create-policy-version")
    echo "v7"
    ;;
  "iam create-policy"|"iam delete-policy-version"|"iam delete-policy")
    ;;

  "iam get-user")
    has user_exists || exit 255
    ;;
  "iam create-user"|"iam attach-user-policy"|"iam detach-user-policy"|"iam delete-user")
    ;;
  "iam list-attached-user-policies")
    has user_policy_attached && cat "$STATE/policy_arn.txt" || echo ""
    ;;
  "iam create-access-key")
    echo '{"AccessKey": {"AccessKeyId": "AKIAMOCK", "SecretAccessKey": "mock-secret"}}'
    ;;
  "iam list-access-keys")
    cat "$STATE/access_keys.txt" 2>/dev/null || echo ""
    ;;
  "iam delete-access-key")
    ;;

  "iam list-open-id-connect-providers")
    has oidc_exists && cat "$STATE/oidc_arn.txt" || echo ""
    ;;
  "iam create-open-id-connect-provider"|"iam delete-open-id-connect-provider")
    ;;

  "iam get-role")
    has role_exists || exit 255
    if [[ "$args" == *"AssumeRolePolicyDocument"* ]]; then cat "$STATE/role_trust.json"; fi
    ;;
  "iam create-role"|"iam update-assume-role-policy"|"iam attach-role-policy"|"iam detach-role-policy"|"iam delete-role")
    ;;
  "iam list-attached-role-policies")
    has role_policy_attached && cat "$STATE/policy_arn.txt" || echo ""
    ;;
  "iam list-roles")
    cat "$STATE/trusting_roles.json" 2>/dev/null || echo '{"Roles": []}'
    ;;

  "cloudformation list-stacks")
    cat "$STATE/tenant_stacks.txt" 2>/dev/null | tr '\n' '\t' || echo ""
    ;;
  "cloudformation describe-stacks")
    if [[ "$args" == *"dillinger-gateway"* ]]; then
      has gateway_exists || exit 255
    elif [[ "$args" == *"aws-sam-cli-managed-default"* ]]; then
      has companion_exists || exit 255
    fi
    echo '{"Stacks": [{"StackStatus": "CREATE_COMPLETE"}]}'
    ;;
  "cloudformation delete-stack"|"cloudformation wait")
    ;;

  "s3api list-buckets")
    cat "$STATE/sam_buckets.txt" 2>/dev/null | tr '\n' '\t' || echo ""
    ;;
  "s3api list-object-versions")
    if has bucket_has_versions; then
      echo '{"Objects": [{"Key": "template.yaml", "VersionId": "v1"}], "Quiet": true}'
    else
      echo '{"Objects": [], "Quiet": true}'
    fi
    ;;
  "s3api delete-objects")
    rm -f "$STATE/bucket_has_versions"
    ;;

  "ecr describe-repositories")
    cat "$STATE/ecr_repos.txt" 2>/dev/null | tr '\n' '\t' || echo ""
    ;;
  "ecr delete-repository")
    ;;

  "logs describe-log-groups")
    cat "$STATE/log_groups.txt" 2>/dev/null | tr '\n' '\t' || echo ""
    ;;
  "logs delete-log-group")
    ;;

  *)
    echo "mock-aws.sh: unhandled command: $args" >&2
    exit 99
    ;;
esac
