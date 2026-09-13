/** Bounded-crawl orchestration for registry-driven topic classification. */
import { DurableIngestPlan } from './durableIngestTypes.js';
import { DurablePersistResult, DurableIngestConfig } from './durableIngestTypes.js';
import { D1RestConfig } from './archiveSync.js';
import { markDurableClassified } from './durableIngestService.js';
import { ASSIGNMENT_POLICY_VERSION, CLASSIFIER_VERSION, classifyTopicText, contentFingerprint } from './deterministicTopicClassifier.js';
import { fetchTopicRegistry, reconcileTopicAssignments } from './topicAssignmentService.js';
import { normalizeTopicAlias } from '../src/services/topicRegistryService.js';
import { requestSemanticDecision, retrieveLikelyTopics, semanticInputHash, SemanticDecision, TopicModelConfig, validateSemanticResponse } from './topicSemanticAdjudicator.js';
import { loadSemanticCache, saveSemanticCache } from './topicSemanticCache.js';

export async function classifyDurableTopics(
  plan: DurableIngestPlan, config: D1RestConfig, fetchFn: typeof fetch, now: string, modelConfig: TopicModelConfig = {}
): Promise<{ validated: number; reused: number }> {
  if (plan.clusters.every((cluster) => cluster.sourceArticleIds.length === 0)) return { validated: 0, reused: 0 };
  const registry = await fetchTopicRegistry(config, fetchFn);
  return classifyDurableTopicsWithRegistry(plan, registry, config, fetchFn, now, modelConfig);
}

/** Reuses one immutable registry snapshot across a bounded classification job. */
export async function classifyDurableTopicsWithRegistry(
  plan: DurableIngestPlan, registry: Awaited<ReturnType<typeof fetchTopicRegistry>>,
  config: D1RestConfig, fetchFn: typeof fetch, now: string, modelConfig: TopicModelConfig = {},
  legacyTopicsByCluster: ReadonlyMap<string, string[]> = new Map()
): Promise<{ validated: number; reused: number }> {
  if (plan.clusters.every((cluster) => cluster.sourceArticleIds.length === 0)) return { validated: 0, reused: 0 };
  const articles = new Map(plan.articles.map((article) => [article.id, article]));
  const knownAliases = new Set(registry.aliases.map((alias) => alias.normalizedAlias));
  const publishedTopicIds = new Set(registry.topics.filter((topic) => topic.status === 'active' && topic.verificationState === 'published').map((topic) => topic.id));
  let validated = 0; let reused = 0;
  const semanticRequests = new Map<string, Promise<SemanticDecision | null>>();
  for (const cluster of plan.clusters) {
    const classified = cluster.sourceArticleIds.flatMap((sourceArticleId) => {
      const article = articles.get(sourceArticleId);
      if (!article) return [];
      const result = classifyTopicText(`${article.item.title}\n${article.item.snippet ?? ''}`, registry);
      return [{ sourceArticleId, result }];
    });
    const articleMentions = classified.flatMap(({ sourceArticleId, result }) => result.mentions.map((mention) => ({ sourceArticleId, mention })));
    const semantic = modelConfig.enabled && modelConfig.apiKey ? await Promise.all(classified.map(async ({ sourceArticleId }) => {
      const text = `${articles.get(sourceArticleId)?.item.title ?? ''}\n${articles.get(sourceArticleId)?.item.snippet ?? ''}`;
      const topicIds = retrieveLikelyTopics(text, registry);
      const inputHash = semanticInputHash(text, topicIds, registry.registryVersion, CLASSIFIER_VERSION, ASSIGNMENT_POLICY_VERSION);
      let request = semanticRequests.get(inputHash);
      if (!request) {
        request = (async () => {
          const cached = await loadSemanticCache(inputHash, config, fetchFn);
          if (cached.found) return cached.response ? validateSemanticResponse(cached.response, text, registry) : null;
          const response = await requestSemanticDecision(text, registry, modelConfig, fetchFn);
          await saveSemanticCache({ inputHash: response.inputHash, registryVersion: registry.registryVersion, classifierVersion: CLASSIFIER_VERSION,
            policyVersion: ASSIGNMENT_POLICY_VERSION, topicIds: response.topicIds, response: response.decision ? response.response : null, now }, config, fetchFn);
          return response.decision;
        })();
        semanticRequests.set(inputHash, request);
      }
      return { sourceArticleId, decision: await request };
    })) : [];
    const shadowArticleMentions = semantic.flatMap(({ sourceArticleId, decision }) => decision?.existingTopics.map((mention) => ({ sourceArticleId, mention: { ...mention, mentionKind: 'exact' as const } })) ?? []);
    const candidates = classified.flatMap(({ sourceArticleId, result }) => result.candidates
      .filter((candidate) => !knownAliases.has(normalizeTopicAlias(candidate.name)))
      .map((candidate) => ({ sourceArticleId, ...candidate })));
    const discoveredConcepts = semantic.flatMap(({ sourceArticleId, decision }) => decision?.discoveredConcepts.map((concept) => ({ sourceArticleId, ...concept })) ?? []);
    const fingerprint = contentFingerprint(cluster.sourceArticleIds.map((id) => {
      const article = articles.get(id); return article ? `${id}:${article.contentHash}` : id;
    }).sort().join('|'));
    const result = await reconcileTopicAssignments({ clusterId: cluster.id, fingerprint,
      registryVersion: registry.registryVersion, publishedTopicIds, articleMentions, shadowArticleMentions,
      migrationTopicIds: legacyTopicsByCluster.get(cluster.id), candidates, discoveredConcepts, now }, config, fetchFn);
    if (result === 'reused') reused++; else validated++;
  }
  return { validated, reused };
}

export async function classifyAndMarkDurableRun(
  durableRun: DurablePersistResult, config: DurableIngestConfig, fetchFn: typeof fetch, now: string, modelConfig: TopicModelConfig = {}
): Promise<{ validated: number; reused: number }> {
  const result = await classifyDurableTopics(durableRun.plan, config.d1, fetchFn, now, modelConfig);
  await markDurableClassified(durableRun.plan, config, { fetchFn });
  return result;
}
