/** Bounded-crawl orchestration for registry-driven topic classification. */
import { DurableIngestPlan } from './durableIngestTypes.js';
import { DurablePersistResult, DurableIngestConfig } from './durableIngestTypes.js';
import { D1RestConfig } from './archiveSync.js';
import { markDurableClassified } from './durableIngestService.js';
import { classifyTopicText, contentFingerprint } from './deterministicTopicClassifier.js';
import { fetchTopicRegistry, reconcileTopicAssignments } from './topicAssignmentService.js';
import { normalizeTopicAlias } from '../src/services/topicRegistryService.js';

export async function classifyDurableTopics(
  plan: DurableIngestPlan, config: D1RestConfig, fetchFn: typeof fetch, now: string
): Promise<{ validated: number; reused: number }> {
  if (plan.clusters.every((cluster) => cluster.sourceArticleIds.length === 0)) return { validated: 0, reused: 0 };
  const registry = await fetchTopicRegistry(config, fetchFn);
  const articles = new Map(plan.articles.map((article) => [article.id, article]));
  const knownAliases = new Set(registry.aliases.map((alias) => alias.normalizedAlias));
  const publishedTopicIds = new Set(registry.topics.filter((topic) => topic.status === 'active' && topic.verificationState === 'published').map((topic) => topic.id));
  let validated = 0; let reused = 0;
  for (const cluster of plan.clusters) {
    const classified = cluster.sourceArticleIds.flatMap((sourceArticleId) => {
      const article = articles.get(sourceArticleId);
      if (!article) return [];
      const result = classifyTopicText(`${article.item.title}\n${article.item.snippet ?? ''}`, registry);
      return [{ sourceArticleId, result }];
    });
    const articleMentions = classified.flatMap(({ sourceArticleId, result }) => result.mentions.map((mention) => ({ sourceArticleId, mention })));
    const candidates = classified.flatMap(({ sourceArticleId, result }) => result.candidates
      .filter((candidate) => !knownAliases.has(normalizeTopicAlias(candidate.name)))
      .map((candidate) => ({ sourceArticleId, ...candidate })));
    const fingerprint = contentFingerprint(cluster.sourceArticleIds.map((id) => {
      const article = articles.get(id); return article ? `${id}:${article.contentHash}` : id;
    }).sort().join('|'));
    const result = await reconcileTopicAssignments({ clusterId: cluster.id, fingerprint,
      registryVersion: registry.registryVersion, publishedTopicIds, articleMentions, candidates, now }, config, fetchFn);
    if (result === 'reused') reused++; else validated++;
  }
  return { validated, reused };
}

export async function classifyAndMarkDurableRun(
  durableRun: DurablePersistResult, config: DurableIngestConfig, fetchFn: typeof fetch, now: string
): Promise<{ validated: number; reused: number }> {
  const result = await classifyDurableTopics(durableRun.plan, config.d1, fetchFn, now);
  await markDurableClassified(durableRun.plan, config, { fetchFn });
  return result;
}
