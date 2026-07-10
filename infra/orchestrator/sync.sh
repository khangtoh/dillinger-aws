#!/usr/bin/env bash
# Module D of the Phase 11 deployment orchestrator ("sync"). Reads Module
# C's deployment-state.json (state/deployment-state.json) and makes actual
# AWS state match it: deploys/redeploys every NOT_DEPLOYED or DRIFTED
# tenant (via infra/provision-tenant.sh) and the gateway (via
# infra/gateway/deploy-gateway.sh) if it needs it, skips anything already
# IN_SYNC, and never auto-retries anything FAILED (that needs a human).
#
# This module decides nothing about *whether* to deploy - that already
# happened in check-state.sh. It only executes.
#
# Usage: infra/orchestrator/sync.sh
#
# Reads:
#   infra/orchestrator/state/credential-status.json  (Module A output)
#   infra/orchestrator/state/deployment-state.json    (Module C output)
# Calls:
#   provision-tenant.sh <tenant-id> <region>       (normally infra/provision-tenant.sh)
#   deploy-gateway.sh <region>                     (normally infra/gateway/deploy-gateway.sh)
#   verify-tenant.sh <tenant-id> <function-url>    (normally infra/orchestrator/verify-tenant.sh)
#
# The three scripts above are invoked by bare name, resolved via $PATH,
# with their real locations appended to $PATH as a fallback (not
# prepended) - this is deliberate, so tests can put stub replacements
# earlier in $PATH and have them take priority without editing this
# script or the real scripts. See infra/orchestrator/test/sync.test.sh.
#
# After a tenant deploy succeeds, this script also verifies it: reads the
# tenant's Function URL back from infra/tenants.json (which
# provision-tenant.sh just updated) and runs verify-tenant.sh against it -
# closing the gap between "the deploy command exited 0" (CloudFormation
# says the stack is complete) and "the tenant is actually serving
# traffic" (a crash loop or missing env var can complete a stack and
# still leave the app broken). A verification failure is reported as
# "deployed, verification failed" in the summary and counts toward a
# non-zero exit, same as a deploy failure - but does NOT mark the tenant
# FAILED for future runs the way a CloudFormation failure does, since a
# plain re-sync might fix a transient issue (e.g. cold start timing).
#
# Exit codes: 0 only if every attempted deploy succeeded and verified, and
# no tenant/gateway was skipped due to a pre-existing FAILED status.
# Non-zero if any deploy attempt failed, any deployed tenant failed
# verification, any FAILED entry was skipped, or credentials aren't
# healthy (nothing is attempted in that case).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
STATE_DIR="$REPO_ROOT/infra/orchestrator/state"
CREDENTIAL_STATUS_FILE="$STATE_DIR/credential-status.json"
DEPLOYMENT_STATE_FILE="$STATE_DIR/deployment-state.json"
# Overridable for tests only (sync.test.sh points this at a scratch
# fixture so tests never read/write the real committed tenants.json) -
# never set this for a normal run.
TENANTS_FILE="${TENANTS_FILE:-$REPO_ROOT/infra/tenants.json}"

# Fallback PATH entries for the real scripts - appended (not prepended) so
# a test-provided stub directory earlier in $PATH always wins.
export PATH="$PATH:$REPO_ROOT/infra:$REPO_ROOT/infra/gateway:$REPO_ROOT/infra/orchestrator"

# --- 1. Defense-in-depth credential check -----------------------------
# Module C already gated on this, but this script performs real side
# effects, so it re-checks rather than trusting a possibly-stale caller.

if [[ ! -f "$CREDENTIAL_STATUS_FILE" ]]; then
  echo "sync.sh: credential-status.json not found at ${CREDENTIAL_STATUS_FILE} - refusing to proceed" >&2
  exit 1
fi

CREDENTIALS_PRESENT=$(jq -r '.credentialsPresent' "$CREDENTIAL_STATUS_FILE")
PERMISSIONS_OK=$(jq -r '.permissionsOk' "$CREDENTIAL_STATUS_FILE")

