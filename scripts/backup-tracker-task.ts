import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

import { BackupConflictError, backupTracker, parseTrackerPayload } from '../src/modules/tracker-snapshots/backup';

const execFileAsync = promisify(execFile);
const tasksDir = 'nimbalyst-local/tracker/tasks';
const manifestPath = 'nimbalyst-local/tracker/manifest.json';

async function loadRootEnv(): Promise<void> {
  try {
    const content = await readFile(resolve(process.cwd(), '.env'), 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const separator = trimmed.indexOf('=');
      if (separator <= 0) continue;
      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim().replace(/^(['"])(.*)\1$/, '$2');
      process.env[key] ??= value;
    }
  } catch {
    // The root .env is optional; shell environment variables still work.
  }
}

function printHelp(): void {
  console.log(`Usage:
  npm run tracker:backup -- --input <file>
  npm run tracker:backup -- --stdin
  npm run tracker:backup -- --id <tracker-id>

The --id mode requires NIMBALYST_TRACKER_ADAPTER to point to an executable
that accepts the tracker ID and prints one JSON TrackerPayload object.`);
}

async function readInput(args: string[]): Promise<unknown> {
  const inputIndex = args.indexOf('--input');
  if (inputIndex >= 0) {
    const path = args[inputIndex + 1];
    if (!path) throw new Error('--input requires a file path');
    return JSON.parse(await readFile(path, 'utf8'));
  }
  if (args.includes('--stdin')) {
    return JSON.parse(await new Promise<string>((resolve, reject) => {
      let value = '';
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', (chunk) => { value += chunk; });
      process.stdin.on('end', () => resolve(value));
      process.stdin.on('error', reject);
    }));
  }
  const idIndex = args.indexOf('--id');
  if (idIndex >= 0) {
    const id = args[idIndex + 1];
    const adapter = process.env.NIMBALYST_TRACKER_ADAPTER;
    if (!id) throw new Error('--id requires a tracker ID');
    if (!adapter) throw new Error('LIVE_ADAPTER_NOT_CONFIGURED: set NIMBALYST_TRACKER_ADAPTER');
    const result = await execFileAsync(adapter, [id], { maxBuffer: 5 * 1024 * 1024 });
    return JSON.parse(result.stdout);
  }
  printHelp();
  throw new Error('one of --input, --stdin or --id is required');
}

async function main(): Promise<void> {
  await loadRootEnv();
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printHelp();
    return;
  }
  const input = await readInput(process.argv.slice(2));
  const result = await backupTracker(parseTrackerPayload(input), { tasksDir, manifestPath });
  console.log(`${result.changed ? 'Backed up' : 'Already current'} ${result.filePath}`);
  console.log(`content_hash=${result.contentHash}`);
}

main().catch((error: unknown) => {
  if (error instanceof BackupConflictError) {
    console.error(`${error.message}; review ${error.conflictPath}`);
  } else {
    console.error(error instanceof Error ? error.message : error);
  }
  process.exitCode = 1;
});
