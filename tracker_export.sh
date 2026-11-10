#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec npm --prefix "$SCRIPT_DIR" run tracker:export -- --workspace "$SCRIPT_DIR" "$@"
