import { createHash } from 'node:crypto';

export const TRACKER_SNAPSHOT_SCHEMA_VERSION = 1;
const REQUIRED_FIELDS = ['tracker_id', 'title', 'status', 'priority', 'module', 'source', 'source_updated_at', 'exported_at', 'content_hash', 'schema_version'] as const;
const ALLOWED_STATUSES = new Set(['backlog', 'to-do', 'in-progress', 'in-review', 'approved', 'changes-requested', 'done', 'blocked', 'cancelled']);

export type SnapshotFrontMatter = Record<string, string>;
export interface SnapshotValidationResult { trackerId?: string; errors: string[]; warnings: string[]; }

function parseScalar(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length >= 2 && ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'")))) return trimmed.slice(1, -1);
  return trimmed;
}

export function parseSnapshot(text: string): { frontMatter: SnapshotFrontMatter; body: string; errors: string[] } {
  const normalized = text.replace(/\r\n/g, '\n');
  if (!normalized.startsWith('---\n')) return { frontMatter: {}, body: normalized, errors: ['missing YAML front matter'] };
  const end = normalized.indexOf('\n---', 4);
  if (end === -1) return { frontMatter: {}, body: normalized, errors: ['unterminated YAML front matter'] };
  const frontMatter: SnapshotFrontMatter = {};
  for (const [index, line] of normalized.slice(4, end).trimEnd().split('\n').entries()) {
    const separator = line.indexOf(':');
    if (separator <= 0) return { frontMatter, body: normalized.slice(end + 4).replace(/^\n/, ''), errors: [`invalid front matter line ${index + 1}`] };
    const key = line.slice(0, separator).trim();
    if (key in frontMatter) return { frontMatter, body: normalized.slice(end + 4).replace(/^\n/, ''), errors: [`duplicate front matter key: ${key}`] };
    frontMatter[key] = parseScalar(line.slice(separator + 1));
  }
  return { frontMatter, body: normalized.slice(end + 4).replace(/^\n/, ''), errors: [] };
}

export function hashSnapshotBody(body: string): string { return createHash('sha256').update(body.replace(/\r\n/g, '\n')).digest('hex'); }
function isIsoDate(value: string | undefined): boolean { return Boolean(value && !Number.isNaN(Date.parse(value)) && value.includes('T')); }

export function validateSnapshotText(text: string): SnapshotValidationResult {
  const parsed = parseSnapshot(text); const { frontMatter, body } = parsed; const errors = [...parsed.errors]; const warnings: string[] = [];
  for (const field of REQUIRED_FIELDS) if (!frontMatter[field]) errors.push(`missing required field: ${field}`);
  if (frontMatter.tracker_id && !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(frontMatter.tracker_id)) errors.push('tracker_id contains unsupported characters');
  if (frontMatter.status && !ALLOWED_STATUSES.has(frontMatter.status)) errors.push(`unsupported status: ${frontMatter.status}`);
  if (frontMatter.schema_version && frontMatter.schema_version !== String(TRACKER_SNAPSHOT_SCHEMA_VERSION)) errors.push(`unsupported schema_version: ${frontMatter.schema_version}`);
  for (const field of ['source_updated_at', 'exported_at']) if (frontMatter[field] && !isIsoDate(frontMatter[field])) errors.push(`${field} must be an ISO-8601 timestamp`);
  if (frontMatter.content_hash && !/^[a-f0-9]{64}$/.test(frontMatter.content_hash)) errors.push('content_hash must be a lowercase SHA-256 hex digest');
  else if (frontMatter.content_hash && frontMatter.content_hash !== hashSnapshotBody(body)) errors.push('content_hash does not match the snapshot body');
  if (!body.trim()) warnings.push('snapshot body is empty');
  return { trackerId: frontMatter.tracker_id, errors, warnings };
}

export function validateSnapshotCollection(snapshots: Array<{ file: string; text: string }>): string[] {
  const errors: string[] = []; const seen = new Map<string, string>();
  for (const snapshot of snapshots) { const result = validateSnapshotText(snapshot.text); for (const error of result.errors) errors.push(`${snapshot.file}: ${error}`); if (result.trackerId) { const previous = seen.get(result.trackerId); if (previous) errors.push(`${snapshot.file}: duplicate tracker_id ${result.trackerId} (already in ${previous})`); else seen.set(result.trackerId, snapshot.file); } }
  return errors;
}
