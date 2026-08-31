/**
 * D1 database size check for DefenceWire.in (Phase 5 of the R2 cluster_json
 * migration). Covers the whole database, not just archived_stories — the
 * other three tables (curator_overrides, discovered_entities,
 * source_reputation) are only practically self-limiting today, nothing in
 * the schema enforces it, so a single size check on the database is the
 * only thing that fails loud regardless of which table actually grows.
 * Reuses the D1RestConfig / auth already built by buildD1ConfigFromEnv in
 * crawler/archiveSync.ts — SSOT for D1 REST auth, not duplicated here.
 * Hard limit: <= 300 LOC.
 */

import { D1RestConfig } from './archiveSync.js';

// Conservative warning threshold well below the real 5GB (free tier) / 10GB
// (paid) D1 cap, so there is response time before writes actually start
// failing. 4GB in bytes.
export const D1_SIZE_WARNING_BYTES = 4 * 1024 * 1024 * 1024;

export interface D1SizeCheckResult {
  ok: boolean;
  sizeBytes: number;
  overThreshold: boolean;
}

function d1InfoEndpoint(config: D1RestConfig): string {
  return `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/d1/database/${config.databaseId}`;
}

export async function checkD1Size(
  config: D1RestConfig,
  fetchFn: typeof fetch = globalThis.fetch
): Promise<D1SizeCheckResult> {
  const response = await fetchFn(d1InfoEndpoint(config), {
    headers: { Authorization: `Bearer ${config.apiToken}` }
  });

  if (!response.ok) {
    console.error(`[D1 SIZE CHECK] HTTP ${response.status} fetching database info`);
    return { ok: false, sizeBytes: 0, overThreshold: false };
  }

  const bodyText = await response.text();
  const body = JSON.parse(bodyText) as { result?: { file_size?: number } };
  const sizeBytes = body.result?.file_size ?? 0;
  const overThreshold = sizeBytes >= D1_SIZE_WARNING_BYTES;

  return { ok: true, sizeBytes, overThreshold };
}

async function main(): Promise<void> {
  const { buildD1ConfigFromEnv } = await import('./archiveSync.js');
  const config = buildD1ConfigFromEnv(process.env);
  if (!config) {
    console.error('[D1 SIZE CHECK] Missing D1 environment configuration; aborting.');
    process.exit(1);
  }

  const result = await checkD1Size(config);
  if (!result.ok) {
    console.error('[D1 SIZE CHECK] Failed to determine database size.');
    process.exit(1);
  }

  const sizeMb = (result.sizeBytes / (1024 * 1024)).toFixed(1);
  console.log(`[D1 SIZE CHECK] Database size: ${sizeMb} MB`);

  if (result.overThreshold) {
    console.error(
      `[D1 SIZE CHECK] Database size ${sizeMb} MB is at/above the ${D1_SIZE_WARNING_BYTES / (1024 * 1024 * 1024)}GB warning threshold. ` +
        'Investigate table-level growth (archived_stories, curator_overrides, discovered_entities, source_reputation) before D1 quota is hit.'
    );
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
