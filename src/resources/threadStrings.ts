/**
 * Story Threading & Lineage String Resources SSOT (Phase 1)
 * Centralizes UI copy, badge templates, status badges, and error states
 * for story threading and chronological lineage timelines.
 * Hard limit: <= 300 LOC.
 */

const threadStrings = {
  tabTitle: 'Story Threads',
  tabSubtitle: 'Long-arc chronological intelligence tracking multi-month defence programs.',
  badgePrefix: '🔗',
  badgeUpdatesSuffix: 'updates',
  badgeSingleUpdate: 'update',
  statusActive: 'Active Track',
  statusDormant: 'Dormant',
  statusConcluded: 'Concluded',
  sequenceMilestonePrefix: 'Milestone',
  sourceLabel: 'Primary Source',
  deltaLabel: 'Key Delta',
  entitiesLabel: 'Key Entities',
  timelineHeading: 'Program Evolution Timeline',
  emptyThreadsHeading: 'No Active Threads Found',
  emptyThreadsDescription: 'No multi-event story threads match the current filter criteria.',
  loadingThreads: 'Loading intelligence threads...',
  errorLoadingThreads: 'Failed to load story threads. Please try again.',
  filterAllCategories: 'All Domains',
  filterActiveOnly: 'Active Only',
  filterAllStatuses: 'All Tracks',
  backToThreads: '← Back to All Threads',
  searchPlaceholder: 'Search threads by program or platform...',
  rateLimitExceeded: 'Too many requests. Please slow down.'
} as const;

export default threadStrings;
