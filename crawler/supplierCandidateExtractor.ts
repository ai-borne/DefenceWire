/**
 * Autonomous Supplier Growth Pipeline — Extraction Stage (Phase 2.6)
 * Scans newly ingested wire stories for co-mentions of a known supplier and a
 * known strategic program, and drafts a candidate `program_suppliers` link.
 * Never writes to the live suppliers/program_suppliers tables — every
 * candidate lands in `supplier_candidates` with status='pending' for a human
 * reviewer (scripts/review-supplier-candidates.mjs) to promote or reject
 * (Root CLAUDE.md Rule 5: the "verified" claim is the entire Pillar B moat).
 *
 * Scope note (Rule 12, fail loud rather than fabricate): only `new_link`
 * candidates (existing supplier x existing program, not yet linked) are
 * extracted. Drafting a full new-supplier profile (HQ, tier, certifications)
 * or a capability/certification update from wire-story text alone is not
 * reliable enough to call "extraction" rather than invention, so those two
 * candidate_type values are reserved in the schema but not populated here —
 * carried forward in the implementation plan's Phase 2.6 notes.
 * Matching is deterministic keyword co-occurrence (mirrors
 * crawler/entityHarvester.ts), not a model call: this is the kind of
 * parsing/matching Rule 5 says belongs in code, not model judgment.
 * Hard limit: <= 300 LOC.
 */

import { StorySourceItem } from '../src/types/news.js';
import { SupplierProfile } from '../src/types/suppliers.js';
import { StrategicProgram } from '../src/types/programs.js';
import { D1RestConfig } from './archiveSync.js';
import { ALL_SUPPLIERS } from '../src/data/suppliers/seedSuppliers.js';
import { ALL_STRATEGIC_PROGRAMS } from '../src/data/strategicPrograms.js';

export interface SupplierCandidateRecord {
  id: string;
  candidateType: 'new_link';
  supplierId: string;
  supplierName: string;
  programId: string;
  subsystemName: string;
  sourceStoryId?: string;
  sourceDomains: string[];
  mentionCount: number;
  sourceCount: number;
  confidence: number;
  status: 'pending' | 'approved' | 'rejected';
  firstSeenAt: string;
  lastSeenAt: string;
}

interface NameMatcher {
  id: string;
  name: string;
  regex: RegExp;
}

function escapeForRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildNameMatchers<T>(
  items: readonly T[],
  getId: (item: T) => string,
  getNames: (item: T) => string[]
): NameMatcher[] {
  const matchers: NameMatcher[] = [];
  for (const item of items) {
    const id = getId(item);
    for (const name of getNames(item)) {
      const clean = (name || '').trim();
      if (clean.length < 3) continue;
      matchers.push({ id, name: clean, regex: new RegExp(`\\b${escapeForRegex(clean)}\\b`, 'i') });
    }
  }
  return matchers;
}

export function buildSupplierMatchers(suppliers: SupplierProfile[]): NameMatcher[] {
  return buildNameMatchers(
    suppliers,
    (s) => s.id,
    (s) => [s.name]
  );
}

export function buildProgramMatchers(programs: readonly StrategicProgram[]): NameMatcher[] {
  return buildNameMatchers(
    programs,
    (p) => p.id,
    (p) => [p.name, p.shortName, ...(p.searchAliases || [])]
  );
}

function alreadyLinked(supplier: SupplierProfile, programId: string): boolean {
  return supplier.linkedPrograms.some((link) => link.programId === programId);
}

export interface ExtractedCandidateDraft {
  supplierId: string;
  supplierName: string;
  programId: string;
  sourceDomain: string;
  sourceStoryId: string;
  seenAt: string;
}

/** Deterministic co-occurrence scan of a single story's title+snippet text. */
export function extractCandidateDraftsFromItem(
  item: StorySourceItem,
  supplierMatchers: NameMatcher[],
  programMatchers: NameMatcher[],
  suppliersById: Map<string, SupplierProfile>
): ExtractedCandidateDraft[] {
  const text = `${item.title} ${item.snippet || ''}`;
  const matchedSupplierIds = new Set(supplierMatchers.filter((m) => m.regex.test(text)).map((m) => m.id));
  const matchedProgramIds = new Set(programMatchers.filter((m) => m.regex.test(text)).map((m) => m.id));

  const drafts: ExtractedCandidateDraft[] = [];
  for (const supplierId of matchedSupplierIds) {
    const supplier = suppliersById.get(supplierId);
    if (!supplier) continue;
    for (const programId of matchedProgramIds) {
      if (alreadyLinked(supplier, programId)) continue;
      drafts.push({
        supplierId,
        supplierName: supplier.name,
        programId,
        sourceDomain: (item.sourceDomain || 'unknown').toLowerCase(),
        sourceStoryId: item.id,
        seenAt: item.publishedAt || new Date().toISOString()
      });
    }
  }
  return drafts;
}

export const CANDIDATE_MIN_MENTIONS_FOR_HIGH_CONFIDENCE = 3;
export const CANDIDATE_MIN_SOURCES_FOR_HIGH_CONFIDENCE = 2;

function candidateId(draft: { supplierId: string; programId: string }): string {
  return `new_link:${draft.supplierId}:${draft.programId}`;
}

function computeConfidence(mentionCount: number, sourceCount: number): number {
  const score = 0.3 + mentionCount * 0.15 + sourceCount * 0.1;
  return Math.round(Math.min(1, score) * 100) / 100;
}