if [[ "$CREDENTIALS_PRESENT" != "true" || "$PERMISSIONS_OK" != "true" ]]; then
  echo "sync.sh: credentials are not healthy (credentialsPresent=${CREDENTIALS_PRESENT}, permissionsOk=${PERMISSIONS_OK}) - refusing to proceed, no deploys attempted" >&2
  exit 1
fi

# --- 2. Read Module C's output -----------------------------------------

if [[ ! -f "$DEPLOYMENT_STATE_FILE" ]]; then
  echo "sync.sh: deployment-state.json not found at ${DEPLOYMENT_STATE_FILE} - refusing to proceed" >&2
  exit 1
fi

# --- 3. Sync each tenant -------------------------------------------------

# Summary rows, one per line: "tenantId<TAB>statusBefore<TAB>action<TAB>outcome"
SUMMARY_ROWS=()
ANY_FAILURE=0
ANY_FAILED_SKIPPED=0
FIRST_TENANT_REGION=""

TENANT_COUNT=$(jq '.tenants | length' "$DEPLOYMENT_STATE_FILE")

for ((i = 0; i < TENANT_COUNT; i++)); do
  TENANT_JSON=$(jq -c ".tenants[$i]" "$DEPLOYMENT_STATE_FILE")
  TENANT_ID=$(echo "$TENANT_JSON" | jq -r '.tenantId')
  TENANT_REGION=$(echo "$TENANT_JSON" | jq -r '.region')
  TENANT_STATUS=$(echo "$TENANT_JSON" | jq -r '.status')

  if [[ -z "$FIRST_TENANT_REGION" ]]; then
    FIRST_TENANT_REGION="$TENANT_REGION"
  fi

  case "$TENANT_STATUS" in
    IN_SYNC)
      SUMMARY_ROWS+=("${TENANT_ID}\t${TENANT_STATUS}\tskipped (in sync)\t-")
      ;;
    FAILED)
      echo "sync.sh: tenant '${TENANT_ID}' has status FAILED - not auto-retrying, needs manual investigation" >&2
      SUMMARY_ROWS+=("${TENANT_ID}\t${TENANT_STATUS}\tskipped (failed, needs manual attention)\t-")
      ANY_FAILED_SKIPPED=1
      ;;
    NOT_DEPLOYED | DRIFTED)
      ACTION="deployed"
      if [[ "$TENANT_STATUS" == "DRIFTED" ]]; then
        ACTION="redeployed"
      fi
      echo "==> Syncing tenant '${TENANT_ID}' (${TENANT_STATUS}) in region ${TENANT_REGION}"
      if provision-tenant.sh "$TENANT_ID" "$TENANT_REGION"; then
        TENANT_FUNCTION_URL=""
        if [[ -f "$TENANTS_FILE" ]]; then
          TENANT_FUNCTION_URL=$(jq -r --arg tid "$TENANT_ID" \
            '.tenants[] | select(.tenantId == $tid) | .functionUrl // empty' \
            "$TENANTS_FILE")
        fi
        if [[ -z "$TENANT_FUNCTION_URL" ]]; then
          echo "sync.sh: deploy succeeded but no functionUrl found for '${TENANT_ID}' in ${TENANTS_FILE} - skipping verification" >&2
          SUMMARY_ROWS+=("${TENANT_ID}\t${TENANT_STATUS}\t${ACTION}\tdeployed (not verified - no URL on record)")
          ANY_FAILURE=1
        elif verify-tenant.sh "$TENANT_ID" "$TENANT_FUNCTION_URL"; then
          SUMMARY_ROWS+=("${TENANT_ID}\t${TENANT_STATUS}\t${ACTION}\tsuccess (verified)")
        else
          echo "sync.sh: tenant '${TENANT_ID}' deployed but failed verification" >&2
          SUMMARY_ROWS+=("${TENANT_ID}\t${TENANT_STATUS}\t${ACTION}\tdeployed, verification FAILED")
          ANY_FAILURE=1
        fi
      else
        echo "sync.sh: deploy failed for tenant '${TENANT_ID}'" >&2
        SUMMARY_ROWS+=("${TENANT_ID}\t${TENANT_STATUS}\t${ACTION}\tfailed")
        ANY_FAILURE=1
      fi
      ;;
    *)
      echo "sync.sh: tenant '${TENANT_ID}' has unrecognized status '${TENANT_STATUS}' - skipping" >&2
      SUMMARY_ROWS+=("${TENANT_ID}\t${TENANT_STATUS}\tskipped (unrecognized status)\t-")
      ANY_FAILURE=1
      ;;
  esac
