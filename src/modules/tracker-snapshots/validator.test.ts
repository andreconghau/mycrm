import { describe, expect, it } from 'vitest';

import { hashSnapshotBody, validateSnapshotCollection, validateSnapshotText } from './validator';

const body = `## Goal\n\nPreserve the approved task content.\n`;
const validSnapshot = `---\ntracker_id: tsk_demo123\ntitle: Preserve task content\nstatus: in-review\npriority: high\nmodule: system\nsource: nimbalyst\nsource_updated_at: 2026-11-09T08:00:00Z\nexported_at: 2026-11-09T08:05:00Z\ncontent_hash: ${hashSnapshotBody(body)}\nschema_version: 1\n---\n${body}`;

describe('tracker snapshot validator', () => {
  it('accepts a valid snapshot and verifies the body hash', () => {
    expect(validateSnapshotText(validSnapshot)).toEqual({
      trackerId: 'tsk_demo123',
      errors: [],
      warnings: [],
    });
  });

  it('rejects missing identifiers and a stale content hash', () => {
    const invalid = validSnapshot
      .replace('tracker_id: tsk_demo123\n', '')
      .replace(hashSnapshotBody(body), '0'.repeat(64));

    const result = validateSnapshotText(invalid);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'missing required field: tracker_id',
        'content_hash does not match the snapshot body',
      ]),
    );
  });

  it('detects duplicate tracker identifiers', () => {
    expect(
      validateSnapshotCollection([
        { file: 'one.md', text: validSnapshot },
        { file: 'two.md', text: validSnapshot },
      ]),
    ).toEqual(['two.md: duplicate tracker_id tsk_demo123 (already in one.md)']);
  });
});