/** Aggregates raw per-story drafts across a batch into deduped candidate records. */
export function aggregateSupplierCandidates(
  drafts: ExtractedCandidateDraft[],
  existingRecords: SupplierCandidateRecord[] = []
): SupplierCandidateRecord[] {
  const recordMap = new Map<string, SupplierCandidateRecord>();
  const domainsById = new Map<string, Set<string>>();

  for (const record of existingRecords) {
    recordMap.set(record.id, { ...record, sourceDomains: [...record.sourceDomains] });
    domainsById.set(record.id, new Set(record.sourceDomains));
  }

  for (const draft of drafts) {
    const id = candidateId(draft);
    const domainSet = domainsById.get(id) ?? new Set<string>();
    const isNewDomain = draft.sourceDomain !== 'unknown' && !domainSet.has(draft.sourceDomain);
    if (draft.sourceDomain !== 'unknown') domainSet.add(draft.sourceDomain);
    domainsById.set(id, domainSet);

    const existing = recordMap.get(id);
    if (existing) {
      if (existing.status !== 'pending') continue; // never re-aggregate over a reviewed decision
      existing.mentionCount += 1;
      existing.sourceCount = domainSet.size || existing.sourceCount;
      existing.sourceDomains = Array.from(domainSet);
      existing.lastSeenAt = draft.seenAt > existing.lastSeenAt ? draft.seenAt : existing.lastSeenAt;
      existing.confidence = computeConfidence(existing.mentionCount, existing.sourceCount);
      if (!existing.sourceStoryId) existing.sourceStoryId = draft.sourceStoryId;
      void isNewDomain;
    } else {
      recordMap.set(id, {
        id,
        candidateType: 'new_link',
        supplierId: draft.supplierId,
        supplierName: draft.supplierName,
        programId: draft.programId,
        subsystemName: 'Needs reviewer input',
        sourceStoryId: draft.sourceStoryId,
        sourceDomains: Array.from(domainSet),
        mentionCount: 1,
        sourceCount: domainSet.size,
        confidence: computeConfidence(1, domainSet.size),
        status: 'pending',
        firstSeenAt: draft.seenAt,
        lastSeenAt: draft.seenAt
      });
    }
  }

  return Array.from(recordMap.values());
}

export interface D1SupplierCandidateSyncResult {
  synced: number;
  failed: number;
}

export async function syncSupplierCandidatesToD1(
  records: SupplierCandidateRecord[],
  d1Config: D1RestConfig | null,
  options: { fetchFn?: typeof fetch } = {}
): Promise<D1SupplierCandidateSyncResult> {
  const pending = records.filter((r) => r.status === 'pending');
  if (!d1Config || pending.length === 0) {
    return { synced: 0, failed: 0 };
  }

  const fetchFn = options.fetchFn || globalThis.fetch;
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(
    d1Config.accountId
  )}/d1/database/${encodeURIComponent(d1Config.databaseId)}/query`;

  let synced = 0;
  let failed = 0;

  for (const rec of pending) {
    const sql = `INSERT INTO supplier_candidates (
      id, candidate_type, supplier_id, supplier_name, program_id, subsystem_name,
      payload_json, source_story_id, source_domains, mention_count, source_count,
      confidence, status, first_seen_at, last_seen_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      mention_count = excluded.mention_count,
      source_count = excluded.source_count,
      source_domains = excluded.source_domains,
      confidence = excluded.confidence,
      last_seen_at = excluded.last_seen_at
    WHERE supplier_candidates.status = 'pending';`;

    const params = [
      rec.id,
      rec.candidateType,
      rec.supplierId,
      rec.supplierName,
      rec.programId,
      rec.subsystemName,
      JSON.stringify(rec),
      rec.sourceStoryId || null,
      JSON.stringify(rec.sourceDomains),
      rec.mentionCount,
      rec.sourceCount,
      rec.confidence,
      rec.firstSeenAt,
      rec.lastSeenAt
    ];

    try {
      const res = await fetchFn(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${d1Config.apiToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql, params })
      });
      if (res.ok) {
        synced++;
      } else {
        failed++;
        console.error('[D1 SUPPLIER CANDIDATE SYNC FAIL]', `id=${rec.id} status=${res.status}`);
      }
    } catch (err) {
      failed++;
      console.error('[D1 SUPPLIER CANDIDATE SYNC ERROR]', `id=${rec.id}`, err instanceof Error ? err.message : String(err));
    }
  }

  return { synced, failed };
}

export interface SupplierCandidatePipelineResult {
  drafted: number;
  synced: number;
  failed: number;
}

/** Orchestrates the full extraction stage for one crawler run: matches, aggregates, syncs. */
export async function runSupplierCandidateExtraction(
  riverItems: StorySourceItem[],
  d1Config: D1RestConfig | null,
  options: { fetchFn?: typeof fetch } = {}
): Promise<SupplierCandidatePipelineResult> {
  const supplierMatchers = buildSupplierMatchers(ALL_SUPPLIERS);
  const programMatchers = buildProgramMatchers(ALL_STRATEGIC_PROGRAMS);
  const suppliersById = new Map(ALL_SUPPLIERS.map((s) => [s.id, s]));

  const drafts: ExtractedCandidateDraft[] = [];
  for (const item of riverItems) {
    drafts.push(...extractCandidateDraftsFromItem(item, supplierMatchers, programMatchers, suppliersById));
  }

  const aggregated = aggregateSupplierCandidates(drafts);
  const syncResult = await syncSupplierCandidatesToD1(aggregated, d1Config, options);
  return { drafted: aggregated.length, synced: syncResult.synced, failed: syncResult.failed };
}
