/**
 * Entity Dossier Handler
 * Pure, edge-agnostic handler for retrieving complete platform/system dossiers from D1.
 * Returns entity specifications, promotion state, first/last seen milestones, and related story clusters.
 * Hard limit: <= 300 LOC.
 */

import { StoryCluster } from '../types/news.js';

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
  queryRelatedStories: (slug: string, limit?: number) => Promise<{ cluster_json: string }[]>;
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
    for (const row of storyRows) {
      try {
        const parsed = JSON.parse(row.cluster_json) as StoryCluster;
        if (parsed && parsed.id) {
          relatedStories.push(parsed);
        }
      } catch {
        // Skip unparseable legacy row
      }
    }

    if (!entityRow && relatedStories.length === 0) {
      return { entity: null, relatedStories: [], error: 'Entity not found.' };
    }

    const entityData = entityRow
      ? {
          id: entityRow.id,
          name: entityRow.name,
          category: entityRow.category,
          sourceCount: entityRow.source_count,
          mentionCount: entityRow.mention_count,
          isPromoted: Boolean(entityRow.is_promoted),
          firstSeenAt: entityRow.first_seen_at,
          lastSeenAt: entityRow.last_seen_at
        }
      : {
          id: cleanSlug,
          name: cleanSlug.toUpperCase(),
          category: 'strategic',
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
