#!/usr/bin/env node
import { exportWorkspace } from './export.js';

function help(): void {
  console.log(`Usage:
  nimbalyst-tracker-export [options]

Options:
  --workspace <path>     Project root (default: current directory)
  --tasks-dir <path>    Snapshot directory (default: nimbalyst-local/tracker/tasks)
  --manifest <path>     Manifest path (default: nimbalyst-local/tracker/manifest.json)
  --nim <path>          Nimbalyst CLI binary (default: nim)
  --live                Use live mode instead of the default local read-only DB
  -h, --help            Show this help
`);
}

function value(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes('-h') || args.includes('--help')) return help();
  const workspace = value(args, '--workspace') ?? process.cwd();
  const result = await exportWorkspace({
    workspace,
    tasksDir: value(args, '--tasks-dir') ?? 'nimbalyst-local/tracker/tasks',
    manifestPath: value(args, '--manifest') ?? 'nimbalyst-local/tracker/manifest.json',
    nimBinary: value(args, '--nim'),
    offline: !args.includes('--live'),
    onProgress: (payload) => console.log(`Backing up: ${payload.id} — ${payload.title} — status=${payload.status}`),
  });
  console.log(`Exported ${result.count} tracker(s).`);
  console.log(`Previous snapshots, if any, are in: ${result.historyDir}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
