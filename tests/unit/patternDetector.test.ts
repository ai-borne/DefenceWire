/**
 * Unit Tests for Emergent Pattern Detector (Phase 5)
 * Verifies graph community density, spatiotemporal clustering within 72h window,
 * and false-positive suppression for unrelated signals.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect } from 'vitest';
import { detectEmergentPatterns } from '../../crawler/patternDetector.js';
import { StoryCluster } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';

function createMockCluster(
  id: string,
  headline: string,
  publishedAt: string,
  entities: string[],
  domain: string = 'pib.gov.in',
  snippet: string = ''
): StoryCluster {
  return {
    id,
    synthesizedHeadline: headline,
    primarySource: {
      id: `src-${id}`,
      title: headline,
      url: `https://${domain}/story-${id}`,
      sourceName: domain,
      sourceDomain: domain,
      tier: SourceTier.TIER_1_OFFICIAL,
      publishedAt,
      snippet
    },
    relatedCoverage: [],
    discussions: [],
    categories: ['strategic'],
    entities,
    defenceScore: 88,
    isLeadStory: false,
    createdAt: publishedAt,
    updatedAt: publishedAt
  };
}

describe('Emergent Pattern Detector', () => {
  it('triggers an emergent candidate when 3 co-occurring events in a 72-hour window share geographic and threat anchors', () => {
    // 3 co-occurring signals:
    // 1. Unidentified drone swarm detected near Delhi NCR border
    // 2. Multi-agency security grid sanitizes Red Fort ahead of national events
    // 3. Army deploys upgraded L-70 Air Defence guns across sensitive Delhi sectors
    const clusters: StoryCluster[] = [
      createMockCluster(
        'c-1',
        'Unidentified Drone Infiltration Threat Detected Near Delhi NCR',
        '2026-09-01T08:00:00Z',
        ['Delhi', 'Drone Infiltration'],
        'thehindu.com',
        'Hostile quadcopter suspected along perimeter.'
      ),
      createMockCluster(
        'c-2',
        'Multi-Agency Security Grid Sanitization Underway at Red Fort in Delhi',
        '2026-09-01T14:30:00Z',
        ['Delhi', 'Red Fort'],
        'pib.gov.in',
        'High alert declared with counter-UAS systems activated across Delhi.'
      ),
      createMockCluster(
        'c-3',
        'Army Deploys Upgraded L-70 Air Defence Guns Across Delhi VVIP Sectors',
        '2026-09-02T10:00:00Z',
        ['Delhi', 'L-70 Guns'],
        'tribuneindia.com',
        'Anti-aircraft and counter-drone batteries positioned around key Delhi installations.'
      )
    ];

    const candidates = detectEmergentPatterns(clusters, { windowHours: 72, minClusters: 3 });

    expect(candidates.length).toBeGreaterThanOrEqual(1);

    const match = candidates.find((c) => c.title.toLowerCase().includes('delhi'));
    expect(match).toBeDefined();
    expect(match?.clusterIds).toContain('c-1');
    expect(match?.clusterIds).toContain('c-2');
    expect(match?.clusterIds).toContain('c-3');
    expect(match?.nodeIds).toContain('node_delhi');
    expect(match?.confidence).toBeGreaterThanOrEqual(0.65);
    expect(match?.clusterHeadlines.length).toBe(3);
  });

  it('does NOT trigger a candidate when signals are spaced further apart than the 72-hour window', () => {
    const clusters: StoryCluster[] = [
      createMockCluster(
        'c-old-1',
        'Drone activity spotted near Delhi air corridor',
        '2026-08-15T08:00:00Z',
        ['Delhi', 'Drone Infiltration']
      ),
      createMockCluster(
        'c-old-2',
        'Red Fort security review in Delhi completed',
        '2026-08-25T14:30:00Z',
        ['Delhi', 'Red Fort']
      ),
      createMockCluster(
        'c-now',
        'L-70 Air Defence guns test fired in Delhi',
        '2026-09-05T10:00:00Z',
        ['Delhi', 'L-70 Guns']
      )
    ];

    const candidates = detectEmergentPatterns(clusters, { windowHours: 72, minClusters: 3 });
    expect(candidates.length).toBe(0);
  });

  it('does NOT trigger false positives for unrelated stories lacking shared anchors', () => {
    const clusters: StoryCluster[] = [
      createMockCluster(
        'c-10',
        'Navy commissions survey vessel at Visakhapatnam shipyard',
        '2026-09-01T08:00:00Z',
        ['Visakhapatnam', 'INS Sandhayak'],
        'pib.gov.in'
      ),
      createMockCluster(
        'c-11',
        'IAF fighter pilots complete joint exercise in Tarang Shakti',
        '2026-09-01T12:00:00Z',
        ['Jodhpur', 'Su-30MKI'],
        'airforce.nic.in'
      ),
      createMockCluster(
        'c-12',
        'DRDO conducts routine Pinaka rocket trials in Pokhran',
        '2026-09-02T09:00:00Z',
        ['Pokhran', 'Pinaka MBRL'],
        'drdo.gov.in'
      )
    ];

    const candidates = detectEmergentPatterns(clusters, { windowHours: 72, minClusters: 3 });
    expect(candidates.length).toBe(0);
  });

  it('computes higher confidence when more clusters and multi-domain sources corroborate the pattern', () => {
    const clusterBase = [
      createMockCluster(
        'c-ladakh-1',
        'Border standoff tension reported in Eastern Ladakh sector',
        '2026-09-02T08:00:00Z',
        ['Ladakh', 'LAC'],
        'domain1.com',
        'Standoff near Depsang.'
      ),
      createMockCluster(
        'c-ladakh-2',
        'Army mobilizes Zorawar light tanks along Ladakh LAC',
        '2026-09-02T12:00:00Z',
        ['Ladakh', 'Zorawar Tank', 'LAC'],
        'domain2.com',
        'Counter-incursion readiness bolstered.'
      ),
      createMockCluster(
        'c-ladakh-3',
        'Satellite radar tracking confirms military buildup near Ladakh LAC',
        '2026-09-02T16:00:00Z',
        ['Ladakh', 'LAC'],
        'domain3.com',
        'Standoff escalation observed.'
      )
    ];

    const candidates3 = detectEmergentPatterns(clusterBase, { windowHours: 72, minClusters: 3 });
    expect(candidates3.length).toBeGreaterThan(0);
    const score3 = candidates3[0]?.confidence ?? 0;

    const clusterExtended = [
      ...clusterBase,
      createMockCluster(
        'c-ladakh-4',
        'IAF combat air patrol intensified over Ladakh border',
        '2026-09-03T07:00:00Z',
        ['Ladakh', 'LAC', 'Rafale'],
        'domain4.com',
        'Border standoff vigilance maintained.'
      )
    ];

    const candidates4 = detectEmergentPatterns(clusterExtended, { windowHours: 72, minClusters: 3 });
    expect(candidates4.length).toBeGreaterThan(0);
    const score4 = candidates4[0]?.confidence ?? 0;

    expect(score4).toBeGreaterThanOrEqual(score3);
  });
});
