/**
 * Crawler-side reader for D1 `curator_overrides` — the authoritative source
 * of curator decisions (Curator's Desk -> curatorPublishHandler.ts writes
 * here on every "Sync to Cloudflare D1" publish). ingest.ts's disk-JSON
 * heuristic (`preserveCuratorOverrides`) only sees whatever the last crawl
 * happened to have on disk, which is not guaranteed to reflect the latest
 * publish; this module lets a fresh hourly crawl re-apply the durable D1
 * record on top of that disk-based baseline, so a promote/demote/ignore/
 * delete survives regeneration even if the git-committed snapshot is stale.
 * Reuses the D1 REST client/auth from archiveSync.ts — SSOT, not duplicated.
 * Hard limit: <= 300 LOC.
 */

import { StoryCluster } from '../src/types/news.js';
import { D1RestConfig, executeD1Query } from './archiveSync.js';

export interface D1CuratorOverrideRow {
  id: string;
  override_type: string;
  payload_json: string;
  updated_at: string;
  curator_email?: string;
}

interface CuratorOverridePayload {
  headline?: string;
  isLeadStory?: boolean;
  isEditorPromoted?: boolean;
  isIgnored?: boolean;
  ssbIntel?: StoryCluster['ssbIntel'];
}

/**
 * Disk-JSON heuristic baseline/fallback: reinserts a promoted/ignored
 * cluster the fresh crawl dropped, using the full cluster object still held
 * on disk from the prior run. Moved here (out of ingest.ts) so it lives
 * alongside the D1-authoritative overlay it's paired with in the pipeline.
 */
export function preserveCuratorOverrides(
  newClusters: StoryCluster[],
  existingClusters: StoryCluster[]
): StoryCluster[] {
  if (!existingClusters || existingClusters.length === 0) return newClusters;
  const lockedExisting = existingClusters.filter((c) => c.isEditorPromoted || c.isIgnored);
  if (lockedExisting.length === 0) return newClusters;

  const merged = [...newClusters];
  for (const locked of lockedExisting) {
    const existingIndex = merged.findIndex(
      (m) =>
        m.id === locked.id ||
        m.primarySource.url === locked.primarySource.url ||
        m.synthesizedHeadline.toLowerCase() === locked.synthesizedHeadline.toLowerCase()
    );

    if (existingIndex !== -1) {
      merged[existingIndex] = {
        ...merged[existingIndex]!,
        isEditorPromoted: locked.isEditorPromoted,
        isLeadStory: locked.isEditorPromoted ? true : merged[existingIndex]!.isLeadStory,
        isIgnored: locked.isIgnored,
        synthesizedHeadline: locked.synthesizedHeadline,
        ssbIntel: locked.ssbIntel || merged[existingIndex]!.ssbIntel,
        defenceScore: locked.isEditorPromoted
          ? Math.max(merged[existingIndex]!.defenceScore, 125)
          : merged[existingIndex]!.defenceScore
      };
    } else if (locked.isEditorPromoted) {
      merged.unshift({ ...locked, isLeadStory: true });
    } else {
      merged.push(locked);
    }
  }
  return merged;
}

const SELECT_CURATOR_OVERRIDES_STATEMENT = {
  sql: 'SELECT id, override_type, payload_json, updated_at, curator_email FROM curator_overrides',
  params: [] as unknown[]
};

/**
 * Fetches every curator_overrides row. Returns null (not []) on any
 * failure so callers can distinguish "D1 has no overrides" from
 * "D1 was unreachable" and fail loud rather than silently treating an
 * outage as an empty override set.
 */
export async function fetchCuratorOverridesFromD1(
  config: D1RestConfig,
  fetchFn: typeof fetch
): Promise<D1CuratorOverrideRow[] | null> {
  try {
    const result = await executeD1Query(SELECT_CURATOR_OVERRIDES_STATEMENT, config, fetchFn);
    if (!result.ok) {
      console.error(
        `[D1 CURATOR OVERRIDES] Query failed (status ${result.status ?? 'unknown'}); falling back to disk-JSON override heuristic only.`
      );
      return null;
    }
    return result.rows as unknown as D1CuratorOverrideRow[];
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[D1 CURATOR OVERRIDES] Fetch threw "${msg}"; falling back to disk-JSON override heuristic only.`);
    return null;
  }
}

/**
 * Applies D1 curator_overrides rows on top of an already disk-merged
 * cluster list. D1 wins every field it carries (it is the record of what a
 * curator most recently published), including for clusters the disk
 * heuristic itself reinserted. A 'delete' override_type is a permanent
 * tombstone (Phase 3): the matching cluster is dropped from the output
 * entirely, even if it was just re-promoted by the disk fallback, so a
 * deleted story can never silently reappear because the crawler rediscovers
 * the same source article.
 */
export function applyD1CuratorOverrides(
  clusters: StoryCluster[],
  overrideRows: D1CuratorOverrideRow[]
): StoryCluster[] {
  if (!overrideRows || overrideRows.length === 0) return clusters;

  const deletedIds = new Set(overrideRows.filter((r) => r.override_type === 'delete').map((r) => r.id));
  const merged = clusters.filter((c) => !deletedIds.has(c.id));

  for (const row of overrideRows) {
    if (row.override_type === 'delete') continue;

    let payload: CuratorOverridePayload;
    try {
      payload = JSON.parse(row.payload_json) as CuratorOverridePayload;
    } catch {
      console.error(`[D1 CURATOR OVERRIDES] Malformed payload_json for override id="${row.id}"; skipping this row.`);
      continue;
    }

    const index = merged.findIndex((c) => c.id === row.id);
    if (index === -1) continue;

    const existing = merged[index]!;
    merged[index] = {
      ...existing,
      synthesizedHeadline: payload.headline ?? existing.synthesizedHeadline,
      isLeadStory: payload.isLeadStory ?? existing.isLeadStory,
      isEditorPromoted: payload.isEditorPromoted ?? existing.isEditorPromoted,
      isIgnored: payload.isIgnored ?? existing.isIgnored,
      ssbIntel: payload.ssbIntel ?? existing.ssbIntel,
      defenceScore: payload.isEditorPromoted ? Math.max(existing.defenceScore, 125) : existing.defenceScore
    };
  }

  return merged;
}
