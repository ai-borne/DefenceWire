import { describe, expect, it, vi } from 'vitest';
import {
  buildSupplierMatchers,
  buildProgramMatchers,
  extractCandidateDraftsFromItem,
  aggregateSupplierCandidates,
  syncSupplierCandidatesToD1,
  runSupplierCandidateExtraction,
  SupplierCandidateRecord,
  ExtractedCandidateDraft
} from '../../crawler/supplierCandidateExtractor.js';
import { ALL_SUPPLIERS } from '../../src/data/suppliers/seedSuppliers.js';
import { ALL_STRATEGIC_PROGRAMS } from '../../src/data/strategicPrograms.js';
import { StorySourceItem } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';

function makeItem(overrides: Partial<StorySourceItem>): StorySourceItem {
  return {
    id: 'story-1',
    title: '',
    url: 'https://example.com/story',
    sourceName: 'Example Wire',
    sourceDomain: 'example.com',
    tier: 'tier1' as SourceTier,
    publishedAt: '2026-09-01T00:00:00.000Z',
    ...overrides
  };
}

describe('Supplier Candidate Extraction Pipeline (Phase 2.6)', () => {
  const supplierMatchers = buildSupplierMatchers(ALL_SUPPLIERS);
  const programMatchers = buildProgramMatchers(ALL_STRATEGIC_PROGRAMS);
  const suppliersById = new Map(ALL_SUPPLIERS.map((s) => [s.id, s]));

  it('does not draft a candidate for a supplier/program pair that is already a verified link', () => {
    const linkedSupplier = ALL_SUPPLIERS.find((s) => s.linkedPrograms.length > 0);
    expect(linkedSupplier).toBeDefined();
    const link = linkedSupplier!.linkedPrograms[0]!;
    const program = ALL_STRATEGIC_PROGRAMS.find((p) => p.id === link.programId);
    expect(program).toBeDefined();

    const item = makeItem({ title: `${linkedSupplier!.name} continues work on ${program!.name}` });
    const drafts = extractCandidateDraftsFromItem(item, supplierMatchers, programMatchers, suppliersById);
    expect(drafts.find((d) => d.supplierId === linkedSupplier!.id && d.programId === program!.id)).toBeUndefined();
  });

  it('drafts a new_link candidate when a known supplier and an unlinked known program co-occur in text', () => {
    const supplier = ALL_SUPPLIERS[0]!;
    const unlinkedProgram = ALL_STRATEGIC_PROGRAMS.find(
      (p) => !supplier.linkedPrograms.some((l) => l.programId === p.id)
    );
    expect(unlinkedProgram).toBeDefined();

    const item = makeItem({
      title: `${supplier.name} wins new contract for ${unlinkedProgram!.name} subsystems`,
      sourceDomain: 'newswire.example'
    });
    const drafts = extractCandidateDraftsFromItem(item, supplierMatchers, programMatchers, suppliersById);
    expect(drafts).toContainEqual({
      supplierId: supplier.id,
      supplierName: supplier.name,
      programId: unlinkedProgram!.id,
      sourceDomain: 'newswire.example',
      sourceStoryId: 'story-1',
      seenAt: '2026-09-01T00:00:00.000Z'
    });
  });

  it('aggregates repeat drafts across stories, raising confidence with mentions and distinct sources', () => {
    const draft: ExtractedCandidateDraft = {
      supplierId: 'sup-x',
      supplierName: 'Supplier X',
      programId: 'prog-y',
      sourceDomain: 'wire-a.com',
      sourceStoryId: 'story-a',
      seenAt: '2026-09-01T00:00:00.000Z'
    };
    const second: ExtractedCandidateDraft = { ...draft, sourceDomain: 'wire-b.com', sourceStoryId: 'story-b', seenAt: '2026-09-02T00:00:00.000Z' };

    const firstPass = aggregateSupplierCandidates([draft]);
    expect(firstPass).toHaveLength(1);
    expect(firstPass[0]!.mentionCount).toBe(1);
    expect(firstPass[0]!.sourceCount).toBe(1);

    const secondPass = aggregateSupplierCandidates([second], firstPass);
    expect(secondPass).toHaveLength(1);
    expect(secondPass[0]!.mentionCount).toBe(2);
    expect(secondPass[0]!.sourceCount).toBe(2);
    expect(secondPass[0]!.confidence).toBeGreaterThan(firstPass[0]!.confidence);
    expect(secondPass[0]!.lastSeenAt).toBe('2026-09-02T00:00:00.000Z');
  });

  it('never re-aggregates over a candidate a human has already reviewed', () => {
    const reviewed: SupplierCandidateRecord = {
      id: 'new_link:sup-x:prog-y',
      candidateType: 'new_link',
      supplierId: 'sup-x',
      supplierName: 'Supplier X',
      programId: 'prog-y',
      subsystemName: 'Needs reviewer input',
      sourceDomains: ['wire-a.com'],
      mentionCount: 1,
      sourceCount: 1,
      confidence: 0.4,
      status: 'approved',
      firstSeenAt: '2026-09-01T00:00:00.000Z',
      lastSeenAt: '2026-09-01T00:00:00.000Z'
    };
    const newDraft: ExtractedCandidateDraft = {
      supplierId: 'sup-x',
      supplierName: 'Supplier X',
      programId: 'prog-y',
      sourceDomain: 'wire-c.com',
      sourceStoryId: 'story-c',
      seenAt: '2026-09-03T00:00:00.000Z'
    };
    const result = aggregateSupplierCandidates([newDraft], [reviewed]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(reviewed);
  });

  it('never syncs to D1 without a configured account (fails closed, not silently)', async () => {
    const record: SupplierCandidateRecord = {
      id: 'new_link:sup-x:prog-y',
      candidateType: 'new_link',
      supplierId: 'sup-x',
      supplierName: 'Supplier X',
      programId: 'prog-y',
      subsystemName: 'Needs reviewer input',
      sourceDomains: ['wire-a.com'],
      mentionCount: 1,
      sourceCount: 1,
      confidence: 0.4,
      status: 'pending',
      firstSeenAt: '2026-09-01T00:00:00.000Z',
      lastSeenAt: '2026-09-01T00:00:00.000Z'
    };
    const result = await syncSupplierCandidatesToD1([record], null);
    expect(result).toEqual({ synced: 0, failed: 0 });
  });

  it('syncs pending candidates to D1 via REST and reports failures without throwing', async () => {
    const record: SupplierCandidateRecord = {
      id: 'new_link:sup-x:prog-y',
      candidateType: 'new_link',
      supplierId: 'sup-x',
      supplierName: 'Supplier X',
      programId: 'prog-y',
      subsystemName: 'Needs reviewer input',
      sourceDomains: ['wire-a.com'],
      mentionCount: 1,
      sourceCount: 1,
      confidence: 0.4,
      status: 'pending',
      firstSeenAt: '2026-09-01T00:00:00.000Z',
      lastSeenAt: '2026-09-01T00:00:00.000Z'
    };
    const fetchFn = vi.fn().mockResolvedValueOnce({ ok: true } as Response).mockResolvedValueOnce({ ok: false, status: 500 } as Response);
    const config = { accountId: 'acc', databaseId: 'db', apiToken: 'tok' };

    const okResult = await syncSupplierCandidatesToD1([record], config, { fetchFn });
    expect(okResult).toEqual({ synced: 1, failed: 0 });

    const failResult = await syncSupplierCandidatesToD1([record], config, { fetchFn });
    expect(failResult).toEqual({ synced: 0, failed: 1 });
  });

  it('orchestrates extraction end-to-end via runSupplierCandidateExtraction', async () => {
    const supplier = ALL_SUPPLIERS[0]!;
    const unlinkedProgram = ALL_STRATEGIC_PROGRAMS.find(
      (p) => !supplier.linkedPrograms.some((l) => l.programId === p.id)
    )!;
    const item = makeItem({ title: `${supplier.name} announces partnership on ${unlinkedProgram.name}` });
    const fetchFn = vi.fn().mockResolvedValue({ ok: true } as Response);
    const config = { accountId: 'acc', databaseId: 'db', apiToken: 'tok' };

    const result = await runSupplierCandidateExtraction([item], config, { fetchFn });
    expect(result.drafted).toBeGreaterThanOrEqual(1);
    expect(result.synced).toBe(result.drafted);
    expect(result.failed).toBe(0);
  });
});
