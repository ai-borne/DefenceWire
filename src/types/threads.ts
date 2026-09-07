/**
 * Story Threading & Lineage Data Contracts (Phase 1)
 * Tracks evolving multi-month defence storylines, sequence progression
 * (x1.1.1 -> x1.1.2), and chronological causal milestones.
 * Hard limit: <= 300 LOC.
 */

export type ThreadStatus = 'active' | 'dormant' | 'concluded';

export interface StoryThread {
  id: string;
  title: string;
  canonicalEntity: string;
  category: string;
  status: ThreadStatus;
  eventCount: number;
  firstEventAt: string;
  lastEventAt: string;
  summary?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoryThreadEvent {
  id: string;
  threadId: string;
  clusterId: string;
  sequenceCode: string;
  sequenceIndex: number;
  headline: string;
  deltaSummary: string;
  primarySourceName: string;
  primarySourceUrl: string;
  publishedAt: string;
  entities: string[];
  createdAt: string;
}

export interface StoryThreadRow {
  id: string;
  title: string;
  canonical_entity: string;
  category: string;
  status: string;
  event_count: number;
  first_event_at: string;
  last_event_at: string;
  summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface StoryThreadEventRow {
  id: string;
  thread_id: string;
  cluster_id: string;
  sequence_code: string;
  sequence_index: number;
  headline: string;
  delta_summary: string;
  primary_source_name: string;
  primary_source_url: string;
  published_at: string;
  entities: string; // JSON array string
  created_at: string;
}

export interface ThreadQueryOptions {
  status?: ThreadStatus;
  category?: string;
  search?: string;
  limit?: number;
  cursor?: string | null;
}

export interface ThreadListResult {
  threads: StoryThread[];
  nextCursor: string | null;
  error?: string;
}

export interface ThreadDetailResult {
  thread: StoryThread | null;
  events: StoryThreadEvent[];
  error?: string;
}

export interface ThreadContinuityResult {
  threads: StoryThread[];
  events: StoryThreadEvent[];
  newlySpawnedCount: number;
  attachedCount: number;
  reactivatedCount: number;
}
