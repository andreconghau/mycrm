# @nimbalyst/tracker-export

Reusable exporter for Nimbalyst tracker items.

It reads the tracker list dynamically from the Nimbalyst CLI, writes one Markdown snapshot per tracker, preserves the task body's line breaks and Markdown fences, updates a manifest, and refuses to silently overwrite a changed local snapshot. When a conflict is found, the existing snapshot is moved to a temporary history directory and the newer Nimbalyst snapshot is promoted.

## CLI

Build the package, then run it from a project root:

```sh
npm run tracker:package:build
node packages/nimbalyst-tracker-export/dist/cli.js --workspace /absolute/path/to/project
```

The CLI defaults to the local read-only Nimbalyst database. Use `--live` only when the live tracker list is available:

```sh
node packages/nimbalyst-tracker-export/dist/cli.js --workspace . --live
```

Options:

- `--workspace`: project root; defaults to the current directory.
- `--tasks-dir`: snapshot directory; defaults to `nimbalyst-local/tracker/tasks`.
- `--manifest`: manifest path; defaults to `nimbalyst-local/tracker/manifest.json`.
- `--nim`: path or name of the `nim` executable.
- `--live`: use live mode instead of the local read-only database.

## Library

```ts
import { exportWorkspace } from '@nimbalyst/tracker-export';

await exportWorkspace({
  workspace: process.cwd(),
  tasksDir: 'nimbalyst-local/tracker/tasks',
  manifestPath: 'nimbalyst-local/tracker/manifest.json',
});
```

The package does not contain tracker IDs, project-specific paths, or project-specific business rules. Each consuming project supplies its workspace and output paths.
