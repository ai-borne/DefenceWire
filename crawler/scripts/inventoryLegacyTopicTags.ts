/** Inventories pre-durable legacy hashtags in archived R2 cluster payloads and queues any
 *  unresolved tag as a pending topic_candidates row via the same path the historical backfill
 *  uses (queueUnknownLegacyTags) -- no tag is ever promoted to a canonical topic here. */
import { buildD1ConfigFromEnv, executeD1Query } from '../archiveSync.js';
import { buildR2ConfigFromEnv, getClusterJson } from '../r2ArchiveStore.js';
import { fetchTopicRegistry } from '../topicAssignmentService.js';
import { queueUnknownLegacyTags } from '../topicHistoricalBackfill.js';
import { normalizeTopicAlias } from '../../src/services/topicRegistryService.js';

type LegacyPayload = { id?: unknown; primaryTag?: unknown; hashtags?: unknown; ssbIntel?: { primaryTag?: unknown; hashtags?: unknown } };

function legacyTags(payload: LegacyPayload): string[] {
  return [payload.primaryTag, ...(Array.isArray(payload.hashtags) ? payload.hashtags : []), payload.ssbIntel?.primaryTag, ...(Array.isArray(payload.ssbIntel?.hashtags) ? payload.ssbIntel.hashtags : [])]
    .filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0).map((tag) => tag.trim());
}

async function main(): Promise<void> {
  const d1 = buildD1ConfigFromEnv(process.env); const r2 = buildR2ConfigFromEnv(process.env);
  if (!d1 || !r2) throw new Error('Legacy tag inventory requires complete D1 and R2 configuration.');
  const now = new Date().toISOString();
  const registry = await fetchTopicRegistry(d1, fetch);
  const ids = await executeD1Query({ sql: `SELECT sc.id FROM story_clusters sc JOIN archived_stories a ON a.id = sc.id ORDER BY sc.id`, params: [] }, d1, fetch);
  if (!ids.ok) throw new Error(`Failed to list archived clusters: ${ids.error ?? ids.status}`);
  const archivedIds = (ids.rows as Array<{ id: string }>).map((row) => row.id);

  let payloadOk = 0; let payloadMissing = 0; let identityMismatch = 0;
  const resolved = new Set<string>(); const unresolved = new Set<string>();

  for (const id of archivedIds) {
    const result = await getClusterJson(id, r2, fetch);
    if (!result.ok || !result.body) { payloadMissing++; continue; }
    let payload: LegacyPayload;
    try { payload = JSON.parse(result.body) as LegacyPayload; } catch { payloadMissing++; continue; }
    if (payload.id !== id) { identityMismatch++; continue; }
    payloadOk++;
    const tags = legacyTags(payload);
    const unresolvedRawTags = tags.filter((tag) => {
      const normalized = normalizeTopicAlias(tag.replace(/^#/, ''));
      if (!normalized) return false;
      const isResolved = registry.aliases.some((a) => a.normalizedAlias === normalized)
        || registry.topics.some((t) => normalizeTopicAlias(t.displayHashtag.replace(/^#/, '')) === normalized);
      (isResolved ? resolved : unresolved).add(normalized);
      return !isResolved;
    });
    if (unresolvedRawTags.length > 0) await queueUnknownLegacyTags(id, unresolvedRawTags, now, d1, fetch);
  }

  console.log(`[LEGACY TAG INVENTORY] archivedClusters=${archivedIds.length} payloadOk=${payloadOk} payloadMissing=${payloadMissing} identityMismatch=${identityMismatch}`);
  console.log(`[LEGACY TAG INVENTORY] resolvedDistinctTags=${resolved.size} unresolvedDistinctTags=${unresolved.size} queuedAsPendingCandidates=true`);
  console.log(`[LEGACY TAG INVENTORY] unresolved=${JSON.stringify([...unresolved].sort())}`);
}

if (import.meta.url === `file://${process.argv[1]}`) void main();
