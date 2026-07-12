#!/usr/bin/env bash
# Stands up (or drift-syncs) everything one AWS account needs before this
# project can deploy into it: the least-privilege managed policy, the
# GitHub OIDC provider and CI deploy role. A legacy IAM deploy user is
# created only when --create-access-key is explicitly requested.
# The committed templates in this directory are the source of truth -
# spec/01-aws-account-onboarding.md records how their content was derived
# (six AccessDenied-driven refinements against real deploys).
#
# Idempotent: safe to re-run. Existing entities are left alone; documents
# (policy content, role trust policy) are compared against the rendered
# templates and updated only when they differ.
#
# Usage:
#   infra/bootstrap/bootstrap-account.sh <region> [--profile <admin-profile>]
#       [--repo <owner/name>] [--create-access-key <credentials-profile>]
#
#   <region>              tenant deploy region for the new account
#                         (the gateway is always us-east-1, independent
#                         of this - see infra/gateway/README.md)
#   --profile             AWS CLI profile with admin/root access to the
#                         TARGET account (e.g. one created by
#                         `aws login --profile <name>`). Bootstrap is the
#                         only thing that should ever use it.
#   --repo                GitHub repo the CI role trusts
#                         (default: khangtoh/dillinger-aws)
#   --create-access-key   legacy escape hatch for environments that cannot
#                         use federation: create a deploy user and write its
#                         key to a required, non-default named profile.
#                         Refuses to overwrite an existing profile. The
#                         secret is never printed. Prefer GitHub OIDC for CI
#                         and IAM Identity Center for human access.
#
# After a successful run it prints the exact follow-up commands (gh
# variable set, credential-guard verification). See README.md here for
# the full account-switch runbook.

set -euo pipefail

BOOTSTRAP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

POLICY_NAME="dillinger-deploy-policy"
USER_NAME="dillinger-aws-deploy"
ROLE_NAME="dillinger-ci-deploy"
OIDC_URL="token.actions.githubusercontent.com"
# AWS ignores the thumbprint for GitHub's CA since 2023 but the API still
# requires one at provider-creation time.
OIDC_THUMBPRINT="6938fd4d98bab03faadb97b34396831e3780aea1"

REGION="${1:?Usage: bootstrap-account.sh <region> [--profile <admin>] [--repo <owner/name>] [--create-access-key <profile>]}"
shift

