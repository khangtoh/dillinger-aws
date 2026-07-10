#!/usr/bin/env bash
# Deploys (or updates) the shared single-entry gateway (CloudFront) stack
# defined in infra/gateway/template.yaml. Unlike provision-tenant.sh, this
# is deployed once per environment, independent of any per-tenant stack —
# see spec/10-gateway.md. Domain/certificate parameters are sourced from
# Module B's resolved desired state (infra/orchestrator/state/desired-state.json)
# rather than being passed on the command line, so this script and
# check-state.sh always agree on what "desired" means.
#
# Usage: infra/gateway/deploy-gateway.sh [aws-region]
#
# Requires: AWS CLI configured with credentials that have the
# least-privilege permissions described in spec/01-aws-account-onboarding.md,
# the AWS SAM CLI installed, and infra/orchestrator/state/desired-state.json
# to already exist (written by infra/orchestrator/resolve-model.sh).

set -euo pipefail

REGION="${1:-${AWS_DEFAULT_REGION:-us-east-1}}"
STACK_NAME="dillinger-gateway"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DESIRED_STATE_FILE="$REPO_ROOT/infra/orchestrator/state/desired-state.json"

if [[ ! -f "$DESIRED_STATE_FILE" ]]; then
  echo "desired-state.json not found at ${DESIRED_STATE_FILE} - run infra/orchestrator/resolve-model.sh first" >&2
  exit 1
fi

GATEWAY_DOMAIN=$(jq -r '.gateway.domain // ""' "$DESIRED_STATE_FILE")
ACM_CERTIFICATE_ARN=$(jq -r '.gateway.acmCertificateArn // ""' "$DESIRED_STATE_FILE")

# shellcheck source=../orchestrator/lib/config-hash.sh
source "$REPO_ROOT/infra/orchestrator/lib/config-hash.sh"
CONFIG_HASH=$(compute_config_hash "$REPO_ROOT/infra/gateway/template.yaml" "GatewayDomain=${GATEWAY_DOMAIN}" "AcmCertificateArn=${ACM_CERTIFICATE_ARN}")
TAGS=("DillingerConfigHash=${CONFIG_HASH}" "Project=dillinger-aws")

echo "==> Building ${STACK_NAME} (region: ${REGION})"
cd "$REPO_ROOT/infra/gateway"
sam build --template-file template.yaml

# Build --parameter-overrides incrementally: an empty domain/cert should be
# omitted entirely (letting the template's own Default: "" apply) rather
# than passed as an explicit empty string, since some SAM CLI versions
# treat "GatewayDomain=" differently from not passing GatewayDomain at all.
PARAMETER_OVERRIDES=()
if [[ -n "$GATEWAY_DOMAIN" ]]; then
  PARAMETER_OVERRIDES+=("GatewayDomain=${GATEWAY_DOMAIN}")
fi
if [[ -n "$ACM_CERTIFICATE_ARN" ]]; then
  PARAMETER_OVERRIDES+=("AcmCertificateArn=${ACM_CERTIFICATE_ARN}")
fi

echo "==> Deploying ${STACK_NAME}"
DEPLOY_ARGS=(
  --stack-name "$STACK_NAME"
  --region "$REGION"
  --capabilities CAPABILITY_IAM
  --tags "${TAGS[@]}"
  --no-confirm-changeset
  --no-fail-on-empty-changeset
)
if [[ "${#PARAMETER_OVERRIDES[@]}" -gt 0 ]]; then
  DEPLOY_ARGS+=(--parameter-overrides "${PARAMETER_OVERRIDES[@]}")
fi
sam deploy "${DEPLOY_ARGS[@]}"

DISTRIBUTION_DOMAIN_NAME=$(aws cloudformation describe-stacks \
  --region "$REGION" \
  --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='DistributionDomainName'].OutputValue" \
  --output text)

echo
echo "Gateway is live at: ${DISTRIBUTION_DOMAIN_NAME}"
