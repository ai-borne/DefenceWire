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
  cluster_json: string;
  archived_at: string;
}

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
    cluster_json: JSON.stringify(cluster),
    archived_at: archivedAt
  };
}

export function fromArchivedStoryRow(row: ArchivedStoryRow): StoryCluster {
  return JSON.parse(row.cluster_json) as StoryCluster;
}
