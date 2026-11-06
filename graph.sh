
#!/usr/bin/env bash
# Refresh the local code knowledge graph and regenerate its HTML/report.
set -Eeuo pipefail

PROJECT_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
GRAPH_DIR="${PROJECT_ROOT}/graphify-out"
GRAPH_JSON="${GRAPH_DIR}/graph.json"
GRAPH_HTML="${GRAPH_DIR}/graph.html"
GRAPH_REPORT="${GRAPH_DIR}/GRAPH_REPORT.md"

OPEN_BROWSER=false
FORCE=false

usage() {
  cat <<'HELP'
Usage: ./graph.sh [--open] [--force]

  --open   Open the updated graph.html in the browser (macOS).
  --force  Allow the graph to shrink after deletions/refactors.
  -h, --help  Show this help.
HELP
}

for arg in "$@"; do
  case "$arg" in
    --open) OPEN_BROWSER=true ;;
    --force) FORCE=true ;;
    -h|--help) usage; exit 0 ;;
    *) printf 'Unknown option: %s\n' "$arg" >&2; usage >&2; exit 2 ;;
  esac
done

if ! command -v graphify >/dev/null 2>&1; then
  printf 'Error: graphify CLI not found in PATH.\n' >&2
  exit 1
fi

cd "$PROJECT_ROOT"

if [[ ! -s "$GRAPH_JSON" ]]; then
  printf '[1/3] No existing graph: building a local code-only index...\n'
  graphify extract . --code-only
else
  printf '[1/3] Updating changed code files...\n'
  update_args=(update . --no-cluster)
  if [[ "$FORCE" == true ]]; then
    update_args+=(--force)
  fi
  graphify "${update_args[@]}"
fi

printf '[2/3] Regenerating graph, architecture report, and HTML...\n'
graphify cluster-only . --no-label

printf '[3/3] Verifying output files...\n'
for file in "$GRAPH_JSON" "$GRAPH_REPORT" "$GRAPH_HTML"; do
  if [[ ! -s "$file" ]]; then
    printf 'Error: missing or empty output: %s\n' "$file" >&2
    exit 1
  fi
done

printf '\nGraphify completed successfully:\n'
ls -lh "$GRAPH_JSON" "$GRAPH_REPORT" "$GRAPH_HTML"

if [[ "$OPEN_BROWSER" == true ]]; then
  if command -v open >/dev/null 2>&1; then
    open "$GRAPH_HTML"
  else
    printf 'Browser auto-open is available on macOS. Open manually: %s\n' "$GRAPH_HTML" >&2
  fi
fi
