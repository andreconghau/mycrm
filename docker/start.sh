#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

fail() {
  printf 'Error: %s\n' "$1" >&2
  exit "${2:-1}"
}

command -v docker >/dev/null 2>&1 || fail "Docker CLI was not found. Install Docker Desktop or Docker Engine."
docker compose version >/dev/null 2>&1 || fail "Docker Compose is unavailable. Install the Docker Compose plugin."
docker info >/dev/null 2>&1 || fail "Docker daemon is unavailable. Start Docker and try again."

if [[ ! -f .env ]]; then
  fail "Missing docker/.env. Copy docker/.env.example to docker/.env and set a unique POSTGRES_PASSWORD."
fi

for variable in POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD; do
  if ! grep -Eq "^${variable}=.+$" .env; then
    fail "docker/.env must define a non-empty ${variable}."
  fi
done

if grep -Eq '^POSTGRES_PASSWORD=(replace-with-a-unique-local-password|your-password|password)$' .env; then
  fail "Replace the example POSTGRES_PASSWORD in docker/.env before starting PostgreSQL."
fi

docker compose config --quiet || fail "Docker Compose configuration is invalid."
docker compose up --detach || fail "Docker Compose could not start PostgreSQL."

container_id="$(docker compose ps --quiet postgres)"
[[ -n "$container_id" ]] || fail "PostgreSQL container was not created."

printf 'Waiting for PostgreSQL health'
for _ in {1..30}; do
  health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}' "$container_id" 2>/dev/null || true)"
  case "$health" in
    healthy)
      printf '\nPostgreSQL is healthy.\n'
      docker compose ps
      exit 0
      ;;
    unhealthy|missing)
      printf '\n'
      docker compose logs --tail 50 postgres >&2 || true
      fail "PostgreSQL health check reported ${health}."
      ;;
  esac
  printf '.'
  sleep 2
done

printf '\n'
docker compose logs --tail 50 postgres >&2 || true
fail "PostgreSQL did not become healthy within 60 seconds."
