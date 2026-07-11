#!/usr/bin/env bash
# Compares desired state (Module B's resolve-model.sh output) against
# actual AWS state (via the AWS CLI) and reports, per tenant plus the
# shared gateway, whether it's NOT_DEPLOYED, IN_SYNC, DRIFTED, or FAILED.
# Read-only: this script never deploys, updates, or deletes anything —
# deciding vs. acting are separate scripts (see
# spec/11-deployment-orchestrator/README.md).
#
# Usage: infra/orchestrator/check-state.sh
#
# Reads:
#   infra/orchestrator/state/credential-status.json (Module A output)
#   infra/orchestrator/state/desired-state.json      (Module B output)
# Writes:
#   infra/orchestrator/state/deployment-state.json
#
# Requires: AWS CLI configured with credentials that can call
# `cloudformation describe-stacks` (see credential-guard.sh), and `jq`.
#
# Exit codes: 0 = the check ran to completion (this includes normal
# results like "3 tenants not deployed yet" or "1 tenant drifted" - those
# are not script failures). Non-zero = the check couldn't run at all
# (missing/invalid credential-status.json or desired-state.json), or
# every single tenant check hit an unexpected AWS error.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
STATE_DIR="$REPO_ROOT/infra/orchestrator/state"
CREDENTIAL_STATUS_FILE="$STATE_DIR/credential-status.json"
DESIRED_STATE_FILE="$STATE_DIR/desired-state.json"
OUTPUT_FILE="$STATE_DIR/deployment-state.json"

# shellcheck source=lib/config-hash.sh
source "$REPO_ROOT/infra/orchestrator/lib/config-hash.sh"

# --- Step 1: credential guard (no AWS calls before this passes) -----------

if [[ ! -f "$CREDENTIAL_STATUS_FILE" ]]; then
  echo "check-state.sh: ${CREDENTIAL_STATUS_FILE} not found - run credential-guard.sh first" >&2
  exit 1
fi

CREDENTIALS_PRESENT="$(jq -r '.credentialsPresent' "$CREDENTIAL_STATUS_FILE")"
if [[ "$CREDENTIALS_PRESENT" != "true" ]]; then
  echo "check-state.sh: credentials not present - run credential-guard.sh first" >&2
  exit 1
fi

PERMISSIONS_OK="$(jq -r '.permissionsOk' "$CREDENTIAL_STATUS_FILE")"
if [[ "$PERMISSIONS_OK" == "false" ]]; then
  echo "check-state.sh: credentials present but missing required permissions, see ${CREDENTIAL_STATUS_FILE}" >&2
  exit 1
fi
# permissionsOk == null ("unknown") or true are both allowed to proceed.

# --- Step 2: desired state -------------------------------------------------

if [[ ! -f "$DESIRED_STATE_FILE" ]]; then
  echo "check-state.sh: ${DESIRED_STATE_FILE} not found - run resolve-model.sh first" >&2
  exit 1
fi

GATEWAY_ENABLED="$(jq -r '.gateway.enabled // false' "$DESIRED_STATE_FILE")"
GATEWAY_DOMAIN="$(jq -r '.gateway.domain // ""' "$DESIRED_STATE_FILE")"
GATEWAY_ACM_ARN="$(jq -r '.gateway.acmCertificateArn // ""' "$DESIRED_STATE_FILE")"

# --- Helpers ----------------------------------------------------------------

# Runs `aws cloudformation describe-stacks` for one stack without letting a
# failure trip `set -e` (a failed describe-stacks - e.g. "stack does not
# exist" - is an expected, handled outcome, not a script error). Stores the
# exit code in the global DESCRIBE_RC rather than `return`ing it, so the
# call site itself always succeeds under `set -e`.
run_describe_stacks() {
  local stack_name="$1" region="$2" out_file="$3" err_file="$4"
  set +e
  aws cloudformation describe-stacks --stack-name "$stack_name" --region "$region" --output json >"$out_file" 2>"$err_file"
  DESCRIBE_RC=$?
  set -e
}

