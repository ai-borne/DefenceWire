/** Client boundary for the public canonical-topic API. */
import type { PublicTopic, PublicTopicArticle } from './topicReadHandler.js';

export interface TopicPage { topic: PublicTopic; articles: PublicTopicArticle[]; related: Array<PublicTopic & { relationType: string }>; nextCursor: string | null; totalCount: number; firstObservedAt: string | null; latestObservedAt: string | null; error?: string; }

async function read<T>(path: string, fetchFn: typeof fetch): Promise<T | null> {
  try { const response = await fetchFn(path, { headers: { Accept: 'application/json' } }); return response.ok ? await response.json() as T : null; } catch { return null; }
}

export async function fetchTopicPage(topicId: string, cursor?: string, fetchFn: typeof fetch = fetch): Promise<TopicPage> {
  const encoded = encodeURIComponent(topicId);
  const suffix = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  const [articles, related] = await Promise.all([
    read<{ topic?: PublicTopic; articles?: PublicTopicArticle[]; nextCursor?: string | null; totalCount?: number; firstObservedAt?: string | null; latestObservedAt?: string | null; error?: string }>(`/api/topics/${encoded}/articles${suffix}`, fetchFn),
    read<{ related?: Array<PublicTopic & { relationType: string }> }>(`/api/topics/${encoded}/related`, fetchFn)
  ]);
  if (!articles?.topic) return { topic: { id: topicId, displayName: topicId, displayHashtag: `#${topicId}`, topicType: 'strategic_theme', description: null, registryVersion: 0 }, articles: [], related: [], nextCursor: null, totalCount: 0, firstObservedAt: null, latestObservedAt: null, error: articles?.error };
  return { topic: articles.topic, articles: articles.articles ?? [], related: related?.related ?? [], nextCursor: articles.nextCursor ?? null, totalCount: articles.totalCount ?? 0, firstObservedAt: articles.firstObservedAt ?? null, latestObservedAt: articles.latestObservedAt ?? null, error: articles.error };
}
