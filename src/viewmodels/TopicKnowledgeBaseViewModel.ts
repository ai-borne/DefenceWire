import { TopicPage, fetchTopicPage } from '../services/topicService.js';

export class TopicKnowledgeBaseViewModel {
  private page: TopicPage | null = null; private loading = false; private listeners = new Set<() => void>();
  constructor(private readonly topicId: string, private readonly fetchPage = fetchTopicPage) {}
  subscribe(listener: () => void): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  private notify(): void { this.listeners.forEach((listener) => listener()); }
  async load(more = false): Promise<void> { if (this.loading) return; this.loading = true; this.notify(); const next = await this.fetchPage(this.topicId, more ? this.page?.nextCursor ?? undefined : undefined); this.page = more && this.page ? { ...next, articles: [...this.page.articles, ...next.articles] } : next; this.loading = false; this.notify(); }
  getPage(): TopicPage | null { return this.page; } getIsLoading(): boolean { return this.loading; } hasMore(): boolean { return Boolean(this.page?.nextCursor); }
}
