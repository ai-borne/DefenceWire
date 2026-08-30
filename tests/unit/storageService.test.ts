import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  StorageService,
  createStorageService
} from '../../src/services/storageService.js';
import { StoryCluster, StorySourceItem } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';

describe('StorageService (IndexedDB + Auto-Pruning)', () => {
  let storage: StorageService;

  const mockCluster = (id: string, daysOld: number = 0): StoryCluster => {
    const date = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString();
    return {
      id,
      synthesizedHeadline: `Headline for ${id}`,
      primarySource: {
        id: `src-${id}`,
        title: `Source title ${id}`,
        url: `https://pib.gov.in/news/${id}`,
        sourceName: 'PIB India',
        sourceDomain: 'pib.gov.in',
        tier: SourceTier.TIER_1_OFFICIAL,
        publishedAt: date
      },
      relatedCoverage: [],
      discussions: [],
      categories: ['army'],
      entities: ['Tejas'],
      defenceScore: 85,
      isLeadStory: false,
      createdAt: date,
      updatedAt: date
    };
  };

  const mockRiverItem = (id: string, daysOld: number = 0): StorySourceItem => {
    const date = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString();
    return {
      id,
      title: `River item ${id}`,
      url: `https://reuters.com/news/${id}`,
      sourceName: 'Reuters',
      sourceDomain: 'reuters.com',
      tier: SourceTier.TIER_2_NATIONAL,
      publishedAt: date
    };
  };


  beforeEach(async () => {
    storage = createStorageService(`defencewire_test_${Date.now()}_${Math.random()}`);
    await storage.init();
    await storage.clearAll();
  });

  it('saves and retrieves story clusters accurately', async () => {
    const clusters = [mockCluster('c1'), mockCluster('c2')];
    await storage.saveClusters(clusters);

    const retrieved = await storage.getClusters();
    expect(retrieved.length).toBe(2);
    expect(retrieved.map((c) => c.id)).toEqual(expect.arrayContaining(['c1', 'c2']));
  });

  it('saves and retrieves river news items accurately', async () => {
    const riverItems = [mockRiverItem('r1'), mockRiverItem('r2')];
    await storage.saveRiverItems(riverItems);

    const retrieved = await storage.getRiverItems();
    expect(retrieved.length).toBe(2);
    expect(retrieved.map((r) => r.id)).toEqual(expect.arrayContaining(['r1', 'r2']));
  });

  it('prunes clusters and river items older than 7 days', async () => {
    const freshCluster = mockCluster('fresh-c', 1);
    const oldCluster = mockCluster('old-c', 8); // 8 days old

    const freshRiver = mockRiverItem('fresh-r', 2);
    const oldRiver = mockRiverItem('old-r', 9); // 9 days old

    await storage.saveClusters([freshCluster, oldCluster]);
    await storage.saveRiverItems([freshRiver, oldRiver]);

    const pruneResult = await storage.pruneOldEntries(7);
    expect(pruneResult.prunedClusters).toBe(1);
    expect(pruneResult.prunedRiver).toBe(1);

    const remainingClusters = await storage.getClusters();
    expect(remainingClusters.length).toBe(1);
    expect(remainingClusters[0]!.id).toBe('fresh-c');

    const remainingRiver = await storage.getRiverItems();
    expect(remainingRiver.length).toBe(1);
    expect(remainingRiver[0]!.id).toBe('fresh-r');
  });


  it('clears all stores cleanly', async () => {
    await storage.saveClusters([mockCluster('c1')]);
    await storage.saveRiverItems([mockRiverItem('r1')]);

    await storage.clearAll();

    const clusters = await storage.getClusters();
    const river = await storage.getRiverItems();

    expect(clusters.length).toBe(0);
    expect(river.length).toBe(0);
  });
});
