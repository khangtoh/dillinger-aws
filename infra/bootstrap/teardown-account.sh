#!/usr/bin/env bash
# Tears down everything this project deployed into one AWS account, in
# dependency order. The inverse of bootstrap-account.sh + the deploys.
#
# Prints a full inventory of what it found and asks for confirmation
# before deleting anything (pass --yes to skip the prompt, e.g. in a
# scripted migration).
#
# Usage:
#   infra/bootstrap/teardown-account.sh <region> [--profile <admin-profile>]
#       [--yes] [--keep-iam]
#
#   <region>     the tenant region used in this account
#   --profile    AWS CLI profile with admin access to the TARGET account
#   --yes        skip the confirmation prompt
#   --keep-iam   delete only deployed workloads (stacks, images, logs);
#                leave the IAM user/role/policy/OIDC provider in place
#                so the account can be redeployed later without
#                re-bootstrapping
#
# Deletion order (each step waits before the next):
#   1. every tenant stack (dillinger-*, except the SAM companion stack)
#   2. the gateway stack (dillinger-gateway, always us-east-1)
#   3. the SAM companion stack + its artifact bucket (versioned - must be
#      purged before CloudFormation can delete it) + SAM-managed ECR repos
#   4. leftover /aws/lambda/dillinger* log groups
#   5. IAM: CI role, deploy user (+ its access keys), the managed policy
#      (all versions), and the OIDC provider (only if no OTHER role in
#      the account still trusts it) - skipped entirely with --keep-iam

set -euo pipefail

POLICY_NAME="dillinger-deploy-policy"
USER_NAME="dillinger-aws-deploy"
ROLE_NAME="dillinger-ci-deploy"
OIDC_URL="token.actions.githubusercontent.com"
GATEWAY_STACK="dillinger-gateway"
GATEWAY_REGION="us-east-1" # fixed - see infra/gateway/README.md
COMPANION_STACK="aws-sam-cli-managed-default"

REGION="${1:?Usage: teardown-account.sh <region> [--profile <admin>] [--yes] [--keep-iam]}"
shift

ASSUME_YES=0
KEEP_IAM=0
AWSP=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --profile) AWSP=(--profile "$2"); shift 2 ;;
    --yes) ASSUME_YES=1; shift ;;
    --keep-iam) KEEP_IAM=1; shift ;;
    *) echo "teardown-account.sh: unknown argument: $1" >&2; exit 1 ;;
  esac
done

ACCOUNT="$(aws "${AWSP[@]+"${AWSP[@]}"}" sts get-caller-identity --query Account --output text)"
POLICY_ARN="arn:aws:iam::${ACCOUNT}:policy/${POLICY_NAME}"
OIDC_ARN="arn:aws:iam::${ACCOUNT}:oidc-provider/${OIDC_URL}"

# --- Build the inventory -----------------------------------------------------

echo "==> Inventorying account ${ACCOUNT} (tenant region: ${REGION})"

# Tenant stacks: everything named dillinger-* in the tenant region except
# the companion stack. list-stacks includes deleted stacks; filter those.
TENANT_STACKS="$(aws "${AWSP[@]+"${AWSP[@]}"}" cloudformation list-stacks \
  --region "$REGION" \
  --query "StackSummaries[?starts_with(StackName, 'dillinger-') && StackStatus != 'DELETE_COMPLETE'].StackName" \
  --output text | tr '\t' '\n' | sort -u | grep -v "^${COMPANION_STACK}$" || true)"

GATEWAY_EXISTS=0
if aws "${AWSP[@]+"${AWSP[@]}"}" cloudformation describe-stacks \
    --region "$GATEWAY_REGION" --stack-name "$GATEWAY_STACK" >/dev/null 2>&1; then
  GATEWAY_EXISTS=1
fi

COMPANION_EXISTS=0
if aws "${AWSP[@]+"${AWSP[@]}"}" cloudformation describe-stacks \
    --region "$REGION" --stack-name "$COMPANION_STACK" >/dev/null 2>&1; then
  COMPANION_EXISTS=1
fi

SAM_BUCKETS="$(aws "${AWSP[@]+"${AWSP[@]}"}" s3api list-buckets \
  --query "Buckets[?starts_with(Name, 'aws-sam-cli-managed-default-samclisourcebucket-')].Name" \
  --output text | tr '\t' '\n' | grep -v '^$' || true)"

ECR_REPOS="$(aws "${AWSP[@]+"${AWSP[@]}"}" ecr describe-repositories --region "$REGION" \
  --query "repositories[?starts_with(repositoryName, 'dillinger')].repositoryName" \
  --output text 2>/dev/null | tr '\t' '\n' | grep -v '^$' || true)"

LOG_GROUPS="$(aws "${AWSP[@]+"${AWSP[@]}"}" logs describe-log-groups --region "$REGION" \
  --log-group-name-prefix "/aws/lambda/dillinger" \
  --query 'logGroups[].logGroupName' --output text | tr '\t' '\n' | grep -v '^$' || true)"

