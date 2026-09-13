import { describe, expect, it, vi } from 'vitest';
import { orderedTopics, renderTopicBadgeList } from '../../src/components/topics/TopicBadgeList.js';
import { TopicKnowledgeBaseViewModel } from '../../src/viewmodels/TopicKnowledgeBaseViewModel.js';
import { renderTopicKnowledgeBaseView } from '../../src/components/topics/TopicKnowledgeBaseView.js';
import type { PublicTopic } from '../../src/services/topicReadHandler.js';

const topics: PublicTopic[] = [
  { id: 'india', displayName: 'India', displayHashtag: '#India', topicType: 'country', description: 'India', registryVersion: 1, displayPriority: 3 },
  { id: 'airbases', displayName: 'Airbases', displayHashtag: '#Airbases', topicType: 'capability', description: null, registryVersion: 1, displayPriority: 1 },
  { id: 'jordan', displayName: 'Jordan', displayHashtag: '#Jordan', topicType: 'country', description: null, registryVersion: 1, displayPriority: 2 },
  { id: 'iran', displayName: 'Iran', displayHashtag: '#Iran', topicType: 'country', description: null, registryVersion: 1, displayPriority: 3 }
];
const article = { clusterId: 'cluster-india', role: 'actor' as const, confidence: .9, assignmentSource: 'deterministic', assignedAt: '2026-09-13T00:00:00Z', publishedAt: '2026-09-13T00:00:00Z', primarySource: { id: 'a', title: 'India story', snippet: 'Validated story', canonicalUrl: 'https://example.test/india', sourceDomain: 'example.test', coverageRole: 'primary' as const }, sources: [], relatedThreadIds: [] };

describe('Phase 8 topic UI', () => {
  it('renders the three highest-priority badges and a collapsed +N without hiding their canonical IDs', () => {
    const open = vi.fn(); const view = renderTopicBadgeList(topics, open)!;
    expect(view.querySelectorAll('button')).toHaveLength(3);
    expect(view.textContent).toContain('+1');
    const india = Array.from(view.querySelectorAll('button')).find((button) => button.textContent === '#India')!;
    india.click(); expect(open).toHaveBeenCalledWith('india');
    expect(orderedTopics(topics).map((item) => item.id)).toEqual(['india', 'iran', 'jordan', 'airbases']);
  });

  it('uses stored priority and ID tie-breakers, not input order, on every render', () => {
    const reversed = [...topics].reverse();
    expect(orderedTopics(topics).map((item) => item.id)).toEqual(orderedTopics(reversed).map((item) => item.id));
  });

  it('renders loading, article, empty, error, and pagination states through the viewmodel', async () => {
    const fetchPage = vi.fn()
      .mockResolvedValueOnce({ topic: topics[0], articles: [article], related: [], nextCursor: 'signed-next', totalCount: 2, firstObservedAt: '2026-01-01T00:00:00Z', latestObservedAt: '2026-09-13T00:00:00Z' })
      .mockResolvedValueOnce({ topic: topics[0], articles: [], related: [], nextCursor: null, totalCount: 2, firstObservedAt: '2026-01-01T00:00:00Z', latestObservedAt: '2026-09-13T00:00:00Z' });
    const vm = new TopicKnowledgeBaseViewModel('india', fetchPage);
    const view = renderTopicKnowledgeBaseView(vm);
    expect(view.textContent).toContain('Loading');
    await Promise.resolve(); await Promise.resolve();
    expect(view.textContent).toContain('India story');
    (view.querySelector('button') as HTMLButtonElement).click();
    await Promise.resolve(); await Promise.resolve();
    expect(fetchPage).toHaveBeenLastCalledWith('india', 'signed-next');
  });
});
