import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { BackupConflictError, backupTracker } from './backup';

const payload = {
  id: 'tsk_backup123',
  title: 'Backup tracker content',
  status: 'in-review',
  priority: 'high',
  module: 'system',
  sourceUpdatedAt: '2026-11-09T09:00:00Z',
  body: '## Goal\n\nKeep the full task body.\n',
};

async function setup() {
  const root = await mkdtemp(join(tmpdir(), 'tracker-backup-'));
  return { tasksDir: join(root, 'tasks'), manifestPath: join(root, 'manifest.json') };
}

describe('tracker backup', () => {
  it('writes a snapshot and manifest atomically', async () => {
    const options = await setup();
    const result = await backupTracker(payload, options);
    expect(result.changed).toBe(true);
    expect(await readFile(result.filePath, 'utf8')).toContain('Keep the full task body.');
    expect(await readFile(options.manifestPath, 'utf8')).toContain('tsk_backup123');
  });

  it('refuses to overwrite a changed local snapshot', async () => {
    const options = await setup();
    await backupTracker(payload, options);
    await expect(backupTracker({ ...payload, body: '## Changed locally\n' }, options)).rejects.toBeInstanceOf(BackupConflictError);
  });

  it('allows an unchanged backup without changing content', async () => {
    const options = await setup();
    const first = await backupTracker(payload, options);
    const second = await backupTracker(payload, options);
    expect(second.changed).toBe(false);
    expect(second.contentHash).toBe(first.contentHash);
  });
});
