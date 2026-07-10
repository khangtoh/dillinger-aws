#!/usr/bin/env bash
# Shared helper: computes a deterministic config fingerprint for a SAM
# template + its parameter overrides, used to detect drift between what's
# actually deployed (a stack's DillingerConfigHash tag) and what the
# local template/config currently says should be deployed.
#
# Usage: source this file, then call:
#   compute_config_hash <template-file> [Key=Value ...]
#
# Both the write side (provision-tenant.sh / deploy-gateway.sh, which tag
# the stack with this hash at deploy time) and the read side
# (check-state.sh, which recomputes it locally to compare) MUST use this
# exact function - do not reimplement the hashing inline elsewhere, or
# the two sides will silently drift apart.

compute_config_hash() {
  local template_file="$1"
  shift
  {
    cat "$template_file"
    printf '%s\n' "$@" | sort
  } | sha256sum | awk '{print $1}'
}
