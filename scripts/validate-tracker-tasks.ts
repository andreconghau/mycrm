import { glob, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { validateSnapshotCollection } from '../src/modules/tracker-snapshots/validator';

const root = resolve('nimbalyst-local/tracker/tasks');
async function main(): Promise<void> {
  const files: Array<{ file: string; text: string }> = [];

  for await (const path of glob('*.md', { cwd: root })) {
    if (path === '_TEMPLATE.md') continue;
    files.push({ file: path, text: await readFile(resolve(root, path), 'utf8') });
  }

  const errors = validateSnapshotCollection(files);
  if (errors.length > 0) {
    console.error(errors.map((error) => `- ${error}`).join('\n'));
    process.exitCode = 1;
  } else {
    console.log(`Validated ${files.length} tracker snapshot(s).`);
  }
}

void main();
