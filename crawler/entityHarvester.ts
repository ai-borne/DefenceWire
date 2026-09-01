/**
 * Closed-Loop Dynamic Entity Harvester
 * Collects candidate entities from AI screening and summarization, aggregates mentions
 * across distinct publisher domains, and promotes verified entities (>= 3 mentions, >= 2 domains)
 * into the crawler's active regex trie and Cloudflare D1 knowledge base.
 * Hard limit: <= 300 LOC.
 */

import { DomainCategory } from '../src/types/news.js';
import { MilitaryEntityConfig } from '../src/data/militaryEntities.js';
import { D1RestConfig } from './archiveSync.js';


export interface DiscoveredEntityRecord {
  id: string;
  name: string;
  pattern: string;
  category: DomainCategory;
  sourceCount: number;
  mentionCount: number;
  isPromoted: boolean;
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface EntityHarvestCandidate {
  name: string;
  category?: DomainCategory;
  sourceDomain: string;
  seenAt?: string;
}

export const PROMOTION_MIN_MENTIONS = 3;
export const PROMOTION_MIN_SOURCES = 2;

export const VALID_ENTITY_NAME_REGEX = /^[a-zA-Z0-9\s\-./()[\]]{3,60}$/;

export function isValidEntityName(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  if (trimmed.length < 3 || trimmed.length > 60) return false;
  return VALID_ENTITY_NAME_REGEX.test(trimmed);
}

export function slugifyEntityName(name: string): string {
  return (name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function escapeRegExpPattern(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const escapeRegex = escapeRegExpPattern;

export function buildEntityPatternString(name: string): string {
  const clean = (name || '').trim();
  if (!isValidEntityName(clean)) return '';
  const escaped = escapeRegExpPattern(clean);
  const patternWithVariations = escaped
    .replace(/-ii\b/i, '-?(ii|2)\\b')
    .replace(/-iii\b/i, '-?(iii|3)\\b')
    .replace(/-iv\b/i, '-?(iv|4)\\b')
    .replace(/-v\b/i, '-?(v|5)\\b');

  return `\\b${patternWithVariations}\\b`;
}

export function buildEntityRegex(patternStr: string): RegExp {
  if (!patternStr) return /(?!)/;
  try {
    return new RegExp(patternStr, 'i');
  } catch {
    return /(?!)/;
  }
}

export function aggregateEntityCandidates(
  candidates: EntityHarvestCandidate[],
  existingRecords: DiscoveredEntityRecord[] = [],
  now: string = new Date().toISOString()
): DiscoveredEntityRecord[] {
  const recordMap = new Map<string, DiscoveredEntityRecord>();
  const domainsBySlug = new Map<string, Set<string>>();

  for (const record of existingRecords) {
    if (!isValidEntityName(record.name)) continue;
    recordMap.set(record.id, { ...record });
    domainsBySlug.set(record.id, new Set());
  }

  for (const cand of candidates) {
    if (!cand.name || !isValidEntityName(cand.name)) continue;
    const cleanName = cand.name.trim();
    const slug = slugifyEntityName(cleanName);
    if (!slug) continue;

    const seenTime = cand.seenAt || now;
    const category = cand.category || 'tech';
    const domain = (cand.sourceDomain || 'unknown').toLowerCase();

    if (!domainsBySlug.has(slug)) {
      domainsBySlug.set(slug, new Set());
    }
    const domainSet = domainsBySlug.get(slug)!;
    if (domain && domain !== 'unknown') {
      domainSet.add(domain);
    }

    if (recordMap.has(slug)) {
      const existing = recordMap.get(slug)!;
      existing.mentionCount += 1;
      existing.sourceCount = Math.max(existing.sourceCount, domainSet.size || existing.sourceCount);
      existing.lastSeenAt = seenTime > existing.lastSeenAt ? seenTime : existing.lastSeenAt;
      if (category && existing.category === 'tech') {
        existing.category = category;
      }
      if (
        !existing.isPromoted &&
        existing.mentionCount >= PROMOTION_MIN_MENTIONS &&
        existing.sourceCount >= PROMOTION_MIN_SOURCES
      ) {
        existing.isPromoted = true;
      }
    } else {
      const isPromoted = 1 >= PROMOTION_MIN_MENTIONS && domainSet.size >= PROMOTION_MIN_SOURCES;
      const pattern = buildEntityPatternString(cleanName);
      if (!pattern) continue;

      recordMap.set(slug, {
        id: slug,
        name: cleanName,
        pattern,
        category,
        sourceCount: Math.max(1, domainSet.size),
        mentionCount: 1,
        isPromoted,
        firstSeenAt: seenTime,
        lastSeenAt: seenTime
      });
    }
  }

  return Array.from(recordMap.values());
}

export function getPromotedEntityConfigs(records: DiscoveredEntityRecord[]): MilitaryEntityConfig[] {
  return records
    .filter((r) => r.isPromoted && isValidEntityName(r.name) && r.pattern)
    .map((r) => ({
      name: r.name,
      pattern: buildEntityRegex(r.pattern),
      categories: [r.category]
    }));
}

export interface D1EntitySyncResult {
  synced: number;
  failed: number;
  promotedCount: number;
}

export async function syncDiscoveredEntitiesToD1(
  records: DiscoveredEntityRecord[],
  d1Config: D1RestConfig | null,
  options: { fetchFn?: typeof fetch } = {}
): Promise<D1EntitySyncResult> {
  const validRecords = records.filter((r) => isValidEntityName(r.name) && r.pattern);
  const promotedCount = validRecords.filter((r) => r.isPromoted).length;
  if (!d1Config || validRecords.length === 0) {
    return { synced: 0, failed: 0, promotedCount };
  }

  const fetchFn = options.fetchFn || globalThis.fetch;
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(
    d1Config.accountId
  )}/d1/database/${encodeURIComponent(d1Config.databaseId)}/query`;

  let synced = 0;
  let failed = 0;

  for (const rec of validRecords) {
    const sql = `INSERT INTO discovered_entities (
      id, name, pattern, category, source_count, mention_count, is_promoted, first_seen_at, last_seen_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      source_count = excluded.source_count,
      mention_count = excluded.mention_count,
      is_promoted = excluded.is_promoted,
      last_seen_at = excluded.last_seen_at;`;

    const params = [
      rec.id,
      rec.name,
      rec.pattern,
      rec.category,
      rec.sourceCount,
      rec.mentionCount,
      rec.isPromoted ? 1 : 0,
      rec.firstSeenAt,
      rec.lastSeenAt
    ];

    try {
      const res = await fetchFn(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${d1Config.apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sql, params })
      });

      if (res.ok) {
        synced++;
      } else {
        failed++;
        console.error('[D1 ENTITY SYNC FAIL]', `id=${rec.id} status=${res.status}`);
      }
    } catch (err) {
      failed++;
      console.error('[D1 ENTITY SYNC ERROR]', `id=${rec.id}`, err instanceof Error ? err.message : String(err));
    }
  }

  return { synced, failed, promotedCount };
}
