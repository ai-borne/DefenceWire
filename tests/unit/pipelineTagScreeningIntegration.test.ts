/**
 * End-to-End Pipeline Tag Screening & Thread Continuity Integration Tests (Phase 5)
 * Simulates ingestion of Black Jet, HAL LUH, and genuine LAC border talks.
 * Verifies that the 3-Tier screening cascade and continuity engine prevent false attachments.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { StoryCluster, StorySourceItem } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';
import { StoryThread, StoryThreadEvent } from '../../src/types/threads.js';
import { screenClusterTags } from '../../crawler/tagScreening.js';
import { clearCFAIMemoryCache } from '../../crawler/cloudflareAI.js';
import {
  matchAndAdvanceThreads,
  scoreMatch,
  auditThreadCoherence
} from '../../crawler/threadContinuityEngine.js';

function createMockCluster(params: {
  id: string;
  headline: string;
  snippet: string;
  primaryTag?: string;
  hashtags?: string[];
  entities?: string[];
  categories?: ('strategic' | 'airforce' | 'army' | 'navy' | 'tech' | 'procurement')[];
  publishedAt?: string;
}): StoryCluster {
  const publishedAt = params.publishedAt ?? '2026-09-08T04:00:00Z';
  const source: StorySourceItem = {
    id: `src-${params.id}`,
    title: params.headline,
    snippet: params.snippet,
    url: `https://defencewire.in/mock/${params.id}`,
    sourceName: 'Strategic Front',
    sourceDomain: 'defencewire.in',
    tier: SourceTier.TIER_3_SPECIALIZED,
    publishedAt
  };
  return {
    id: params.id,
    synthesizedHeadline: params.headline,
    primarySource: source,
    relatedCoverage: [],
    discussions: [],
    categories: params.categories ?? ['strategic'],
    entities: params.entities ?? [],
    primaryTag: params.primaryTag,
    hashtags: params.hashtags,
    defenceScore: 85,
    isLeadStory: false,
    createdAt: publishedAt,
    updatedAt: publishedAt
  };
}

const seedLacThread: StoryThread = {
  id: 'th_lac',
  title: 'LAC Operational & Strategic Arc',
  canonicalEntity: 'LAC',
  category: 'strategic',
  status: 'active',
  eventCount: 2,
  firstEventAt: '2026-09-08T02:30:54.000Z',
  lastEventAt: '2026-09-08T03:07:07.000Z',
  summary: 'Indian, Chinese armies hold talks focusing on maintaining peace along LAC',
  semanticFingerprint: ['lac', 'india', 'china', 'corps', 'commander', 'border', 'talks', 'peace', 'armies'],
  createdAt: '2026-09-08T11:49:23.376Z',
  updatedAt: '2026-09-08T11:49:23.376Z'
};

const seedLacEvents: StoryThreadEvent[] = [
  {
    id: 'ev_cluster-69b57dc5_th_lac',
    threadId: 'th_lac',
    clusterId: 'cluster-69b57dc5',
    sequenceCode: 'x1.1.1',
    sequenceIndex: 1,
    headline: 'India, China Hold First Corps Commander-Level Talks in Arunachal',
    deltaSummary: '"India, China Hold First Corps Commander-Level Talks in Arunachal."',
    primarySourceName: 'The Wire (Strategic Defence)',
    primarySourceUrl: 'https://thewire.in/security/india-china-hold-first-corps-commander-level-talks-in-arunachal',
    publishedAt: '2026-09-08T02:30:54.000Z',
    entities: ['LAC'],
    createdAt: '2026-09-08T11:49:23.376Z'
  },
  {
    id: 'ev_cluster-58fc361b_th_lac',
    threadId: 'th_lac',
    clusterId: 'cluster-58fc361b',
    sequenceCode: 'x1.1.2',
    sequenceIndex: 2,
    headline: 'Indian, Chinese armies hold talks focusing on maintaining peace along LAC',
    deltaSummary: '"Indian, Chinese armies hold talks focusing on maintaining peace along LAC."',
    primarySourceName: 'Hindustan Times (India Security)',
    primarySourceUrl: 'https://www.hindustantimes.com/india-news/indian-chinese-armies-hold-talks-focusing-on-maintaining-peace-along-lac-101788836798038.html',
    publishedAt: '2026-09-08T03:07:07.000Z',
    entities: ['LAC'],
    createdAt: '2026-09-08T11:49:23.376Z'
  }
];

describe('Pipeline Tag Screening & Thread Continuity Integration', () => {
  beforeEach(() => {
    clearCFAIMemoryCache();
  });

  it('correctly filters tags and routes clusters through full continuity pipeline', async () => {
    // 1. Black Jet: Substring "black" has no word-boundary LAC and no border anchors
    const clusterBlackJet = createMockCluster({
      id: 'cluster-black-jet',
      headline: 'India unveils Black Jet fifth-generation stealth platform at aero show',
      snippet: 'The radar-absorbent black composite skin of the Black Jet prototype promises minimal radar cross-section.',
      primaryTag: '#LAC',
      hashtags: ['#LAC', '#BlackJet', '#IAF'],
      entities: ['Black Jet', 'LAC'],
      categories: ['airforce']
    });
    const intelBlackJet = {
      primaryTag: '#BlackJet',
      focalEntity: 'Black Jet Prototype',
      operationalTheater: 'Air Superiority',
      hashtags: ['#BlackJet', '#IAF']
    };

    // 2. HAL LUH: Ladakh helicopter trials with incidental geography, non-focal LAC
    const clusterHalLuh = createMockCluster({
      id: 'cluster-hal-luh',
      headline: 'HAL LUH helicopter undergoes payload trials at high-altitude airbase in Ladakh',
      snippet: 'Hindustan Aeronautics Limited completed engine restart trials for the Light Utility Helicopter.',
      primaryTag: '#LAC',
      hashtags: ['#LAC', '#HALLUH'],
      entities: ['HAL LUH', 'LUH'],
      categories: ['procurement']
    });
    const intelHalLuh = {
      primaryTag: '#HALLUH',
      focalEntity: 'HAL LUH',
      operationalTheater: 'High Altitude Support',
      hashtags: ['#HALLUH']
    };

    // 3. Genuine LAC Border Talks: True consensus and anchored Line of Actual Control
    const clusterLacTalks = createMockCluster({
      id: 'cluster-lac-talks',
      headline: 'India, China complete buffer zone verification along LAC after military talks',
      snippet: 'Senior military commanders from India and China verified disengagement protocols along the Line of Actual Control.',
      primaryTag: '#LAC',
      hashtags: ['#LAC', '#IndiaChina'],
      entities: ['LAC', 'Indian Army', 'PLA'],
      categories: ['strategic'],
      publishedAt: '2026-09-08T05:00:00Z'
    });
    const intelLacTalks = {
      primaryTag: '#LAC',
      focalEntity: 'Line of Actual Control',
      operationalTheater: 'Northern Border',
      hashtags: ['#LAC', '#IndiaChina']
    };

    // --- STEP 1: SCREEN TAGS THROUGH CASCADE ---
    await screenClusterTags(clusterBlackJet, intelBlackJet);
    await screenClusterTags(clusterHalLuh, intelHalLuh);
    await screenClusterTags(clusterLacTalks, intelLacTalks);

    // Black Jet assertions: #LAC completely eliminated
    expect(clusterBlackJet.primaryTag).toBe('#BlackJet');
    expect(clusterBlackJet.hashtags).not.toContain('#LAC');
    expect(clusterBlackJet.entities).not.toContain('LAC');

    // HAL LUH assertions: #LAC rejected, primaryTag reflects LUH
    expect(clusterHalLuh.primaryTag).toBe('#HALLUH');
    expect(clusterHalLuh.hashtags).not.toContain('#LAC');
    expect(clusterHalLuh.entities).not.toContain('LAC');

    // Genuine LAC assertions: #LAC verified and preserved
    expect(clusterLacTalks.primaryTag).toBe('#LAC');
    expect(clusterLacTalks.hashtags).toContain('#LAC');
    expect(clusterLacTalks.entities).toContain('LAC');

    // --- STEP 2: FEED ALL 3 INTO CONTINUITY ENGINE ---
    const continuity = matchAndAdvanceThreads(
      [clusterBlackJet, clusterHalLuh, clusterLacTalks],
      [seedLacThread],
      seedLacEvents
    );

    // Verify LAC thread advancement
    const lacThread = continuity.threads.find((t) => t.id === 'th_lac');
    expect(lacThread).toBeDefined();
    expect(lacThread?.eventCount).toBe(3);
    expect(lacThread?.lastEventAt).toBe('2026-09-08T05:00:00Z');

    const lacEvents = continuity.events.filter((e) => e.threadId === 'th_lac');
    expect(lacEvents).toHaveLength(3);
    expect(lacEvents[0]?.id).toBe('ev_cluster-69b57dc5_th_lac');
    expect(lacEvents[1]?.id).toBe('ev_cluster-58fc361b_th_lac');
    expect(lacEvents[2]?.clusterId).toBe('cluster-lac-talks');
    expect(lacEvents[2]?.sequenceCode).toBe('x1.1.3');

    // Verify that neither Black Jet nor HAL LUH entered th_lac
    const blackJetInLac = lacEvents.find((e) => e.clusterId === 'cluster-black-jet');
    const halLuhInLac = lacEvents.find((e) => e.clusterId === 'cluster-hal-luh');
    expect(blackJetInLac).toBeUndefined();
    expect(halLuhInLac).toBeUndefined();

    // Verify intra-thread coherence on th_lac remains 100% clean
    const coherenceAudit = auditThreadCoherence(lacEvents);
    expect(coherenceAudit.coherent).toBe(true);
    expect(coherenceAudit.flaggedIds).toHaveLength(0);
    expect(coherenceAudit.validEvents).toHaveLength(3);
  });

  it('rejects direct score matching of Black Jet or HAL LUH against th_lac', () => {
    const unScreenedBlackJet = createMockCluster({
      id: 'cluster-raw-bj',
      headline: 'Fifth gen black jet stealth mock-up presented',
      snippet: 'Black jet stealth tech.',
      entities: ['Black Jet'],
      primaryTag: '#BlackJet'
    });
    expect(scoreMatch(unScreenedBlackJet, seedLacThread)).toBe(0);

    const unScreenedLuh = createMockCluster({
      id: 'cluster-raw-luh',
      headline: 'HAL LUH helicopter Ladakh high altitude trials',
      snippet: 'LUH helicopter trial details.',
      entities: ['HAL LUH'],
      primaryTag: '#HALLUH'
    });
    expect(scoreMatch(unScreenedLuh, seedLacThread)).toBe(0);
  });
});