IAM_ROLE_EXISTS=0
aws "${AWSP[@]+"${AWSP[@]}"}" iam get-role --role-name "$ROLE_NAME" >/dev/null 2>&1 && IAM_ROLE_EXISTS=1
IAM_USER_EXISTS=0
aws "${AWSP[@]+"${AWSP[@]}"}" iam get-user --user-name "$USER_NAME" >/dev/null 2>&1 && IAM_USER_EXISTS=1
IAM_POLICY_EXISTS=0
aws "${AWSP[@]+"${AWSP[@]}"}" iam get-policy --policy-arn "$POLICY_ARN" >/dev/null 2>&1 && IAM_POLICY_EXISTS=1

echo
echo "Will delete from account ${ACCOUNT}:"
echo "  Tenant stacks (${REGION}):    ${TENANT_STACKS:-none}"
echo "  Gateway stack (${GATEWAY_REGION}):  $([[ $GATEWAY_EXISTS -eq 1 ]] && echo "$GATEWAY_STACK" || echo none)"
echo "  SAM companion stack:          $([[ $COMPANION_EXISTS -eq 1 ]] && echo "$COMPANION_STACK" || echo none)"
echo "  SAM artifact buckets:         ${SAM_BUCKETS:-none}"
echo "  ECR repositories (${REGION}): ${ECR_REPOS:-none}"
echo "  Log groups (${REGION}):       ${LOG_GROUPS:-none}"
if [[ "$KEEP_IAM" -eq 1 ]]; then
  echo "  IAM entities:                 KEPT (--keep-iam)"
else
  echo "  IAM role:                     $([[ $IAM_ROLE_EXISTS -eq 1 ]] && echo "$ROLE_NAME" || echo none)"
  echo "  IAM user:                     $([[ $IAM_USER_EXISTS -eq 1 ]] && echo "$USER_NAME" || echo none)"
  echo "  IAM policy:                   $([[ $IAM_POLICY_EXISTS -eq 1 ]] && echo "$POLICY_NAME" || echo none)"
  echo "  OIDC provider:                ${OIDC_URL} (only if no other role trusts it)"
fi
echo

if [[ "$ASSUME_YES" -ne 1 ]]; then
  read -r -p "Type 'delete' to proceed: " CONFIRM
  if [[ "$CONFIRM" != "delete" ]]; then
    echo "Aborted - nothing was deleted."
    exit 0
  fi
fi

# --- 0. ECR repositories ------------------------------------------------------
# Force-deleted FIRST: SAM's per-tenant companion stacks own these repos,
# and CloudFormation cannot delete a stack whose ECR repo still contains
# images. Emptying/removing the repo up front lets the stack deletes
# below succeed cleanly.

for repo in $ECR_REPOS; do
  echo "==> Deleting ECR repository ${repo} (${REGION})"
  aws "${AWSP[@]+"${AWSP[@]}"}" ecr delete-repository --region "$REGION" \
    --repository-name "$repo" --force >/dev/null
done

# --- 1. Tenant stacks --------------------------------------------------------

for stack in $TENANT_STACKS; do
  echo "==> Deleting tenant stack ${stack} (${REGION})"
  aws "${AWSP[@]+"${AWSP[@]}"}" cloudformation delete-stack --region "$REGION" --stack-name "$stack"
  aws "${AWSP[@]+"${AWSP[@]}"}" cloudformation wait stack-delete-complete --region "$REGION" --stack-name "$stack"
done

# --- 2. Gateway stack --------------------------------------------------------

if [[ "$GATEWAY_EXISTS" -eq 1 ]]; then
  echo "==> Deleting gateway stack ${GATEWAY_STACK} (${GATEWAY_REGION})"
  aws "${AWSP[@]+"${AWSP[@]}"}" cloudformation delete-stack --region "$GATEWAY_REGION" --stack-name "$GATEWAY_STACK"
  aws "${AWSP[@]+"${AWSP[@]}"}" cloudformation wait stack-delete-complete --region "$GATEWAY_REGION" --stack-name "$GATEWAY_STACK"
fi

# --- 3. SAM companion stack, artifact bucket, ECR repos ----------------------

# The SAM bucket is versioned: every object version and delete marker has
# to go before CloudFormation can delete the bucket resource.
purge_bucket() {
  local bucket="$1"
  echo "==> Purging versioned bucket ${bucket}"
  while :; do
    local batch
    batch="$(aws "${AWSP[@]+"${AWSP[@]}"}" s3api list-object-versions --bucket "$bucket" \
      --max-items 500 --output json \
      --query '{Objects: [Versions[].{Key: Key, VersionId: VersionId}, DeleteMarkers[].{Key: Key, VersionId: VersionId}][] | [0:500], Quiet: `true`}')"
    if [[ "$(python3 -c "import json,sys; print(len(json.load(sys.stdin)['Objects'] or []))" <<<"$batch")" -eq 0 ]]; then
      break
    fi
    aws "${AWSP[@]+"${AWSP[@]}"}" s3api delete-objects --bucket "$bucket" --delete "$batch" >/dev/null
  done
}

