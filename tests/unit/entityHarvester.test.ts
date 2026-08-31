/**
 * Unit Tests for Dynamic Entity Harvester & Closed-Loop Knowledge Base
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it, beforeEach } from 'vitest';
import {
  aggregateEntityCandidates,
  buildEntityPatternString,
  buildEntityRegex,
  escapeRegex,
  getPromotedEntityConfigs,
  slugifyEntityName,
  syncDiscoveredEntitiesToD1,
  EntityHarvestCandidate,
  DiscoveredEntityRecord
} from '../../crawler/entityHarvester.js';
import {
  extractMilitaryEntities,
  registerDynamicEntities,
  resetDynamicEntities
} from '../../src/data/militaryEntities.js';

describe('Closed-Loop Dynamic Entity Harvester', () => {
  beforeEach(() => {
    resetDynamicEntities();
  });

  it('slugifies entity names and escapes regex characters safely', () => {
    expect(slugifyEntityName('Rudram-II (Air-to-Surface)')).toBe('rudram-ii-air-to-surface');
    expect(slugifyEntityName('  Project 76 Submarine  ')).toBe('project-76-submarine');
    expect(escapeRegex('Akash-NG [AD-1] (v1.0)')).toBe('Akash-NG \\[AD-1\\] \\(v1\\.0\\)');
  });

  it('builds smart regex patterns matching roman numeral and numeric variations', () => {
    const patternStr = buildEntityPatternString('Rudram-II');
    const regex = buildEntityRegex(patternStr);

    expect(regex.test('IAF tests new Rudram-II missile off coast')).toBe(true);
    expect(regex.test('DRDO flight tests Rudram-2 today')).toBe(true);
    expect(regex.test('Unrelated Rudram news')).toBe(false);
  });

  it('aggregates candidates and counts distinct publisher domains', () => {
    const candidates: EntityHarvestCandidate[] = [
      { name: 'Nagastra-1', category: 'army', sourceDomain: 'pib.gov.in' },
      { name: 'Nagastra-1', category: 'army', sourceDomain: 'thehindu.com' },
      { name: 'Nagastra-1', category: 'army', sourceDomain: 'pib.gov.in' } // Duplicate domain
    ];

    const records = aggregateEntityCandidates(candidates);
    expect(records).toHaveLength(1);

    const nagastra = records[0]!;
    expect(nagastra.id).toBe('nagastra-1');
    expect(nagastra.mentionCount).toBe(3);
    expect(nagastra.sourceCount).toBe(2);
    expect(nagastra.isPromoted).toBe(true); // >= 3 mentions and >= 2 sources!
  });

  it('does not promote an entity if source domain diversity threshold (< 2) is not met', () => {
    const candidates: EntityHarvestCandidate[] = [
      { name: 'SecretDrone-X', category: 'tech', sourceDomain: 'singleblog.com' },
      { name: 'SecretDrone-X', category: 'tech', sourceDomain: 'singleblog.com' },
      { name: 'SecretDrone-X', category: 'tech', sourceDomain: 'singleblog.com' },
      { name: 'SecretDrone-X', category: 'tech', sourceDomain: 'singleblog.com' }
    ];

    const records = aggregateEntityCandidates(candidates);
    expect(records[0]?.mentionCount).toBe(4);
    expect(records[0]?.sourceCount).toBe(1);
    expect(records[0]?.isPromoted).toBe(false);
  });

  it('promotes entities dynamically and integrates them into extractMilitaryEntities()', () => {
    const candidates: EntityHarvestCandidate[] = [
      { name: 'Project 76', category: 'navy', sourceDomain: 'thehindu.com' },
      { name: 'Project 76', category: 'navy', sourceDomain: 'janes.com' },
      { name: 'Project 76', category: 'navy', sourceDomain: 'pib.gov.in' }
    ];

    const records = aggregateEntityCandidates(candidates);
    const promotedConfigs = getPromotedEntityConfigs(records);

    expect(promotedConfigs).toHaveLength(1);
    expect(promotedConfigs[0]!.name).toBe('Project 76');

    // Register into active NLP extractor
    registerDynamicEntities(promotedConfigs);

    const extracted = extractMilitaryEntities('Indian Navy initiates design for Project 76 next-gen submarine');
    expect(extracted.entities).toContain('Project 76');
    expect(extracted.categories).toContain('navy');
  });

  it('syncs discovered entities to Cloudflare D1 with parameterized upsert queries', async () => {
    const records: DiscoveredEntityRecord[] = [
      {
        id: 'rudram-ii',
        name: 'Rudram-II',
        pattern: '\\brudram-?(ii|2)\\b',
        category: 'tech',
        sourceCount: 3,
        mentionCount: 5,
        isPromoted: true,
        firstSeenAt: '2026-08-30T10:00:00Z',
        lastSeenAt: '2026-08-31T10:00:00Z'
      }
    ];

    let queryCaptured = '';
    const mockFetch = async (_url: string, init?: RequestInit) => {
      queryCaptured = String(init?.body || '');
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    };

    const d1Config = {
      accountId: 'cf-acc-1',
      databaseId: 'cf-db-1',
      apiToken: 'cf-tok-1'
    };

    const result = await syncDiscoveredEntitiesToD1(records, d1Config, {
      fetchFn: mockFetch as typeof fetch
    });

    expect(result.synced).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.promotedCount).toBe(1);
    expect(queryCaptured).toContain('INSERT INTO discovered_entities');
    expect(queryCaptured).toContain('rudram-ii');
  });
});