# Classifies one describe-stacks result into NOT_DEPLOYED / IN_SYNC /
# DRIFTED / FAILED. Sets globals RESULT_STATUS, RESULT_URL ("null" or a
# string), RESULT_REASON ("null" or a string), RESULT_UNEXPECTED (1 if this
# was an AWS error other than "stack doesn't exist" or a FAILED/ROLLBACK
# stack status - used to decide the script's own exit code, separate from
# the JSON status, which is FAILED in both cases per the schema).
classify_stack() {
  local out_file="$1" err_file="$2" rc="$3" local_hash="$4" output_key="$5"
  RESULT_UNEXPECTED=0

  if [[ "$rc" -ne 0 ]]; then
    if grep -qi "does not exist" "$err_file"; then
      RESULT_STATUS="NOT_DEPLOYED"
      RESULT_URL="null"
      RESULT_REASON="null"
    else
      RESULT_STATUS="FAILED"
      RESULT_URL="null"
      RESULT_REASON="$(tr -s ' \t\n' ' ' <"$err_file" | sed -e 's/^ *//' -e 's/ *$//')"
      RESULT_UNEXPECTED=1
    fi
    return
  fi

  local stack_status
  stack_status="$(jq -r '.Stacks[0].StackStatus' "$out_file")"
  if [[ "$stack_status" == *FAILED* || "$stack_status" == *ROLLBACK* ]]; then
    RESULT_STATUS="FAILED"
    RESULT_URL="null"
    RESULT_REASON="$stack_status"
    return
  fi

  local tag_hash url_value
  tag_hash="$(jq -r '(.Stacks[0].Tags // []) | map(select(.Key == "DillingerConfigHash")) | (.[0].Value // "")' "$out_file")"
  url_value="$(jq -r --arg key "$output_key" '(.Stacks[0].Outputs // []) | map(select(.OutputKey == $key)) | (.[0].OutputValue // "null")' "$out_file")"
  RESULT_URL="$url_value"

  if [[ "$tag_hash" == "$local_hash" ]]; then
    RESULT_STATUS="IN_SYNC"
    RESULT_REASON="null"
  else
    local local_short tag_short
    local_short="${local_hash:0:8}"
    if [[ -z "$tag_hash" ]]; then
      tag_short="none"
    else
      tag_short="${tag_hash:0:8}"
    fi
    RESULT_STATUS="DRIFTED"
    RESULT_REASON="stack DillingerConfigHash tag (${tag_short}) does not match current local template hash (${local_short})"
  fi
}

# --- Step 3: per-tenant check ------------------------------------------------

TENANT_RESULTS=()
TENANT_COUNT=0
UNEXPECTED_ERROR_COUNT=0
SUMMARY_LINES=()

while IFS=$'\t' read -r TENANT_ID TENANT_REGION; do
  [[ -z "$TENANT_ID" ]] && continue
  TENANT_COUNT=$((TENANT_COUNT + 1))

  STACK_NAME="dillinger-${TENANT_ID}"
  OUT_FILE="$(mktemp)"
  ERR_FILE="$(mktemp)"
  run_describe_stacks "$STACK_NAME" "$TENANT_REGION" "$OUT_FILE" "$ERR_FILE"

  LOCAL_HASH="$(compute_config_hash "$REPO_ROOT/infra/template.yaml" "TenantId=${TENANT_ID}")"
  classify_stack "$OUT_FILE" "$ERR_FILE" "$DESCRIBE_RC" "$LOCAL_HASH" "FunctionUrl"
  rm -f "$OUT_FILE" "$ERR_FILE"

  if [[ "$RESULT_UNEXPECTED" -eq 1 ]]; then
    UNEXPECTED_ERROR_COUNT=$((UNEXPECTED_ERROR_COUNT + 1))
  fi

  RESULT="$(jq -n \
    --arg id "$TENANT_ID" \
    --arg region "$TENANT_REGION" \
    --arg status "$RESULT_STATUS" \
    --arg url "$RESULT_URL" \
    --arg reason "$RESULT_REASON" \
    '{tenantId: $id, region: $region, status: $status,
      functionUrl: (if $url == "null" then null else $url end),
      reason: (if $reason == "null" then null else $reason end)}')"
  TENANT_RESULTS+=("$RESULT")

  case "$RESULT_STATUS" in
    DRIFTED) SUMMARY_LINES+=("${TENANT_ID}: ${RESULT_STATUS} (config hash mismatch)") ;;
    FAILED) SUMMARY_LINES+=("${TENANT_ID}: ${RESULT_STATUS} (see deployment-state.json for detail)") ;;
    *) SUMMARY_LINES+=("${TENANT_ID}: ${RESULT_STATUS}") ;;
  esac