for bucket in $SAM_BUCKETS; do
  purge_bucket "$bucket"
done

if [[ "$COMPANION_EXISTS" -eq 1 ]]; then
  echo "==> Deleting SAM companion stack ${COMPANION_STACK} (${REGION})"
  aws "${AWSP[@]+"${AWSP[@]}"}" cloudformation delete-stack --region "$REGION" --stack-name "$COMPANION_STACK"
  aws "${AWSP[@]+"${AWSP[@]}"}" cloudformation wait stack-delete-complete --region "$REGION" --stack-name "$COMPANION_STACK"
fi

# --- 4. Log groups -----------------------------------------------------------

for lg in $LOG_GROUPS; do
  echo "==> Deleting log group ${lg} (${REGION})"
  aws "${AWSP[@]+"${AWSP[@]}"}" logs delete-log-group --region "$REGION" --log-group-name "$lg"
done

# --- 5. IAM ------------------------------------------------------------------

if [[ "$KEEP_IAM" -eq 1 ]]; then
  echo "==> Keeping IAM entities (--keep-iam)"
else
  if [[ "$IAM_ROLE_EXISTS" -eq 1 ]]; then
    echo "==> Deleting IAM role ${ROLE_NAME}"
    aws "${AWSP[@]+"${AWSP[@]}"}" iam detach-role-policy --role-name "$ROLE_NAME" --policy-arn "$POLICY_ARN" 2>/dev/null || true
    aws "${AWSP[@]+"${AWSP[@]}"}" iam delete-role --role-name "$ROLE_NAME"
  fi

  if [[ "$IAM_USER_EXISTS" -eq 1 ]]; then
    echo "==> Deleting IAM user ${USER_NAME} (and its access keys)"
    for key in $(aws "${AWSP[@]+"${AWSP[@]}"}" iam list-access-keys --user-name "$USER_NAME" \
        --query 'AccessKeyMetadata[].AccessKeyId' --output text); do
      aws "${AWSP[@]+"${AWSP[@]}"}" iam delete-access-key --user-name "$USER_NAME" --access-key-id "$key"
    done
    aws "${AWSP[@]+"${AWSP[@]}"}" iam detach-user-policy --user-name "$USER_NAME" --policy-arn "$POLICY_ARN" 2>/dev/null || true
    aws "${AWSP[@]+"${AWSP[@]}"}" iam delete-user --user-name "$USER_NAME"
  fi

  if [[ "$IAM_POLICY_EXISTS" -eq 1 ]]; then
    echo "==> Deleting IAM policy ${POLICY_NAME} (all versions)"
    for v in $(aws "${AWSP[@]+"${AWSP[@]}"}" iam list-policy-versions --policy-arn "$POLICY_ARN" \
        --query 'Versions[?!IsDefaultVersion].VersionId' --output text); do
      aws "${AWSP[@]+"${AWSP[@]}"}" iam delete-policy-version --policy-arn "$POLICY_ARN" --version-id "$v"
    done
    aws "${AWSP[@]+"${AWSP[@]}"}" iam delete-policy --policy-arn "$POLICY_ARN"
  fi

  # Only remove the OIDC provider if no remaining role in the account
  # still trusts it - it may be shared with unrelated projects.
  if aws "${AWSP[@]+"${AWSP[@]}"}" iam list-open-id-connect-providers --output text | grep -q "$OIDC_ARN"; then
    TRUSTING_ROLES="$(aws "${AWSP[@]+"${AWSP[@]}"}" iam list-roles --output json \
      | python3 -c "
import json, sys
roles = json.load(sys.stdin)['Roles']
hits = [r['RoleName'] for r in roles
        if '$OIDC_URL' in json.dumps(r.get('AssumeRolePolicyDocument', {}))]
print('\n'.join(hits))
")"
    if [[ -n "$TRUSTING_ROLES" ]]; then
      echo "==> KEEPING OIDC provider ${OIDC_URL}: still trusted by other role(s): ${TRUSTING_ROLES}"
    else
      echo "==> Deleting OIDC provider ${OIDC_URL}"
      aws "${AWSP[@]+"${AWSP[@]}"}" iam delete-open-id-connect-provider --open-id-connect-provider-arn "$OIDC_ARN"
    fi
  fi
fi

echo
echo "Teardown of account ${ACCOUNT} complete."
echo "Reminder: local files still reference this account until you re-bootstrap:"
echo "  - infra/tenants.json (reset to {\"tenants\": []})"
echo "  - infra/orchestrator/state/*.json (delete; gitignored)"
echo "  - GitHub repo variables AWS_REGION / AWS_DEPLOY_ROLE_ARN"
echo "  - spec/.aws-context.md (gitignored)"
