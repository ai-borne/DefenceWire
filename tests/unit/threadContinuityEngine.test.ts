/**
 * Unit Tests for Story Thread Continuity Engine (Phase 1 & 2)
 * Verifies chronological lineage, sequence indexing (x1.1.1 -> x1.1.2),
 * category-calibrated titles, stop-tag suppression, and branch splitting.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect } from 'vitest';
import { StoryCluster } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';
import { StoryThread, StoryThreadEvent } from '../../src/types/threads.js';
import {
  matchAndAdvanceThreads,
  sortAndIndexEvents
} from '../../crawler/threadContinuityEngine.js';

function createMockCluster(overrides: Partial<StoryCluster> = {}): StoryCluster {
  const id = overrides.id ?? 'cluster-1';
  const publishedAt = overrides.primarySource?.publishedAt ?? '2026-08-01T10:00:00Z';
  return {
    id,
    synthesizedHeadline: overrides.synthesizedHeadline ?? 'MoD signs contract for Tejas Mk1A fighters',
    primarySource: {
      id: `src-${id}`,
      title: 'PIB Release',
      url: `https://pib.gov.in/${id}`,
      sourceName: 'PIB MoD',
      sourceDomain: 'pib.gov.in',
      tier: SourceTier.TIER_1_OFFICIAL,
      publishedAt
    },
    relatedCoverage: [],
    discussions: [],
    categories: overrides.categories ?? ['airforce'],
    entities: overrides.entities ?? ['Tejas Mk1A', 'HAL', 'IAF'],
    programTags: overrides.programTags,
    defenceScore: 85,
    isLeadStory: false,
    createdAt: publishedAt,
    updatedAt: publishedAt,
    ...overrides
  };
}

function createMockThread(id: string, entity: string, overrides: Partial<StoryThread> = {}): StoryThread {
  return {
    id,
    title: `${entity} Track`,
    canonicalEntity: entity,
    category: 'airforce',
    status: 'active',
    eventCount: 1,
    firstEventAt: '2026-07-01T00:00:00Z',
    lastEventAt: '2026-07-01T00:00:00Z',
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
    ...overrides
  };
}

function createMockEvent(id: string, threadId: string, clusterId: string, overrides: Partial<StoryThreadEvent> = {}): StoryThreadEvent {
  return {
    id,
    threadId,
    clusterId,
    sequenceCode: 'x1.1.1',
    sequenceIndex: 1,
    headline: 'Headline',
    deltaSummary: 'Delta',
    primarySourceName: 'PIB MoD',
    primarySourceUrl: 'https://pib.gov.in',
    publishedAt: '2026-07-01T00:00:00Z',
    entities: ['Tejas Mk1A'],
    createdAt: '2026-07-01T00:00:00Z',
    ...overrides
  };
}

describe('Story Thread Continuity Engine', () => {
  it('spawns a new thread when incoming cluster has no existing match', () => {
    const cluster = createMockCluster({
      id: 'cluster-zorawar-1',
      synthesizedHeadline: 'DRDO commences user trials for Zorawar light tank',
      entities: ['Zorawar', 'DRDO', 'Indian Army'],
      programTags: ['zorawar-tank'],
      categories: ['army']
    });

    const result = matchAndAdvanceThreads([cluster], [], []);
    expect(result.newlySpawnedCount).toBe(1);
    expect(result.threads).toHaveLength(1);
    expect(result.threads[0]?.canonicalEntity).toBe('zorawar-tank');
    expect(result.threads[0]?.status).toBe('active');
    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.sequenceCode).toBe('x1.1.1');
    expect(result.events[0]?.sequenceIndex).toBe(1);
  });

  it('attaches incoming matching cluster to existing active thread in chronological order', () => {
    const existingThread = createMockThread('th_tejas-mk1a', 'tejas-mk1a', {
      title: 'Tejas Mk1A Development & Delivery Arc'
    });
    const existingEvent = createMockEvent('ev_1', 'th_tejas-mk1a', 'cluster-tejas-first');
    const newCluster = createMockCluster({
      id: 'cluster-tejas-second',
      primarySource: {
        id: 'src-2',
        title: 'IAF Delivery',
        url: 'https://pib.gov.in/tejas-delivery',
        sourceName: 'PIB MoD',
        sourceDomain: 'pib.gov.in',
        tier: SourceTier.TIER_1_OFFICIAL,
        publishedAt: '2026-08-15T12:00:00Z'
      },
      programTags: ['tejas-mk1a']
    });

    const result = matchAndAdvanceThreads([newCluster], [existingThread], [existingEvent]);
    expect(result.attachedCount).toBe(1);
    expect(result.newlySpawnedCount).toBe(0);
    expect(result.threads[0]?.eventCount).toBe(2);
    expect(result.threads[0]?.lastEventAt).toBe('2026-08-15T12:00:00Z');

    const threadEvents = result.events.filter((e) => e.threadId === 'th_tejas-mk1a');
    expect(threadEvents).toHaveLength(2);
    expect(threadEvents[0]?.sequenceCode).toBe('x1.1.1');
    expect(threadEvents[1]?.sequenceCode).toBe('x1.1.2');
    expect(threadEvents[1]?.sequenceIndex).toBe(2);
  });

  it('sorts out-of-order events strictly by ground-truth published date and assigns sequence codes', () => {
    const evLate = createMockEvent('ev_late', 'th_amca', 'cluster_late', {
      publishedAt: '2026-09-01T00:00:00Z'
    });
    const evEarly = createMockEvent('ev_early', 'th_amca', 'cluster_early', {
      publishedAt: '2026-06-01T00:00:00Z'
    });

    const indexed = sortAndIndexEvents([evLate, evEarly]);
    expect(indexed[0]?.id).toBe('ev_early');
    expect(indexed[0]?.sequenceCode).toBe('x1.1.1');
    expect(indexed[0]?.sequenceIndex).toBe(1);
    expect(indexed[1]?.id).toBe('ev_late');
    expect(indexed[1]?.sequenceCode).toBe('x1.1.2');
    expect(indexed[1]?.sequenceIndex).toBe(2);
  });

  it('reactivates dormant threads after 60+ days of silence when matching cluster arrives', () => {
    const dormantThread = createMockThread('th_pinaka-er', 'pinaka-er', {
      category: 'army',
      status: 'dormant',
      firstEventAt: '2026-01-01T00:00:00Z',
      lastEventAt: '2026-02-01T00:00:00Z'
    });
    const newCluster = createMockCluster({
      id: 'cluster-pinaka-new',
      entities: ['Pinaka-ER', 'DRDO'],
      programTags: ['pinaka-er'],
      primarySource: {
        id: 'src-pinaka',
        title: 'Pinaka Order',
        url: 'https://mod.gov.in/pinaka',
        sourceName: 'PIB MoD',
        sourceDomain: 'mod.gov.in',
        tier: SourceTier.TIER_1_OFFICIAL,
        publishedAt: '2026-09-01T10:00:00Z'
      }
    });

    const now = () => new Date('2026-09-02T00:00:00Z');
    const result = matchAndAdvanceThreads([newCluster], [dormantThread], [], { now });
    expect(result.reactivatedCount).toBe(1);
    expect(result.threads[0]?.status).toBe('active');
    expect(result.threads[0]?.lastEventAt).toBe('2026-09-01T10:00:00Z');
  });

  it('splits branches when a single cluster addresses multiple strategic programs', () => {
    const thread1 = createMockThread('th_tejas-mk1a', 'tejas-mk1a');
    const thread2 = createMockThread('th_amca-stealth', 'amca-stealth');
    const jointCluster = createMockCluster({
      id: 'cluster-joint-iaf',
      entities: ['Tejas Mk1A', 'AMCA'],
      programTags: ['tejas-mk1a', 'amca-stealth'],
      primarySource: {
        id: 'src-joint',
        title: 'DAC Package',
        url: 'https://pib.gov.in/dac',
        sourceName: 'PIB MoD',
        sourceDomain: 'pib.gov.in',
        tier: SourceTier.TIER_1_OFFICIAL,
        publishedAt: '2026-09-05T08:00:00Z'
      }
    });

    const result = matchAndAdvanceThreads([jointCluster], [thread1, thread2], []);
    expect(result.attachedCount).toBe(2);

    const ev1 = result.events.find((e) => e.threadId === 'th_tejas-mk1a');
    const ev2 = result.events.find((e) => e.threadId === 'th_amca-stealth');
    expect(ev1?.sequenceCode).toBe('x1.1.1');
    expect(ev2?.sequenceCode).toBe('x1.2.1');
  });

  it('prevents attaching duplicate events for the same clusterId', () => {
    const thread = createMockThread('th_rudram-ii', 'rudram-ii');
    const existingEvent = createMockEvent('ev_existing', 'th_rudram-ii', 'cluster-rudram-1');
    const duplicateCluster = createMockCluster({
      id: 'cluster-rudram-1',
      programTags: ['rudram-ii']
    });

    const result = matchAndAdvanceThreads([duplicateCluster], [thread], [existingEvent]);
    expect(result.attachedCount).toBe(0);
    expect(result.events).toHaveLength(1);
  });

  it('spawns separate threads with category-calibrated titles for #Su57, #Apache, #TASL, and #EOS05', () => {
    const su57Cluster = createMockCluster({
      id: 'cluster-su57',
      primaryTag: '#Su57',
      hashtags: ['#Su57'],
      categories: ['airforce'],
      entities: []
    });
    const apacheCluster = createMockCluster({
      id: 'cluster-apache',
      primaryTag: '#Apache',
      hashtags: ['#Apache'],
      categories: ['army'],
      entities: []
    });
    const taslCluster = createMockCluster({
      id: 'cluster-tasl',
      primaryTag: '#TASL',
      hashtags: ['#TASL'],
      categories: ['procurement'],
      entities: []
    });
    const eos05Cluster = createMockCluster({
      id: 'cluster-eos05',
      primaryTag: '#EOS05',
      hashtags: ['#EOS05'],
      categories: ['tech'],
      entities: []
    });

    const res = matchAndAdvanceThreads([su57Cluster, apacheCluster, taslCluster, eos05Cluster], [], []);
    expect(res.newlySpawnedCount).toBe(4);

    const su57 = res.threads.find((t) => t.id === 'th_su-57');
    expect(su57).toBeDefined();
    expect(su57?.title).toBe('Su57 Operational & Strategic Arc');
    expect(su57?.category).toBe('airforce');

    const apache = res.threads.find((t) => t.id === 'th_apache');
    expect(apache).toBeDefined();
    expect(apache?.title).toBe('Apache Operational & Strategic Arc');
    expect(apache?.category).toBe('army');

    const tasl = res.threads.find((t) => t.id === 'th_tasl');
    expect(tasl).toBeDefined();
    expect(tasl?.title).toBe('TASL Acquisition & Delivery Arc');
    expect(tasl?.category).toBe('procurement');

    const eos05 = res.threads.find((t) => t.id === 'th_eos-05');
    expect(eos05).toBeDefined();
    expect(eos05?.title).toBe('EOS05 Technology & Systems Arc');
    expect(eos05?.category).toBe('tech');
  });

  it('rejects generic news and defence stop-tags from spawning threads', () => {
    const genericCluster = createMockCluster({
      id: 'cluster-generic-noise',
      primaryTag: '#News',
      hashtags: ['#Defence', '#India', '#Security', '#Update'],
      entities: ['India', 'Defence'],
      programTags: []
    });

    const res = matchAndAdvanceThreads([genericCluster], [], []);
    expect(res.newlySpawnedCount).toBe(0);
    expect(res.threads).toHaveLength(0);
    expect(res.events).toHaveLength(0);
  });
});
