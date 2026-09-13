import { describe, expect, it } from 'vitest';
import { prepareDurableInputs, finalizeDurablePlan } from '../../crawler/durableClusterPlanner.js';
import { StoryCluster, StorySourceItem } from '../../src/types/news.js';
import { SourceTier } from '../../src/types/source.js';

function article(index: number, url = `https://example.com/story-${index}`): StorySourceItem {
  return {
    id: `feed-${index}`, title: `Army tests platform number ${index}`, url,
    sourceName: 'Example', sourceDomain: 'example.com', tier: SourceTier.TIER_2_NATIONAL,
    publishedAt: '2026-09-13T08:00:00Z', snippet: `Defence report ${index}`
  };
}

function cluster(index: number, primary: StorySourceItem, related: StorySourceItem[] = []): StoryCluster {
  return {
    id: `ephemeral-${index}`, synthesizedHeadline: primary.title, primarySource: primary,
    relatedCoverage: related, discussions: [], categories: ['army'], entities: [`Platform ${index}`],
    defenceScore: 100 - index, isLeadStory: index === 0,
    createdAt: primary.publishedAt, updatedAt: primary.publishedAt
  };
}

const uuids = Array.from({ length: 60 }, (_, index) =>
  `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`);

describe('durable cluster planning', () => {
  it('keeps all 50 eligible clusters in the durable plan before homepage ranking', async () => {
    const articles = Array.from({ length: 50 }, (_, index) => article(index));
    let uuidIndex = 0;
    const prepared = await prepareDurableInputs(
      articles, articles.map((item, index) => cluster(index, item)), () => uuids[uuidIndex++]!
    );
    const plan = await finalizeDurablePlan(prepared, []);

    expect(plan.articles).toHaveLength(50);
    expect(plan.clusters).toHaveLength(50);
    expect(plan.clusters.slice(0, 30)).toHaveLength(30);
    expect(plan.clusters[30]?.cluster.synthesizedHeadline).toContain('30');
  });

  it('mints a real UUID via the default crypto.randomUUID binding when no mintUuid override is supplied', async () => {
    const item = article(0);
    const prepared = await prepareDurableInputs([item], [cluster(0, item)]);

    expect(prepared.clusters[0]?.id).toMatch(/^cluster_[0-9a-f-]{36}$/);
  });

  it('deduplicates equivalent tracked URLs and reuses a durable cluster when primary changes', async () => {
    const original = article(1, 'https://EXAMPLE.com/report/?utm_source=feed');
    const equivalent = article(2, 'https://example.com/report');
    const replacement = article(3, 'https://second.example/report');
    const prepared = await prepareDurableInputs(
      [original, equivalent, replacement], [cluster(1, replacement, [original])], () => uuids[0]!
    );
    const sharedId = prepared.articles.find((item) => item.canonicalUrl === 'https://example.com/report')!.id;
    const plan = await finalizeDurablePlan(prepared, [{
      source_article_id: sharedId, cluster_id: 'cluster_durable',
      event_fingerprint: prepared.clusters[0]!.eventFingerprint
    }]);

    expect(prepared.articles).toHaveLength(2);
    expect(plan.clusters[0]?.id).toBe('cluster_durable');
    expect(plan.clusters[0]?.cluster.primarySource).toBe(replacement);
  });

  it('records explicit merge and split lineage while preserving the reused predecessor ID', async () => {
    const one = article(1);
    const two = article(2);
    const preparedMerge = await prepareDurableInputs([one, two], [cluster(1, one, [two])], () => uuids[1]!);
    const [oneId, twoId] = preparedMerge.articles.map((item) => item.id);
    const fingerprint = preparedMerge.clusters[0]!.eventFingerprint;
    const merged = await finalizeDurablePlan(preparedMerge, [
      { source_article_id: oneId!, cluster_id: 'cluster_a', event_fingerprint: fingerprint },
      { source_article_id: twoId!, cluster_id: 'cluster_b', event_fingerprint: fingerprint }
    ]);
    expect(merged.clusters[0]?.id).toBe('cluster_a');
    expect(merged.lineage).toContainEqual(expect.objectContaining({
      predecessorId: 'cluster_b', successorId: 'cluster_a', changeType: 'merge'
    }));

    const preparedSplit = await prepareDurableInputs(
      [one, two], [cluster(1, one), cluster(2, two)], (() => {
        let index = 2; return () => uuids[index++]!;
      })()
    );
    const split = await finalizeDurablePlan(preparedSplit, [
      { source_article_id: oneId!, cluster_id: 'cluster_a', event_fingerprint: 'old' },
      { source_article_id: twoId!, cluster_id: 'cluster_a', event_fingerprint: 'old' }
    ]);
    expect(split.clusters[0]?.id).toBe('cluster_a');
    expect(split.lineage[0]).toEqual(expect.objectContaining({
      predecessorId: 'cluster_a', changeType: 'split'
    }));
  });
});