REPO="khangtoh/dillinger-aws"
CREATE_KEY=0
KEY_PROFILE=""
AWSP=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --profile) AWSP=(--profile "$2"); shift 2 ;;
    --repo) REPO="$2"; shift 2 ;;
    --create-access-key)
      CREATE_KEY=1
      if [[ $# -lt 2 || "$2" == --* ]]; then
        echo "bootstrap-account.sh: --create-access-key requires a non-default profile name" >&2
        exit 1
      fi
      KEY_PROFILE="$2"
      if [[ "$KEY_PROFILE" == "default" ]]; then
        echo "bootstrap-account.sh: refusing to store a long-lived key in the default profile" >&2
        exit 1
      fi
      shift 2 ;;
    *) echo "bootstrap-account.sh: unknown argument: $1" >&2; exit 1 ;;
  esac
done

CHANGES=0

# --- Identity / render ------------------------------------------------------

ACCOUNT="$(aws "${AWSP[@]+"${AWSP[@]}"}" sts get-caller-identity --query Account --output text)"
echo "==> Bootstrapping account ${ACCOUNT} (tenant region: ${REGION}, repo: ${REPO})"

RENDERED_POLICY="$(mktemp)"
RENDERED_TRUST="$(mktemp)"
trap 'rm -f "$RENDERED_POLICY" "$RENDERED_TRUST"' EXIT
sed "s/__ACCOUNT__/${ACCOUNT}/g; s/__REGION__/${REGION}/g" \
  "$BOOTSTRAP_DIR/deploy-policy.template.json" >"$RENDERED_POLICY"
sed "s/__ACCOUNT__/${ACCOUNT}/g; s#__REPO__#${REPO}#g" \
  "$BOOTSTRAP_DIR/ci-trust-policy.template.json" >"$RENDERED_TRUST"

POLICY_ARN="arn:aws:iam::${ACCOUNT}:policy/${POLICY_NAME}"

# Compares two JSON documents structurally (key order / whitespace
# insensitive). Args: <file-a> <file-b>. Exit 0 = identical.
json_equal() {
  python3 - "$1" "$2" <<'PYEOF'
import json, sys
a = json.load(open(sys.argv[1]))
b = json.load(open(sys.argv[2]))
sys.exit(0 if a == b else 1)
PYEOF
}

# --- Managed policy ---------------------------------------------------------

if aws "${AWSP[@]+"${AWSP[@]}"}" iam get-policy --policy-arn "$POLICY_ARN" >/dev/null 2>&1; then
  DEFAULT_VERSION="$(aws "${AWSP[@]+"${AWSP[@]}"}" iam get-policy \
    --policy-arn "$POLICY_ARN" --query Policy.DefaultVersionId --output text)"
  LIVE_POLICY="$(mktemp)"
  aws "${AWSP[@]+"${AWSP[@]}"}" iam get-policy-version \
    --policy-arn "$POLICY_ARN" --version-id "$DEFAULT_VERSION" \
    --query PolicyVersion.Document --output json >"$LIVE_POLICY"
  if json_equal "$LIVE_POLICY" "$RENDERED_POLICY"; then
    echo "    policy ${POLICY_NAME}: up to date (${DEFAULT_VERSION})"
  else
    # IAM caps a managed policy at 5 versions - prune the oldest
    # non-default one if we're at the cap before publishing.
    VERSION_COUNT="$(aws "${AWSP[@]+"${AWSP[@]}"}" iam list-policy-versions \
      --policy-arn "$POLICY_ARN" --query 'length(Versions)' --output text)"
    if [[ "$VERSION_COUNT" -ge 5 ]]; then
      OLDEST_NON_DEFAULT="$(aws "${AWSP[@]+"${AWSP[@]}"}" iam list-policy-versions \
        --policy-arn "$POLICY_ARN" \
        --query 'sort_by(Versions[?!IsDefaultVersion], &CreateDate)[0].VersionId' \
        --output text)"
      aws "${AWSP[@]+"${AWSP[@]}"}" iam delete-policy-version \
        --policy-arn "$POLICY_ARN" --version-id "$OLDEST_NON_DEFAULT"
      echo "    policy ${POLICY_NAME}: pruned ${OLDEST_NON_DEFAULT} (5-version cap)"
    fi
    NEW_VERSION="$(aws "${AWSP[@]+"${AWSP[@]}"}" iam create-policy-version \
      --policy-arn "$POLICY_ARN" --policy-document "file://${RENDERED_POLICY}" \
      --set-as-default --query PolicyVersion.VersionId --output text)"
    echo "    policy ${POLICY_NAME}: DRIFT detected - published ${NEW_VERSION} from template"
    CHANGES=1
  fi
  rm -f "$LIVE_POLICY"
else
  aws "${AWSP[@]+"${AWSP[@]}"}" iam create-policy \
    --policy-name "$POLICY_NAME" \
    --policy-document "file://${RENDERED_POLICY}" \
    --description "Least-privilege deploy policy for dillinger-aws (source: infra/bootstrap/deploy-policy.template.json)" \
    >/dev/null
  echo "    policy ${POLICY_NAME}: created"
  CHANGES=1
fi

# --- Legacy deploy user ------------------------------------------------------

if [[ "$CREATE_KEY" -eq 1 ]]; then
  echo "    WARNING: creating a long-lived IAM user key; temporary credentials are preferred" >&2
  if aws "${AWSP[@]+"${AWSP[@]}"}" iam get-user --user-name "$USER_NAME" >/dev/null 2>&1; then
    echo "    user ${USER_NAME}: exists"
  else
    aws "${AWSP[@]+"${AWSP[@]}"}" iam create-user --user-name "$USER_NAME" \
      --tags Key=Project,Value=dillinger-aws >/dev/null
    echo "    user ${USER_NAME}: created"
    CHANGES=1
  fi

  if aws "${AWSP[@]+"${AWSP[@]}"}" iam list-attached-user-policies --user-name "$USER_NAME" \
      --query 'AttachedPolicies[].PolicyArn' --output text | grep -q "$POLICY_ARN"; then
    echo "    user ${USER_NAME}: policy already attached"
  else
    aws "${AWSP[@]+"${AWSP[@]}"}" iam attach-user-policy \
      --user-name "$USER_NAME" --policy-arn "$POLICY_ARN"
    echo "    user ${USER_NAME}: policy attached"
    CHANGES=1
  fi

  if [[ -f "$HOME/.aws/credentials" ]] && grep -q "^\[${KEY_PROFILE}\]" "$HOME/.aws/credentials"; then
    echo "    access key: profile '${KEY_PROFILE}' already exists in ~/.aws/credentials - refusing to overwrite (remove it first or pass a different profile name)" >&2
    exit 1
  fi
  KEY_JSON="$(aws "${AWSP[@]+"${AWSP[@]}"}" iam create-access-key --user-name "$USER_NAME" --output json)"
  mkdir -p "$HOME/.aws"
  umask 077
  {
    echo "[${KEY_PROFILE}]"
    echo "aws_access_key_id = $(python3 -c "import json,sys; print(json.load(sys.stdin)['AccessKey']['AccessKeyId'])" <<<"$KEY_JSON")"
    echo "aws_secret_access_key = $(python3 -c "import json,sys; print(json.load(sys.stdin)['AccessKey']['SecretAccessKey'])" <<<"$KEY_JSON")"
  } >>"$HOME/.aws/credentials"
  unset KEY_JSON
  echo "    access key: created and written to ~/.aws/credentials [${KEY_PROFILE}] (secret not displayed)"
  CHANGES=1
