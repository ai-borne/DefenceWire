/** One-shot crawler adapter for loading the D1 topic registry per bounded crawl. */
import { loadTopicRegistry, TopicRegistryReader } from '../src/services/topicRegistryService.js';
import { TopicRegistrySnapshot } from '../src/types/topics.js';

export async function loadCrawlerTopicRegistry(reader: TopicRegistryReader): Promise<TopicRegistrySnapshot> {
  return loadTopicRegistry(reader);
}
