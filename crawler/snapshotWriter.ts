import * as fs from 'node:fs/promises';
import * as path from 'node:path';

/** Replaces the homepage JSON atomically so readers never observe a partial file. */
export async function writeSnapshotAtomically(targetPath: string, value: unknown): Promise<void> {
  const directory = path.dirname(targetPath);
  const tempPath = path.join(directory, `.${path.basename(targetPath)}.${process.pid}.tmp`);
  await fs.mkdir(directory, { recursive: true });
  try {
    await fs.writeFile(tempPath, JSON.stringify(value, null, 2), 'utf-8');
    await fs.rename(tempPath, targetPath);
  } catch (error) {
    await fs.unlink(tempPath).catch(() => undefined);
    throw error;
  }
}