fi

# --- GitHub OIDC provider ----------------------------------------------------

OIDC_ARN="arn:aws:iam::${ACCOUNT}:oidc-provider/${OIDC_URL}"
if aws "${AWSP[@]+"${AWSP[@]}"}" iam list-open-id-connect-providers --output text | grep -q "$OIDC_ARN"; then
  echo "    OIDC provider ${OIDC_URL}: exists"
else
  aws "${AWSP[@]+"${AWSP[@]}"}" iam create-open-id-connect-provider \
    --url "https://${OIDC_URL}" \
    --client-id-list sts.amazonaws.com \
    --thumbprint-list "$OIDC_THUMBPRINT" >/dev/null
  echo "    OIDC provider ${OIDC_URL}: created"
  CHANGES=1
fi

# --- CI role -----------------------------------------------------------------

if aws "${AWSP[@]+"${AWSP[@]}"}" iam get-role --role-name "$ROLE_NAME" >/dev/null 2>&1; then
  LIVE_TRUST="$(mktemp)"
  aws "${AWSP[@]+"${AWSP[@]}"}" iam get-role --role-name "$ROLE_NAME" \
    --query Role.AssumeRolePolicyDocument --output json >"$LIVE_TRUST"
  if json_equal "$LIVE_TRUST" "$RENDERED_TRUST"; then
    echo "    role ${ROLE_NAME}: trust policy up to date"
  else
    aws "${AWSP[@]+"${AWSP[@]}"}" iam update-assume-role-policy \
      --role-name "$ROLE_NAME" --policy-document "file://${RENDERED_TRUST}"
    echo "    role ${ROLE_NAME}: trust policy DRIFT detected - updated from template"
    CHANGES=1
  fi
  rm -f "$LIVE_TRUST"
else
  aws "${AWSP[@]+"${AWSP[@]}"}" iam create-role \
    --role-name "$ROLE_NAME" \
    --assume-role-policy-document "file://${RENDERED_TRUST}" \
    --description "GitHub Actions OIDC deploy role for ${REPO} (source: infra/bootstrap/ci-trust-policy.template.json)" \
    --tags Key=Project,Value=dillinger-aws >/dev/null
  echo "    role ${ROLE_NAME}: created"
  CHANGES=1
fi

if aws "${AWSP[@]+"${AWSP[@]}"}" iam list-attached-role-policies --role-name "$ROLE_NAME" \
    --query 'AttachedPolicies[].PolicyArn' --output text | grep -q "$POLICY_ARN"; then
  echo "    role ${ROLE_NAME}: policy already attached"
else
  aws "${AWSP[@]+"${AWSP[@]}"}" iam attach-role-policy \
    --role-name "$ROLE_NAME" --policy-arn "$POLICY_ARN"
  echo "    role ${ROLE_NAME}: policy attached"
  CHANGES=1
fi

# --- Summary -----------------------------------------------------------------

echo
if [[ "$CHANGES" -eq 0 ]]; then
  echo "Account ${ACCOUNT} is fully bootstrapped - nothing to do."
else
  echo "Account ${ACCOUNT} bootstrapped."
fi
echo
echo "Next steps (see infra/bootstrap/README.md for the full runbook):"
echo "  gh variable set AWS_REGION --body \"${REGION}\""
echo "  gh variable set AWS_DEPLOY_ROLE_ARN --body \"arn:aws:iam::${ACCOUNT}:role/${ROLE_NAME}\""
if [[ "$CREATE_KEY" -eq 1 ]]; then
  echo "  AWS_PROFILE=${KEY_PROFILE} infra/orchestrator/credential-guard.sh"
else
  echo "  gh workflow run deploy-lambda.yml   # verify OIDC deployment"
fi
