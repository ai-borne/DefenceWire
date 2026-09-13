// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeSnapshotAtomically } from '../../crawler/snapshotWriter.js';

const directories: string[] = [];
afterEach(() => Promise.all(directories.splice(0).map((directory) =>
  rm(directory, { recursive: true, force: true }))));

describe('atomic homepage snapshot writer', () => {
  it('commits a complete JSON snapshot through a same-directory rename', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'defencewire-snapshot-'));
    directories.push(directory);
    const target = join(directory, 'data', 'news.json');
    await writeSnapshotAtomically(target, { clusters: [{ id: 'cluster-a' }] });
    expect(JSON.parse(await readFile(target, 'utf8'))).toEqual({ clusters: [{ id: 'cluster-a' }] });
  });
});
