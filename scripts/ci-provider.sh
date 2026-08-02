#!/usr/bin/env bash
# Reads the single, versioned CI-provider selection used by both CI systems.
# Changing infra/ci-provider.json is the only way to activate a provider.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_FILE="${ROOT_DIR}/infra/ci-provider.json"

provider() {
  python3 - "$CONFIG_FILE" <<'PY'
import json
import sys

path = sys.argv[1]
try:
    value = json.load(open(path, encoding="utf-8")).get("provider")
except (OSError, json.JSONDecodeError) as error:
    raise SystemExit(f"ci-provider: cannot read {path}: {error}")

if value not in {"github", "buildkite"}:
    raise SystemExit("ci-provider: provider must be exactly 'github' or 'buildkite'")

print(value)
PY
}

usage() {
  echo "Usage: $0 current | is-active <github|buildkite> | github-output | upload-buildkite-pipeline" >&2
  exit 2
}

case "${1:-}" in
  current)
    [[ $# -eq 1 ]] || usage
    provider
    ;;
  is-active)
    [[ $# -eq 2 ]] || usage
    [[ "$2" == "github" || "$2" == "buildkite" ]] || usage
    [[ "$(provider)" == "$2" ]]
    ;;
  github-output)
    [[ $# -eq 1 ]] || usage
    [[ -n "${GITHUB_OUTPUT:-}" ]] || { echo "ci-provider: GITHUB_OUTPUT is required" >&2; exit 2; }
    if [[ "$(provider)" == "github" ]]; then
      echo "active=true" >>"$GITHUB_OUTPUT"
    else
      echo "active=false" >>"$GITHUB_OUTPUT"
    fi
    ;;
  upload-buildkite-pipeline)
    [[ $# -eq 1 ]] || usage
    if [[ "$(provider)" != "buildkite" ]]; then
      echo "CI provider is github; Buildkite jobs were not uploaded."
      exit 0
    fi
    command -v buildkite-agent >/dev/null || { echo "ci-provider: buildkite-agent is required" >&2; exit 1; }
    buildkite-agent pipeline upload "${ROOT_DIR}/.buildkite/pipeline.active.yml"
    ;;
  *) usage ;;
esac
