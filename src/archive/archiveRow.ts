/**
 * Archive Row Mapper for DefenceWire.in
 * SSOT translation between a StoryCluster and its D1 row shape. cluster_json
 * carries the full cluster verbatim (the archival record of truth); the
 * flattened columns exist only to drive the FTS5 index and sort/filter, so
 * they can never become an independent, driftable source of truth.
 * Hard limit: <= 300 LOC.
 */

import { StoryCluster } from '../types/news.js';

export interface ArchivedStoryRow {
  id: string;
  synthesized_headline: string;
  snippet: string | null;
  primary_source_name: string;
  primary_source_url: string;
  primary_source_published_at: string;
  categories: string;
  entities: string;
  defence_score: number;
  cluster_json: string | null;
  archived_at: string;
}

export type GetClusterJson = (id: string) => Promise<string | null>;

/**
 * Thrown by a `GetClusterJson` implementation when the R2 binding/config
 * itself is unavailable (not merely "blob not found for this id"). Callers
 * must treat this as a request-level failure, never a per-row skip — see
 * `archiveSearchHandler.ts` / `entityDossierHandler.ts`.
 */
export class ArchiveBindingUnavailableError extends Error {}

/**
 * cluster_json is never written to D1 as of Phase 3 — R2 is the sole copy
 * of the full payload going forward, so the flattened columns stay the only
 * D1 truth for a newly archived row (see fromArchivedStoryRow below).
 */
export function toArchivedStoryRow(cluster: StoryCluster, archivedAt: string): ArchivedStoryRow {
  return {
    id: cluster.id,
    synthesized_headline: cluster.synthesizedHeadline,
    snippet: cluster.primarySource.snippet ?? null,
    primary_source_name: cluster.primarySource.sourceName,
    primary_source_url: cluster.primarySource.url,
    primary_source_published_at: cluster.primarySource.publishedAt,
    categories: JSON.stringify(cluster.categories),
    entities: JSON.stringify(cluster.entities),
    defence_score: cluster.defenceScore,
    cluster_json: null,
    archived_at: archivedAt
  };
}

/**
 * D1 is authoritative when it holds cluster_json (rows archived before the
 * Phase 3 cutover); for every row archived after, the R2 blob is the only
 * copy left, so a missing/failed fallback must surface as an error, never a
 * silently empty or malformed story.
 */
export async function fromArchivedStoryRow(
  row: ArchivedStoryRow,
  getClusterJson?: GetClusterJson
): Promise<StoryCluster> {
  const json = row.cluster_json ?? (getClusterJson ? await getClusterJson(row.id) : null);
  if (json == null) {
    throw new Error(`cluster_json missing for archived story ${row.id} and no R2 fallback resolved it`);
  }
  return JSON.parse(json) as StoryCluster;
}
