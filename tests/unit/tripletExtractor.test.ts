/**
 * Unit Tests for Semantic Triplet & Knowledge Graph Extractor (Phase 2)
 * Tests actor-action-target relationship extraction, stop-node suppression,
 * and epistemic state lifecycle (CONFIRMED -> DISPUTED / SUPERSEDED / RETRACTED).
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect } from 'vitest';
import {
  detectEpistemicState,
  extractTripletsFromClusters
} from '../../crawler/tripletExtractor.js';
import { isGraphStopNode } from '../../crawler/graphStopNodes.js';
import { StoryCluster } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';


function createMockCluster(overrides: Partial<StoryCluster>): StoryCluster {
  return {
    id: 'cluster-test-1',
    synthesizedHeadline: 'Test Headline',
    primarySource: {
      id: 'src-1',
      title: 'Source Title',
      url: 'https://pib.gov.in/test',
      sourceName: 'PIB MoD',
      sourceDomain: 'pib.gov.in',
      tier: SourceTier.TIER_1_OFFICIAL,
      publishedAt: '2026-09-01T10:00:00Z',
      snippet: 'Test snippet'
    },
    relatedCoverage: [],
    discussions: [],
    categories: ['army'],
    entities: [],
    defenceScore: 85,
    isLeadStory: false,
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-01T10:00:00Z',
    ...overrides
  };
}

describe('Epistemic State Detection', () => {
  it('detects CONFIRMED for authoritative and standard reporting', () => {
    expect(detectEpistemicState('DRDO successfully flight tests BrahMos missile from Chandipur')).toBe('CONFIRMED');
    expect(detectEpistemicState('Indian Army inducts new Zorawar light tanks')).toBe('CONFIRMED');
  });

  it('detects DISPUTED for refutations, denials, and false claims', () => {
    expect(detectEpistemicState('Ministry of Defence denies reports of border standoff in Ladakh')).toBe('DISPUTED');
    expect(detectEpistemicState('Army refutes claims of casualties along LAC')).toBe('DISPUTED');
    expect(detectEpistemicState('Spokesperson clarifies fake report regarding fighter jet crash')).toBe('DISPUTED');
  });

  it('detects SUPERSEDED when earlier orders or deployments are replaced', () => {
    expect(detectEpistemicState('MoD supersedes earlier acquisition order with revised Tejas Mk1A timeline')).toBe('SUPERSEDED');
    expect(detectEpistemicState('New contract replaces previous agreement for naval engines')).toBe('SUPERSEDED');
  });

  it('detects RETRACTED when news outlets retract or withdraw erroneous reports', () => {
    expect(detectEpistemicState('Agency retracts earlier report on missile misfire')).toBe('RETRACTED');
    expect(detectEpistemicState('Erroneous report on drone crash withdrawn by publisher')).toBe('RETRACTED');
  });

  it('detects CONTESTED for unconfirmed and conflicting claims', () => {
    expect(detectEpistemicState('Unconfirmed reports suggest unverified border activity near Galwan')).toBe('CONTESTED');
    expect(detectEpistemicState('Conflicting reports emerge over radar interception')).toBe('CONTESTED');
  });
});

describe('Stop-Node Filter', () => {
  it('identifies generic super-hubs and administrative bodies as stop nodes', () => {
    expect(isGraphStopNode('India')).toBe(true);
    expect(isGraphStopNode('Indian Army')).toBe(true);
    expect(isGraphStopNode('Ministry of Defence')).toBe(true);
    expect(isGraphStopNode('MoD')).toBe(true);
    expect(isGraphStopNode('Indian Air Force')).toBe(true);
    expect(isGraphStopNode('Government of India')).toBe(true);
  });

  it('does not treat specific platforms, locations, and facilities as stop nodes', () => {
    expect(isGraphStopNode('L-70 Guns')).toBe(false);
    expect(isGraphStopNode('Delhi')).toBe(false);
    expect(isGraphStopNode('Tejas Mk1A')).toBe(false);
    expect(isGraphStopNode('Chandipur')).toBe(false);
    expect(isGraphStopNode('BrahMos')).toBe(false);
    expect(isGraphStopNode('Ladakh')).toBe(false);
  });
});

describe('Triplet Extraction from Story Clusters', () => {
  it('extracts [L-70 Guns] -> [DEPLOYED_TO] -> [Delhi] from simulated news items', () => {
    const cluster = createMockCluster({
      synthesizedHeadline: 'Indian Army deploys upgraded L-70 air defence guns around Delhi ahead of Republic Day',
      entities: ['Indian Army', 'L-70 Guns'],
      primarySource: {
        id: 'src-l70',
        title: 'Modernized L-70 guns positioned in Delhi for air security',
        url: 'https://pib.gov.in/l70',
        sourceName: 'PIB MoD',
        sourceDomain: 'pib.gov.in',
        tier: SourceTier.TIER_1_OFFICIAL,
        publishedAt: '2026-09-02T12:00:00Z',
        snippet: 'Indian Army deploys modernized L-70 guns around Delhi to counter rogue drone threats'
      }
    });

    const result = extractTripletsFromClusters([cluster]);

    expect(result.extractedCount).toBeGreaterThan(0);
    const deployEdge = result.edges.find(
      (e) => e.sourceId === 'node_l-70-guns' && e.targetId === 'node_delhi'
    );
    expect(deployEdge).toBeDefined();
    expect(deployEdge?.predicate).toBe('DEPLOYED_TO');
    expect(deployEdge?.epistemicState).toBe('CONFIRMED');
    expect(deployEdge?.firstObservedAt).toBe('2026-09-02T12:00:00Z');
  });

  it('asserts stop-node suppression filters generic terms while preserving specific platforms and locations', () => {
    const cluster = createMockCluster({
      synthesizedHeadline: 'Indian Army deploys upgraded L-70 air defence guns around Delhi',
      entities: ['Indian Army', 'India', 'L-70 Guns']
    });

    const result = extractTripletsFromClusters([cluster]);

    // "Indian Army" and "India" must be suppressed as stop nodes
    expect(result.suppressedCount).toBeGreaterThan(0);
    const stopNodeInNodes = result.nodes.some(
      (n) => n.id === 'node_indian-army' || n.id === 'node_india'
    );
    expect(stopNodeInNodes).toBe(false);

    const stopNodeInEdges = result.edges.some(
      (e) => e.sourceId === 'node_indian-army' || e.targetId === 'node_india'
    );
    expect(stopNodeInEdges).toBe(false);

    // Specific platform and location must be preserved
    expect(result.nodes.some((n) => n.id === 'node_l-70-guns')).toBe(true);
    expect(result.nodes.some((n) => n.id === 'node_delhi')).toBe(true);
  });

  it('asserts retraction and contradiction updates edge state to SUPERSEDED / DISPUTED without dropping audit history', () => {
    const initialCluster = createMockCluster({
      id: 'cluster-deploy-1',
      synthesizedHeadline: 'IAF deploys S-400 Triumf missile squadron in Ladakh',
      entities: ['S-400 Triumf', 'Ladakh'],
      primarySource: {
        id: 'src-init',
        title: 'S-400 deployed in Ladakh',
        url: 'https://news.example/s400',
        sourceName: 'Example News',
        sourceDomain: 'news.example',
        tier: SourceTier.TIER_2_NATIONAL,
        publishedAt: '2026-08-10T10:00:00Z',
        snippet: 'IAF deploys S-400 in Ladakh'
      }
    });

    const disputeCluster = createMockCluster({
      id: 'cluster-dispute-2',
      synthesizedHeadline: 'Ministry refutes and denies reports of S-400 Triumf deployment in Ladakh',
      entities: ['S-400 Triumf', 'Ladakh'],
      primarySource: {
        id: 'src-denial',
        title: 'MoD denies S-400 reports',
        url: 'https://pib.gov.in/denial',
        sourceName: 'PIB MoD',
        sourceDomain: 'pib.gov.in',
        tier: SourceTier.TIER_1_OFFICIAL,
        publishedAt: '2026-08-12T15:00:00Z',
        snippet: 'Spokesperson refutes claims of S-400 deployment in Ladakh'
      }
    });

    const result = extractTripletsFromClusters([initialCluster, disputeCluster]);

    const targetEdge = result.edges.find(
      (e) => e.sourceId === 'node_s-400-triumf' && e.targetId === 'node_ladakh'
    );
    expect(targetEdge).toBeDefined();
    // Audit history preserved: firstObservedAt reflects the earliest report
    expect(targetEdge?.firstObservedAt).toBe('2026-08-10T10:00:00Z');
    // lastObservedAt reflects the latest event
    expect(targetEdge?.lastObservedAt).toBe('2026-08-12T15:00:00Z');
    // Truth state updated to DISPUTED
    expect(targetEdge?.epistemicState).toBe('DISPUTED');
    // Weight incremented from co-occurrence
    expect(targetEdge?.weight).toBe(2.0);
  });

  it('extracts flight test relationship [BrahMos] -> [TESTED_AT] -> [Chandipur]', () => {
    const cluster = createMockCluster({
      synthesizedHeadline: 'DRDO successfully flight tests extended range BrahMos missile at Chandipur ITR',
      entities: ['BrahMos', 'Chandipur'],
      primarySource: {
        id: 'src-test',
        title: 'BrahMos tested at Chandipur',
        url: 'https://drdo.gov.in/test',
        sourceName: 'DRDO',
        sourceDomain: 'drdo.gov.in',
        tier: SourceTier.TIER_1_OFFICIAL,
        publishedAt: '2026-09-05T09:00:00Z'
      }
    });

    const result = extractTripletsFromClusters([cluster]);
    const testEdge = result.edges.find(
      (e) => e.sourceId === 'node_brahmos' && e.targetId === 'node_chandipur'
    );
    expect(testEdge).toBeDefined();
    expect(testEdge?.predicate).toBe('TESTED_AT');
  });

  it('extracts threat engagement relationship [Akash-NG] -> [TARGETS] -> [Drone Infiltration]', () => {
    const cluster = createMockCluster({
      synthesizedHeadline: 'Akash-NG air defence system intercepts hostile drone infiltration during trial',
      entities: ['Akash-NG', 'Drone Infiltration']
    });

    const result = extractTripletsFromClusters([cluster]);
    const targetEdge = result.edges.find(
      (e) => e.sourceId === 'node_akash-ng' && e.targetId === 'node_drone-infiltration'
    );
    expect(targetEdge).toBeDefined();
    expect(targetEdge?.predicate).toBe('TARGETS');
  });

  it('extracts candidate entities and relations from cluster.hashtags and cluster.primaryTag', () => {
    const cluster = createMockCluster({
      synthesizedHeadline: 'Su-57 fighters deployed to forward base in Ladakh for deterrence trials',
      primaryTag: '#Su57',
      hashtags: ['#Su57', '#TASL'],
      entities: ['Ladakh']
    });

    const result = extractTripletsFromClusters([cluster]);

    const su57Node = result.nodes.find((n) => n.id === 'node_su-57');
    expect(su57Node).toBeDefined();
    expect(su57Node?.label).toBe('Su-57');
    expect(su57Node?.category).toBe('platform');

    const taslNode = result.nodes.find((n) => n.id === 'node_tasl');
    expect(taslNode).toBeDefined();
    expect(taslNode?.label).toBe('TASL');

    const deployEdge = result.edges.find(
      (e) => e.sourceId === 'node_su-57' && e.targetId === 'node_ladakh'
    );
    expect(deployEdge).toBeDefined();
    expect(deployEdge?.predicate).toBe('DEPLOYED_TO');
  });
});
