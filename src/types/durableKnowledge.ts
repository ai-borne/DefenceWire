/** Read contracts for durable source articles and story clusters. */
export interface SourceArticleRecord {
  id: string;
  canonicalUrl: string | null;
  originalUrl: string | null;
  sourceDomain: string;
  sourceOwnerKey: string;
  title: string;
  publishedAt: string;
  contentHash: string;
}

export interface StoryClusterRecord {
  id: string;
  eventFingerprint: string;
  status: 'active' | 'merged' | 'split' | 'withdrawn';
  primarySourceArticleId: string | null;
  mergedIntoClusterId: string | null;
  firstObservedAt: string;
  lastObservedAt: string;
}
