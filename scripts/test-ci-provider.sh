#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SELECTOR="$ROOT_DIR/scripts/ci-provider.sh"
CONFIG="$ROOT_DIR/infra/ci-provider.json"
ORIGINAL="$(mktemp)"
cp "$CONFIG" "$ORIGINAL"
trap 'cp "$ORIGINAL" "$CONFIG"; rm -f "$ORIGINAL"' EXIT

assert_output() {
  local expected="$1"
  local actual
  actual="$($SELECTOR current)"
  [[ "$actual" == "$expected" ]] || { echo "expected '$expected', got '$actual'" >&2; exit 1; }
}

printf '{"provider":"github"}\n' >"$CONFIG"
assert_output github
"$SELECTOR" is-active github
if "$SELECTOR" is-active buildkite; then
  echo "github selection activated Buildkite" >&2
  exit 1
fi

printf '{"provider":"buildkite"}\n' >"$CONFIG"
assert_output buildkite
"$SELECTOR" is-active buildkite
if "$SELECTOR" is-active github; then
  echo "buildkite selection activated GitHub" >&2
  exit 1
fi

printf '{"provider":"unknown"}\n' >"$CONFIG"
if "$SELECTOR" current >/dev/null 2>&1; then
  echo "invalid provider was accepted" >&2
  exit 1
fi

echo "ci-provider selector: PASS"
