#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/examples/.env.local"

if [[ ! -f "$ENV_FILE" ]]; then
  printf 'Missing %s\n' "$ENV_FILE" >&2
  printf 'Copy examples/.env.example to examples/.env.local and add your own Parse application credentials.\n' >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

cd "$ROOT"
npm run example:list-resources

unset LOLLIPOP_APPLICATION_ID LOLLIPOP_REST_API_KEY LOLLIPOP_USERNAME LOLLIPOP_PASSWORD