done < <(jq -r '.tenants[] | [.tenantId, .region] | @tsv' "$DESIRED_STATE_FILE")

TENANTS_JSON="[]"
if [[ ${#TENANT_RESULTS[@]} -gt 0 ]]; then
  TENANTS_JSON="$(printf '%s\n' "${TENANT_RESULTS[@]}" | jq -s '.')"
fi

# --- Step 4: gateway check (only if desired-state.json enables it) --------

GATEWAY_JSON=""
if [[ "$GATEWAY_ENABLED" == "true" ]]; then
  # Gateway stack is always in us-east-1 (CloudFront/ACM requirement,
  # same constant as sync.sh) - NOT the credential/tenant region, which
  # is where this originally looked and why a live gateway showed as
  # NOT_DEPLOYED.
  GW_REGION="us-east-1"
  OUT_FILE="$(mktemp)"
  ERR_FILE="$(mktemp)"
  run_describe_stacks "dillinger-gateway" "$GW_REGION" "$OUT_FILE" "$ERR_FILE"

  GATEWAY_HASH="$(compute_config_hash "$REPO_ROOT/infra/gateway/template.yaml" "GatewayDomain=${GATEWAY_DOMAIN}" "AcmCertificateArn=${GATEWAY_ACM_ARN}")"
  classify_stack "$OUT_FILE" "$ERR_FILE" "$DESCRIBE_RC" "$GATEWAY_HASH" "DistributionDomainName"
  rm -f "$OUT_FILE" "$ERR_FILE"

  GATEWAY_JSON="$(jq -n \
    --arg status "$RESULT_STATUS" \
    --arg url "$RESULT_URL" \
    --arg reason "$RESULT_REASON" \
    '{status: $status,
      distributionDomainName: (if $url == "null" then null else $url end),
      reason: (if $reason == "null" then null else $reason end)}')"

  case "$RESULT_STATUS" in
    DRIFTED) SUMMARY_LINES+=("gateway: ${RESULT_STATUS} (config hash mismatch)") ;;
    FAILED) SUMMARY_LINES+=("gateway: ${RESULT_STATUS} (see deployment-state.json for detail)") ;;
    *) SUMMARY_LINES+=("gateway: ${RESULT_STATUS}") ;;
  esac
fi

# --- Step 5: write output ---------------------------------------------------

TIMESTAMP="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

if [[ -n "$GATEWAY_JSON" ]]; then
  FINAL_JSON="$(jq -n --arg ts "$TIMESTAMP" --argjson tenants "$TENANTS_JSON" --argjson gateway "$GATEWAY_JSON" \
    '{timestamp: $ts, tenants: $tenants, gateway: $gateway}')"
else
  FINAL_JSON="$(jq -n --arg ts "$TIMESTAMP" --argjson tenants "$TENANTS_JSON" \
    '{timestamp: $ts, tenants: $tenants}')"
fi

mkdir -p "$STATE_DIR"
printf '%s\n' "$FINAL_JSON" | jq '.' >"$OUTPUT_FILE"

printf '%s\n' "${SUMMARY_LINES[@]}"

# --- Step 6: exit code -------------------------------------------------------

if [[ "$TENANT_COUNT" -gt 0 && "$UNEXPECTED_ERROR_COUNT" -eq "$TENANT_COUNT" ]]; then
  echo "check-state.sh: every tenant check hit an unexpected AWS error; see ${OUTPUT_FILE}" >&2
  exit 1
fi

exit 0
