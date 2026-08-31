/**
 * Entity Dossier Handler
 * Pure, edge-agnostic handler for retrieving complete platform/system dossiers from D1.
 * Returns entity specifications, promotion state, first/last seen milestones, and related story clusters.
 * Hard limit: <= 300 LOC.
 */

import { StoryCluster } from '../types/news.js';
import { GetClusterJson, ArchiveBindingUnavailableError } from '../archive/archiveRow.js';

/**
 * Escapes SQLite LIKE wildcard characters (`%` and `_`) and the escape character itself
 * so that user-supplied input does not trigger full table scans or unintended pattern matches.
 */
export function escapeSqlLikePattern(input: string, escapeChar: string = '\\'): string {
  if (!input) return '';
  return input
    .replace(new RegExp(`\\${escapeChar}`, 'g'), `${escapeChar}${escapeChar}`)
    .replace(/%/g, `${escapeChar}%`)
    .replace(/_/g, `${escapeChar}_`);
}

export interface DiscoveredEntityDbRow {
  id: string;
  name: string;
  pattern: string;
  category: string;
  source_count: number;
  mention_count: number;
  is_promoted: number;
  first_seen_at: string;
  last_seen_at: string;
}

export interface EntityDossierResponse {
  entity: {
    id: string;
    name: string;
    category: string;
    sourceCount: number;
    mentionCount: number;
    isPromoted: boolean;
    firstSeenAt: string;
    lastSeenAt: string;
  } | null;
  relatedStories: StoryCluster[];
  error?: string;
}

export interface EntityDossierDatabaseAdapter {
  queryEntity: (slug: string) => Promise<DiscoveredEntityDbRow | null>;
  queryRelatedStories: (slug: string, limit?: number) => Promise<{ id: string; cluster_json: string | null }[]>;
  getClusterJson?: GetClusterJson;
}

export async function handleEntityDossierRequest(
  slug: string,
  db: EntityDossierDatabaseAdapter
): Promise<EntityDossierResponse> {
  const cleanSlug = (slug || '').trim().toLowerCase();
  if (!cleanSlug) {
    return { entity: null, relatedStories: [], error: 'Entity slug is required.' };
  }

  try {
    const entityRow = await db.queryEntity(cleanSlug);
    const storyRows = await db.queryRelatedStories(cleanSlug, 20);

    const relatedStories: StoryCluster[] = [];
    const seenIds = new Set<string>();
    const seenHeadlines = new Set<string>();

    for (const row of storyRows) {
      try {
        const json = row.cluster_json ?? (db.getClusterJson ? await db.getClusterJson(row.id) : null);
        if (json == null) throw new Error(`cluster_json missing for related story ${row.id}`);
        const parsed = JSON.parse(json) as StoryCluster;
        if (parsed && parsed.id) {
          const normHeadline = (parsed.synthesizedHeadline || '').trim().toLowerCase();
          if (!seenIds.has(parsed.id) && (!normHeadline || !seenHeadlines.has(normHeadline))) {
            seenIds.add(parsed.id);
            if (normHeadline) seenHeadlines.add(normHeadline);
            relatedStories.push(parsed);
          }
        }
      } catch (err) {
        if (err instanceof ArchiveBindingUnavailableError) throw err;
        // Skip unparseable legacy row
      }
    }

    if (!entityRow && relatedStories.length === 0) {
      return { entity: null, relatedStories: [], error: 'Entity not found.' };
    }

    const firstStoryCategory = relatedStories[0]?.categories?.[0] || 'strategic';

    const entityData = entityRow
      ? {
          id: entityRow.id,
          name: entityRow.name,
          category: entityRow.category,
          sourceCount: entityRow.source_count,
          mentionCount: Math.max(entityRow.mention_count, relatedStories.length),
          isPromoted: Boolean(entityRow.is_promoted),
          firstSeenAt: entityRow.first_seen_at,
          lastSeenAt: entityRow.last_seen_at
        }
      : {
          id: cleanSlug,
          name: cleanSlug.toUpperCase(),
          category: firstStoryCategory,
          sourceCount: 1,
          mentionCount: relatedStories.length,
          isPromoted: true,
          firstSeenAt: relatedStories[0]?.createdAt || new Date().toISOString(),
          lastSeenAt: relatedStories[0]?.updatedAt || new Date().toISOString()
        };


    return {
      entity: entityData,
      relatedStories
    };
  } catch (err) {
    return {
      entity: null,
      relatedStories: [],
      error: err instanceof Error ? err.message : 'Internal database error.'
    };
  }
}
