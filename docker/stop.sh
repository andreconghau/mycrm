#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

command -v docker >/dev/null 2>&1 || { printf 'Error: Docker CLI was not found.\n' >&2; exit 1; }
docker compose version >/dev/null 2>&1 || { printf 'Error: Docker Compose is unavailable.\n' >&2; exit 1; }
docker info >/dev/null 2>&1 || { printf 'Error: Docker daemon is unavailable. Start Docker and try again.\n' >&2; exit 1; }

# `down` removes the container and network but deliberately keeps postgres_data.
docker compose down
printf 'PostgreSQL services stopped. The postgres_data volume was preserved.\n'
