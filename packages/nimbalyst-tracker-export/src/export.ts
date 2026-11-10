import { execFile } from 'node:child_process';
import { mkdir, readFile, rename } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';

import { backupTracker, BackupConflictError, parseTrackerPayload, type TrackerPayload } from './backup.js';

const execFileAsync = promisify(execFile);

export interface ExportOptions {
  workspace: string;
  tasksDir: string;
  manifestPath: string;
  nimBinary?: string;
  offline?: boolean;
  onProgress?: (payload: TrackerPayload) => void;
}

export interface ExportResult {
  count: number;
  historyDir: string;
}

function workspacePath(workspace: string, path: string): string {
  return resolve(workspace, path);
}

function decodeBody(body: unknown): string {
  if (typeof body !== 'string') return String(body ?? '');
  try { return JSON.parse(body) as string; } catch { return body; }
}

function toPayload(item: Record<string, unknown>): TrackerPayload {
  const fields = (item.fields ?? {}) as Record<string, unknown>;
  const body = decodeBody(item.body);
  const sourceUpdatedAt = /\*\*Updated\*\*: ([^\n]+)/.exec(body)?.[1] ?? String((item.system as Record<string, unknown> | undefined)?.updatedAt ?? '');
  return parseTrackerPayload({
    id: item.id,
    title: fields.title,
    status: fields.status,
    priority: fields.priority,
    module: Array.isArray(fields.tags) ? fields.tags.join(', ') || 'system' : 'system',
    sourceUpdatedAt,
    body: body.split('\n---\n').at(-1) ?? body,
  });
}

async function nimJson(args: string[], options: ExportOptions): Promise<Record<string, unknown>> {
  const nimArgs = ['--workspace', options.workspace];
  if (options.offline ?? true) nimArgs.push('--offline');
  nimArgs.push(...args, '--json');
  const result = await execFileAsync(options.nimBinary ?? 'nim', nimArgs, { maxBuffer: 20 * 1024 * 1024 });
  return JSON.parse(result.stdout) as Record<string, unknown>;
}

async function promoteConflict(conflictPath: string, tasksDir: string, id: string, historyDir: string): Promise<void> {
  const canonicalPath = join(tasksDir, `${id}.md`);
  await mkdir(historyDir, { recursive: true });
  await rename(canonicalPath, join(historyDir, `${id}.md`));
  await rename(conflictPath, canonicalPath);
}

export async function exportWorkspace(options: ExportOptions): Promise<ExportResult> {
  const list = await nimJson(['tracker', 'list', '--all'], options);
  const items = Array.isArray(list.items) ? list.items as Array<Record<string, unknown>> : [];
  if (!items.length) throw new Error(`Nimbalyst returned no tracker items for workspace ${options.workspace}`);

  const historyDir = join(tmpdir(), `nimbalyst-tracker-history-${new Date().toISOString().replace(/[.:]/g, '-')}`);
  for (const item of items) {
    const payload = toPayload(await nimJson(['tracker', 'get', String(item.id)], options));
    options.onProgress?.(payload);
    try {
      await backupTracker(payload, { tasksDir: workspacePath(options.workspace, options.tasksDir), manifestPath: workspacePath(options.workspace, options.manifestPath) });
    } catch (error) {
      if (!(error instanceof BackupConflictError)) throw error;
      await promoteConflict(error.conflictPath, workspacePath(options.workspace, options.tasksDir), payload.id, historyDir);
      await backupTracker(payload, { tasksDir: workspacePath(options.workspace, options.tasksDir), manifestPath: workspacePath(options.workspace, options.manifestPath) });
    }
  }
  return { count: items.length, historyDir };
}
