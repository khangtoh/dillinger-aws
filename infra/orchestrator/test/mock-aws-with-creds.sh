#!/usr/bin/env bash
# Mock `aws` CLI simulating a caller WITH valid credentials, where every
# checked permission is allowed EXCEPT one deliberately denied action, so
# tests can assert the "missing permissions" path is detected correctly
# and not just the all-allowed path.
#
# Chosen denied action: iam:PassRole (returns "implicitDeny"). Picked
# because it's a commonly-forgotten grant in least-privilege IAM policies
# (needed so Lambda/CloudFormation can assume the execution role
# provision-tenant.sh creates) - a realistic failure mode to test against.
#
# Usage: symlink (or copy) this file to a directory named "aws" and put
# that directory first on PATH before running credential-guard.sh - see
# credential-guard.test.sh for how it's wired up.

set -euo pipefail

DENIED_ACTION="iam:PassRole"

case "${1:-} ${2:-}" in
  "sts get-caller-identity")
    cat <<'JSON'
{
  "UserId": "AIDAMOCKUSERID123EXAMPLE",
  "Account": "123456789012",
  "Arn": "arn:aws:iam::123456789012:user/dillinger-aws-deploy"
}
JSON
    exit 0
    ;;
  "iam simulate-principal-policy")
    # Parse the --action-names <a> <b> ... list (terminated by the next
    # --flag or end of args) out of the full argument list, since that's
    # all this mock needs to react to - the real CLI also takes
    # --policy-source-arn / --resource-arns / --output but this mock
    # returns the same shape regardless of resource, matching how
    # credential-guard.sh calls it (one resource ARN per call).
    actions=()
    collecting=0
    for arg in "$@"; do
      if [[ "$arg" == "--action-names" ]]; then
        collecting=1
        continue
      elif [[ "$arg" == --* ]]; then
        collecting=0
        continue
      fi
      if [[ "$collecting" == "1" ]]; then
        actions+=("$arg")
      fi
    done

    echo "{"
    echo '  "EvaluationResults": ['
    first=1
    for action in "${actions[@]}"; do
      decision="allowed"
      if [[ "$action" == "$DENIED_ACTION" ]]; then
        decision="implicitDeny"
      fi
      if [[ "$first" == "1" ]]; then
        first=0
      else
        echo ","
      fi
      printf '    {"EvalActionName": "%s", "EvalDecision": "%s"}' "$action" "$decision"
    done
    echo
    echo '  ]'
    echo "}"
    exit 0
    ;;
  "configure get")
    # Only reached if the test doesn't set AWS_REGION/AWS_DEFAULT_REGION.
    echo "us-east-1"
    exit 0
    ;;
  *)
    echo "mock-aws-with-creds.sh: unhandled command: $*" >&2
    exit 1
    ;;
esac
