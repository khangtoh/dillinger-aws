#!/usr/bin/env bash
# Resolves "what SHOULD be deployed" by reading and validating the two
# small human-edited desired-state config files (deployment-model.json,
# desired-tenants.json) and normalizing them into one descriptor for
# downstream orchestrator stages (check-state.sh, sync.sh).
#
# Pure local-file logic - no AWS calls, no dependency on
# credential-guard.sh's output. Safe to run before AWS credentials exist.
#
# Usage: infra/orchestrator/resolve-model.sh
#
# Reads:  infra/deployment-model.json, infra/desired-tenants.json
#         (created with defaults if either is missing, matching the
#         committed contract in spec/11-deployment-orchestrator/README.md)
# Writes: infra/orchestrator/state/desired-state.json
#
# Env var overrides (used by resolve-model.test.sh to point at scratch
# fixtures instead of the real committed files - never set these for a
# normal run):
#   DEPLOYMENT_MODEL_FILE   default: <repo>/infra/deployment-model.json
#   DESIRED_TENANTS_FILE    default: <repo>/infra/desired-tenants.json
#   DESIRED_STATE_FILE      default: <repo>/infra/orchestrator/state/desired-state.json
#
# Exit codes: 0 = valid config, desired-state.json written (this includes
# the legitimately-empty-tenants case - that is not an error). Non-zero =
# a validation failure; see stderr for the specific, actionable reason.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

DEPLOYMENT_MODEL_FILE="${DEPLOYMENT_MODEL_FILE:-$REPO_ROOT/infra/deployment-model.json}"
DESIRED_TENANTS_FILE="${DESIRED_TENANTS_FILE:-$REPO_ROOT/infra/desired-tenants.json}"
DESIRED_STATE_FILE="${DESIRED_STATE_FILE:-$REPO_ROOT/infra/orchestrator/state/desired-state.json}"

if ! command -v jq >/dev/null 2>&1; then
  echo "resolve-model.sh: this script requires jq to be installed" >&2
  exit 1
fi

# --- Defensive fallback creation ----------------------------------------
# Both files should already exist, committed (see README's "Shared JSON
# contracts"). Still create them on a fresh checkout / scratch dir so this
# script never crashes for a merely-missing file.
if [[ ! -f "$DEPLOYMENT_MODEL_FILE" ]]; then
  echo "==> ${DEPLOYMENT_MODEL_FILE} not found; creating default"
  mkdir -p "$(dirname "$DEPLOYMENT_MODEL_FILE")"
  cat > "$DEPLOYMENT_MODEL_FILE" <<'EOF'
{
  "model": "isolated-single-tenant-per-instance",
  "gateway": { "enabled": true, "domain": "", "acmCertificateArn": "" }
}
EOF
fi

if [[ ! -f "$DESIRED_TENANTS_FILE" ]]; then
  echo "==> ${DESIRED_TENANTS_FILE} not found; creating default (empty tenants)"
  mkdir -p "$(dirname "$DESIRED_TENANTS_FILE")"
  cat > "$DESIRED_TENANTS_FILE" <<'EOF'
{
  "tenants": []
}
EOF
fi

# --- Parse ----------------------------------------------------------------
if ! jq empty "$DEPLOYMENT_MODEL_FILE" >/dev/null 2>&1; then
  echo "resolve-model.sh: ${DEPLOYMENT_MODEL_FILE} is not valid JSON" >&2
  exit 1
fi

if ! jq empty "$DESIRED_TENANTS_FILE" >/dev/null 2>&1; then
  echo "resolve-model.sh: ${DESIRED_TENANTS_FILE} is not valid JSON" >&2
  exit 1
fi

# --- Validate deployment-model.json ---------------------------------------
MODEL="$(jq -r '.model // empty' "$DEPLOYMENT_MODEL_FILE")"
if [[ "$MODEL" != "isolated-single-tenant-per-instance" ]]; then
  echo "resolve-model.sh: unrecognized deployment model '${MODEL}' in ${DEPLOYMENT_MODEL_FILE} (only 'isolated-single-tenant-per-instance' is supported)" >&2
  exit 1
