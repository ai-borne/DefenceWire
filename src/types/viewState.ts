/**
 * View State & UI Presentation Types for DefenceWire.in
 * Hard limit: <= 300 LOC.
 */

import { DomainCategory, StoryCluster } from './news.js';

export type FilterCategory = 'all' | DomainCategory | 'river' | 'archive' | 'suppliers';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface FeedViewState {
  activeCategory: FilterCategory;
  searchQuery: string;
  theme: ThemeMode;
  expandedSSBClusterIds: Set<string>;
  selectedClusterId: string | null;
  isLoading: boolean;
  isOffline: boolean;
  errorMessage: string | null;
}

export interface EditorialActionPayload {
  clusterId: string;
  action: 'promote' | 'demote' | 'edit_headline' | 'edit_ssb' | 'ignore';
  editedHeadline?: string;
  editedSSBBrief?: string;
}

export interface FilteredFeedResult {
  leadStory: StoryCluster | null;
  regularClusters: StoryCluster[];
  totalMatchingStories: number;
}
