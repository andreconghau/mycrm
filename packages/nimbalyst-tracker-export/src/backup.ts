import { createHash } from 'node:crypto';
import { access, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { parseSnapshot } from './validator.js';

export interface TrackerPayload {
  id: string;
  title: string;
  status: string;
  priority: string;
  module: string;
  sourceUpdatedAt: string;
  body: string;
}

export interface BackupOptions {
  tasksDir: string;
  manifestPath: string;
  exportedAt?: string;
}

export interface BackupResult {
  filePath: string;
  conflictPath?: string;
  changed: boolean;
  contentHash: string;
}

export class BackupConflictError extends Error {
  constructor(public readonly conflictPath: string, message: string) {
    super(message);
    this.name = 'BackupConflictError';
  }
}

function normalizeBody(body: string): string {
  return body.replace(/\r\n/g, '\n');
}

function hashBody(body: string): string {
  return createHash('sha256').update(body).digest('hex');
}

function quote(value: string): string {
  return JSON.stringify(value);
}

function safeFileName(id: string): string {
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(id)) {
    throw new Error('tracker id contains unsupported filename characters');
  }
  return `${id}.md`;
}

function snapshotText(payload: TrackerPayload, exportedAt: string): string {
  const body = normalizeBody(payload.body);
  return [
    '---',
    `tracker_id: ${quote(payload.id)}`,
    `title: ${quote(payload.title)}`,
    `status: ${quote(payload.status)}`,
    `priority: ${quote(payload.priority)}`,
    `module: ${quote(payload.module)}`,
    'source: "nimbalyst"',
    `source_updated_at: ${quote(payload.sourceUpdatedAt)}`,
    `exported_at: ${quote(exportedAt)}`,
    `content_hash: ${hashBody(body)}`,
    'schema_version: 1',
    '---',
    body,
  ].join('\n');
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function atomicWrite(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = `${path}.tmp-${process.pid}-${Date.now()}`;
  try {
    await writeFile(temporaryPath, content, 'utf8');
    await rename(temporaryPath, path);
  } catch (error) {
    try { await unlink(temporaryPath); } catch { /* best effort */ }
    throw error;
  }
}

async function readManifest(path: string): Promise<Record<string, unknown>> {
  if (!(await exists(path))) {
    return {
      schema_version: 1,
      source: 'nimbalyst',
      authority: 'nimbalyst-live',
      sync_mode: 'manual-export-import',
      conflict_policy: 'prefer-live-and-preserve-local-snapshot',
      tasks: [],
    };
  }
  const parsed = JSON.parse(await readFile(path, 'utf8')) as Record<string, unknown>;
  if (!Array.isArray(parsed.tasks)) throw new Error('tracker manifest tasks must be an array');
  return parsed;
}

function timestampForFile(value: string): string {
  return value.replace(/[:.]/g, '-');
}

export async function backupTracker(payload: TrackerPayload, options: BackupOptions): Promise<BackupResult> {
  const exportedAt = options.exportedAt ?? new Date().toISOString();
  const filePath = join(options.tasksDir, safeFileName(payload.id));
  const content = snapshotText(payload, exportedAt);
  const incoming = parseSnapshot(content);
  const incomingHash = incoming.frontMatter.content_hash;
  const existing = (await exists(filePath)) ? await readFile(filePath, 'utf8') : undefined;

  if (existing) {
    const current = parseSnapshot(existing);
    const currentHash = current.frontMatter.content_hash;
    const currentSourceTime = Date.parse(current.frontMatter.source_updated_at ?? '');
    const incomingSourceTime = Date.parse(payload.sourceUpdatedAt);
    const isSame = currentHash === incomingHash && current.body === incoming.body;
    const isStale = Number.isFinite(currentSourceTime) && Number.isFinite(incomingSourceTime) && incomingSourceTime < currentSourceTime;
    if (!isSame && (isStale || currentHash !== incomingHash)) {
      const conflictPath = filePath.replace(/\.md$/, `.conflict-${timestampForFile(exportedAt)}.md`);
      await atomicWrite(conflictPath, content);
      throw new BackupConflictError(conflictPath, `backup conflict for ${payload.id}; existing snapshot was preserved`);
    }
  } else {
    await atomicWrite(filePath, content);
  }

  const manifest = await readManifest(options.manifestPath);
  const tasks = (manifest.tasks as Array<Record<string, unknown>>).filter((task) => task.tracker_id !== payload.id);
  tasks.push({ tracker_id: payload.id, path: filePath, content_hash: incomingHash, source_updated_at: payload.sourceUpdatedAt, exported_at: exportedAt, schema_version: 1 });
  await atomicWrite(options.manifestPath, `${JSON.stringify({ ...manifest, tasks }, null, 2)}\n`);

  return { filePath, changed: !existing || parseSnapshot(existing).frontMatter.content_hash !== incomingHash, contentHash: incomingHash };
}

export function parseTrackerPayload(input: unknown): TrackerPayload {
  if (!input || typeof input !== 'object') throw new Error('tracker input must be a JSON object');
  const value = input as Record<string, unknown>;
  const payload: TrackerPayload = {
    id: String(value.id ?? value.tracker_id ?? ''),
    title: String(value.title ?? ''),
    status: String(value.status ?? ''),
    priority: String(value.priority ?? 'normal'),
    module: String(value.module ?? 'system'),
    sourceUpdatedAt: String(value.sourceUpdatedAt ?? value.source_updated_at ?? ''),
    body: String(value.body ?? value.description ?? ''),
  };
  if (!payload.id || !payload.title || !payload.sourceUpdatedAt) throw new Error('tracker input requires id, title and sourceUpdatedAt');
  if (!Number.isFinite(Date.parse(payload.sourceUpdatedAt))) throw new Error('sourceUpdatedAt must be an ISO-8601 timestamp');
  return payload;
}