fi

if ! jq -e '(.gateway.enabled | type) == "boolean"' "$DEPLOYMENT_MODEL_FILE" >/dev/null 2>&1; then
  echo "resolve-model.sh: ${DEPLOYMENT_MODEL_FILE} field 'gateway.enabled' must be a boolean" >&2
  exit 1
fi

if ! jq -e '(.gateway.domain | type) == "string"' "$DEPLOYMENT_MODEL_FILE" >/dev/null 2>&1; then
  echo "resolve-model.sh: ${DEPLOYMENT_MODEL_FILE} field 'gateway.domain' must be a string" >&2
  exit 1
fi

if ! jq -e '(.gateway.acmCertificateArn | type) == "string"' "$DEPLOYMENT_MODEL_FILE" >/dev/null 2>&1; then
  echo "resolve-model.sh: ${DEPLOYMENT_MODEL_FILE} field 'gateway.acmCertificateArn' must be a string" >&2
  exit 1
fi

# --- Validate desired-tenants.json ----------------------------------------
if ! jq -e '(.tenants | type) == "array"' "$DESIRED_TENANTS_FILE" >/dev/null 2>&1; then
  echo "resolve-model.sh: ${DESIRED_TENANTS_FILE} field 'tenants' must be an array" >&2
  exit 1
fi

TENANT_COUNT="$(jq '.tenants | length' "$DESIRED_TENANTS_FILE")"

declare -A SEEN_TENANT_IDS=()
for ((i = 0; i < TENANT_COUNT; i++)); do
  TENANT_ID_TYPE="$(jq -r ".tenants[$i].tenantId | type" "$DESIRED_TENANTS_FILE")"
  TENANT_ID="$(jq -r ".tenants[$i].tenantId // empty" "$DESIRED_TENANTS_FILE")"

  if [[ "$TENANT_ID_TYPE" != "string" ]] || [[ -z "$TENANT_ID" ]] || ! [[ "$TENANT_ID" =~ ^[a-z0-9-]+$ ]]; then
    echo "resolve-model.sh: ${DESIRED_TENANTS_FILE} tenants[$i].tenantId '${TENANT_ID}' must be a string matching ^[a-z0-9-]+\$" >&2
    exit 1
  fi

  if [[ -n "${SEEN_TENANT_IDS[$TENANT_ID]:-}" ]]; then
    echo "resolve-model.sh: duplicate tenantId '${TENANT_ID}' in ${DESIRED_TENANTS_FILE}" >&2
    exit 1
  fi
  SEEN_TENANT_IDS[$TENANT_ID]=1

  REGION_TYPE="$(jq -r ".tenants[$i].region | type" "$DESIRED_TENANTS_FILE")"
  REGION="$(jq -r ".tenants[$i].region // empty" "$DESIRED_TENANTS_FILE")"

  if [[ "$REGION_TYPE" != "string" ]] || [[ -z "$REGION" ]]; then
    echo "resolve-model.sh: ${DESIRED_TENANTS_FILE} tenants[$i].region must be a non-empty string (tenantId: ${TENANT_ID})" >&2
    exit 1
  fi
done

# --- Write desired-state.json ----------------------------------------------
mkdir -p "$(dirname "$DESIRED_STATE_FILE")"

jq -n \
  --slurpfile deploymentModel "$DEPLOYMENT_MODEL_FILE" \
  --slurpfile desiredTenants "$DESIRED_TENANTS_FILE" \
  '{
    model: $deploymentModel[0].model,
    gateway: $deploymentModel[0].gateway,
    tenants: $desiredTenants[0].tenants
  }' > "$DESIRED_STATE_FILE"

GATEWAY_ENABLED="$(jq -r '.gateway.enabled' "$DEPLOYMENT_MODEL_FILE")"
GATEWAY_LABEL="disabled"
if [[ "$GATEWAY_ENABLED" == "true" ]]; then
  GATEWAY_LABEL="enabled"
fi

echo "Desired state: ${MODEL} model, gateway ${GATEWAY_LABEL}, ${TENANT_COUNT} tenant(s) configured"
