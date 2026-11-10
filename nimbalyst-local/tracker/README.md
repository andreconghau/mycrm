# Nimbalyst Tracker file backup

Nimbalyst remains the source of truth. This directory stores reviewable task snapshots so task content can be restored consistently later.

## Backup from JSON

The input object must contain `id`, `title`, `status`, `priority`, `module`, `sourceUpdatedAt` and `body`.

```bash
npm run tracker:backup -- --input /path/to/tracker-task.json
cat /path/to/tracker-task.json | npm run tracker:backup -- --stdin
```

The command writes `nimbalyst-local/tracker/tasks/<id>.md`, computes a SHA-256 body hash and updates `manifest.json`. Writes are atomic. A changed local snapshot is never overwritten; the incoming version is written as a `.conflict-<timestamp>.md` file and the command exits non-zero.

## Live adapter

The shell cannot call the Nimbalyst MCP directly. To use `--id`, configure an executable bridge:

```bash
export NIMBALYST_TRACKER_ADAPTER=/path/to/nimbalyst-tracker-get
npm run tracker:backup -- --id NIM-123
```

The CLI reads environment variables from the project-root `.env` first, while `docker/.env` remains reserved for Docker Compose. Shell environment variables take precedence.

The bridge receives the tracker ID as its first argument and must print one JSON object using the input contract above. Without this variable, `--id` fails with `LIVE_ADAPTER_NOT_CONFIGURED` and creates no file.

## Review and commit

```bash
npm run tracker:validate
git status --short
git diff -- nimbalyst-local/tracker
```

Review the snapshot and then commit it using the normal repository workflow. The backup command never stages or commits files.

## Import direction

Importing back into Nimbalyst is intentionally not automatic yet. A future importer must verify the snapshot hash, manifest entry and live `sourceUpdatedAt`, then show a diff or require explicit conflict resolution before writing.
