/**
 * Unit Tests for Story Thread Continuity Engine (Phase 1)
 * Verifies ground-truth chronological sorting of out-of-order events,
 * sequential sequence codes (x1.1.1 -> x1.1.2), dormant thread reactivation,
 * and multi-program branch splitting.
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
    categories: ['airforce'],
    entities: ['Tejas Mk1A', 'HAL', 'IAF'],
    programTags: ['tejas-mk1a'],
    defenceScore: 85,
    isLeadStory: false,
    createdAt: publishedAt,
    updatedAt: publishedAt,
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
    const existingThread: StoryThread = {
      id: 'th_tejas-mk1a',
      title: 'Tejas Mk1A Development & Delivery Arc',
      canonicalEntity: 'tejas-mk1a',
      category: 'airforce',
      status: 'active',
      eventCount: 1,
      firstEventAt: '2026-07-01T00:00:00Z',
      lastEventAt: '2026-07-01T00:00:00Z',
      createdAt: '2026-07-01T00:00:00Z',
      updatedAt: '2026-07-01T00:00:00Z'
    };

    const existingEvent: StoryThreadEvent = {
      id: 'ev_1',
      threadId: 'th_tejas-mk1a',
      clusterId: 'cluster-tejas-first',
      sequenceCode: 'x1.1.1',
      sequenceIndex: 1,
      headline: 'HAL begins ground runs of first production Tejas Mk1A',
      deltaSummary: 'First production aircraft rolls out',
      primarySourceName: 'Livefist',
      primarySourceUrl: 'https://livefistdefence.com/tejas-1',
      publishedAt: '2026-07-01T00:00:00Z',
      entities: ['Tejas Mk1A'],
      createdAt: '2026-07-01T00:00:00Z'
    };

    const newCluster = createMockCluster({
      id: 'cluster-tejas-second',
      synthesizedHeadline: 'IAF formally takes delivery of lead Tejas Mk1A squadron jet',
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
    const evLate: StoryThreadEvent = {
      id: 'ev_late',
      threadId: 'th_amca',
      clusterId: 'cluster_late',
      sequenceCode: 'x1.1.1',
      sequenceIndex: 1,
      headline: 'Cabinet Committee on Security approves AMCA Prototype fund',
      deltaSummary: 'CCS approval granted',
      primarySourceName: 'ANI',
      primarySourceUrl: 'https://ani.in/amca-late',
      publishedAt: '2026-09-01T00:00:00Z',
      entities: ['AMCA'],
      createdAt: '2026-09-01T00:00:00Z'
    };

    const evEarly: StoryThreadEvent = {
      id: 'ev_early',
      threadId: 'th_amca',
      clusterId: 'cluster_early',
      sequenceCode: 'x1.1.1',
      sequenceIndex: 1,
      headline: 'ADA completes critical design review for AMCA stealth fighter',
      deltaSummary: 'CDR completed',
      primarySourceName: 'PIB',
      primarySourceUrl: 'https://pib.gov.in/amca-early',
      publishedAt: '2026-06-01T00:00:00Z',
      entities: ['AMCA'],
      createdAt: '2026-06-01T00:00:00Z'
    };

    const indexed = sortAndIndexEvents([evLate, evEarly]);
    expect(indexed[0]?.id).toBe('ev_early');
    expect(indexed[0]?.sequenceCode).toBe('x1.1.1');
    expect(indexed[0]?.sequenceIndex).toBe(1);

    expect(indexed[1]?.id).toBe('ev_late');
    expect(indexed[1]?.sequenceCode).toBe('x1.1.2');
    expect(indexed[1]?.sequenceIndex).toBe(2);
  });

  it('reactivates dormant threads after 60+ days of silence when matching cluster arrives', () => {
    const dormantThread: StoryThread = {
      id: 'th_pinaka-er',
      title: 'Pinaka ER Guided Rocket System',
      canonicalEntity: 'pinaka-er',
      category: 'army',
      status: 'dormant',
      eventCount: 3,
      firstEventAt: '2026-01-01T00:00:00Z',
      lastEventAt: '2026-02-01T00:00:00Z', // > 180 days ago
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-02-01T00:00:00Z'
    };

    const newCluster = createMockCluster({
      id: 'cluster-pinaka-new',
      synthesizedHeadline: 'Indian Army orders 6 additional Pinaka regiments after Pokhran trials',
      entities: ['Pinaka-ER', 'DRDO', 'Tata Advanced Systems'],
      programTags: ['pinaka-er'],
      primarySource: {
        id: 'src-pinaka',
        title: 'Pinaka Regiment Order',
        url: 'https://mod.gov.in/pinaka-order',
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
    const thread1: StoryThread = {
      id: 'th_tejas-mk1a',
      title: 'Tejas Mk1A Track',
      canonicalEntity: 'tejas-mk1a',
      category: 'airforce',
      status: 'active',
      eventCount: 1,
      firstEventAt: '2026-05-01T00:00:00Z',
      lastEventAt: '2026-05-01T00:00:00Z',
      createdAt: '2026-05-01T00:00:00Z',
      updatedAt: '2026-05-01T00:00:00Z'
    };

    const thread2: StoryThread = {
      id: 'th_amca-stealth',
      title: 'AMCA Stealth Fighter Track',
      canonicalEntity: 'amca-stealth',
      category: 'airforce',
      status: 'active',
      eventCount: 1,
      firstEventAt: '2026-05-01T00:00:00Z',
      lastEventAt: '2026-05-01T00:00:00Z',
      createdAt: '2026-05-01T00:00:00Z',
      updatedAt: '2026-05-01T00:00:00Z'
    };

    const jointCluster = createMockCluster({
      id: 'cluster-joint-iaf',
      synthesizedHeadline: 'DAC clears indigenous avionics upgrade package across Tejas Mk1A and AMCA programs',
      entities: ['Tejas Mk1A', 'AMCA', 'DRDO'],
      programTags: ['tejas-mk1a', 'amca-stealth'],
      primarySource: {
        id: 'src-joint',
        title: 'DAC Package',
        url: 'https://pib.gov.in/dac-joint',
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
    expect(ev1).toBeDefined();
    expect(ev2).toBeDefined();
    expect(ev1?.sequenceCode).toBe('x1.1.1');
    expect(ev2?.sequenceCode).toBe('x1.2.1'); // Subbranch sequence code for secondary linked program
  });

  it('prevents attaching duplicate events for the same clusterId', () => {
    const thread: StoryThread = {
      id: 'th_rudram-ii',
      title: 'Rudram-II Anti-Radiation Missile',
      canonicalEntity: 'rudram-ii',
      category: 'airforce',
      status: 'active',
      eventCount: 1,
      firstEventAt: '2026-08-01T00:00:00Z',
      lastEventAt: '2026-08-01T00:00:00Z',
      createdAt: '2026-08-01T00:00:00Z',
      updatedAt: '2026-08-01T00:00:00Z'
    };

    const existingEvent: StoryThreadEvent = {
      id: 'ev_existing',
      threadId: 'th_rudram-ii',
      clusterId: 'cluster-rudram-1',
      sequenceCode: 'x1.1.1',
      sequenceIndex: 1,
      headline: 'IAF successfully test fires Rudram-II from Su-30MKI',
      deltaSummary: 'Test fire successful',
      primarySourceName: 'PIB',
      primarySourceUrl: 'https://pib.gov.in/rudram',
      publishedAt: '2026-08-01T00:00:00Z',
      entities: ['Rudram-II'],
      createdAt: '2026-08-01T00:00:00Z'
    };

    const duplicateCluster = createMockCluster({
      id: 'cluster-rudram-1',
      programTags: ['rudram-ii']
    });

    const result = matchAndAdvanceThreads([duplicateCluster], [thread], [existingEvent]);
    expect(result.attachedCount).toBe(0);
    expect(result.events).toHaveLength(1);
  });
});
