/** Generates the disposable bootstrap snapshot from ordered D1 migrations. */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const migrationsDir = resolve(root, 'd1/migrations');
const outputPath = resolve(root, 'd1/schema.sql');
const names = (await readdir(migrationsDir))
  .filter((name) => /^\d+.*\.sql$/.test(name))
  .sort((a, b) => a.localeCompare(b));

if (names.length === 0) throw new Error('No numbered D1 migrations found.');

const sections = await Promise.all(names.map(async (name) => {
  const sql = (await readFile(resolve(migrationsDir, name), 'utf8')).trim();
  return `-- Source migration: ${name}\n${sql}`;
}));

const header = [
  '-- GENERATED FILE — edit d1/migrations/*.sql, then run npm run d1:schema.',
  '-- Bootstrap snapshot only; deployment uses `wrangler d1 migrations apply`.',
  '-- This generated snapshot intentionally stays whole despite exceeding 300 lines:',
  '-- its single responsibility is reproducibly bootstrapping the complete D1 schema.',
  ''
].join('\n');

await writeFile(outputPath, `${header}${sections.join('\n\n')}\n`);