done

# --- 4. Sync the gateway, if present -------------------------------------

HAS_GATEWAY=$(jq 'has("gateway")' "$DEPLOYMENT_STATE_FILE")

if [[ "$HAS_GATEWAY" == "true" ]]; then
  GATEWAY_STATUS=$(jq -r '.gateway.status' "$DEPLOYMENT_STATE_FILE")

  # Gateway region: any tenant's region if one exists, else a sensible
  # default. Documented choice: fall back to AWS_DEFAULT_REGION, then
  # us-east-1, matching provision-tenant.sh's own region-default pattern.
  GATEWAY_REGION="${FIRST_TENANT_REGION:-${AWS_DEFAULT_REGION:-us-east-1}}"

  case "$GATEWAY_STATUS" in
    IN_SYNC)
      SUMMARY_ROWS+=("gateway\t${GATEWAY_STATUS}\tskipped (in sync)\t-")
      ;;
    FAILED)
      echo "sync.sh: gateway has status FAILED - not auto-retrying, needs manual investigation" >&2
      SUMMARY_ROWS+=("gateway\t${GATEWAY_STATUS}\tskipped (failed, needs manual attention)\t-")
      ANY_FAILED_SKIPPED=1
      ;;
    NOT_DEPLOYED | DRIFTED)
      ACTION="deployed"
      if [[ "$GATEWAY_STATUS" == "DRIFTED" ]]; then
        ACTION="redeployed"
      fi
      echo "==> Syncing gateway (${GATEWAY_STATUS}) in region ${GATEWAY_REGION}"
      if deploy-gateway.sh "$GATEWAY_REGION"; then
        SUMMARY_ROWS+=("gateway\t${GATEWAY_STATUS}\t${ACTION}\tsuccess")
      else
        echo "sync.sh: deploy failed for gateway" >&2
        SUMMARY_ROWS+=("gateway\t${GATEWAY_STATUS}\t${ACTION}\tfailed")
        ANY_FAILURE=1
      fi
      ;;
    *)
      echo "sync.sh: gateway has unrecognized status '${GATEWAY_STATUS}' - skipping" >&2
      SUMMARY_ROWS+=("gateway\t${GATEWAY_STATUS}\tskipped (unrecognized status)\t-")
      ANY_FAILURE=1
      ;;
  esac
fi

# --- 5. Print summary table ----------------------------------------------

echo
echo "==> Sync summary"
printf '%-20s %-12s %-40s %s\n' "ID" "STATUS BEFORE" "ACTION" "OUTCOME"
for row in "${SUMMARY_ROWS[@]}"; do
  IFS=$'\t' read -r r_id r_status r_action r_outcome <<<"$(printf '%b' "$row")"
  printf '%-20s %-12s %-40s %s\n' "$r_id" "$r_status" "$r_action" "$r_outcome"
done

if [[ "$ANY_FAILURE" -eq 1 || "$ANY_FAILED_SKIPPED" -eq 1 ]]; then
  echo
  echo "sync.sh: completed with problems - see summary above" >&2
  exit 1
fi

echo
echo "sync.sh: all in sync"
exit 0
