/**
 * Resource Strings for Emergent Patterns & Hypothesis Synthesizer (Phase 5)
 * Centralizes UI copy, curator desk actions, filters, and accessibility labels.
 * Hard limit: <= 300 LOC.
 */

export const PATTERN_STRINGS = {
  tabLabel: 'Emergent Patterns',
  heading: 'Emergent Patterns & Hypothesis Synthesizer',
  subheading: 'Autonomous spatiotemporal clustering and cross-track hypothesis generation for human curator review.',
  emptyTitle: 'No Patterns Detected',
  emptyMessage: 'No active emergent pattern hypotheses detected for this filter. Run ingestion or check back later.',
  loading: 'Loading emergent pattern hypotheses...',
  errorPrefix: 'Error loading patterns: ',
  filterAll: 'All Patterns',
  filterDraft: 'Pending Review',
  filterApproved: 'Approved & Public',
  filterRejected: 'Archived / Rejected',
  statusDraft: 'Draft Candidate',
  statusApproved: 'Curator Approved',
  statusRejected: 'Rejected',
  confidenceLabel: 'Confidence',
  connectedNodesLabel: 'Connected Entities & Locations',
  sourceTracksLabel: 'Co-Occurring Story Signals',
  hypothesisLabel: 'Synthesized Hypothesis',
  btnApprove: 'Approve & Publish',
  btnReject: 'Reject',
  btnEdit: 'Edit Assessment',
  btnSave: 'Save & Approve',
  btnCancel: 'Cancel',
  editTitlePlaceholder: 'Pattern Title (e.g. NCR Air Defence Convergence)',
  editSynthesisPlaceholder: 'Enter 2-sentence situational assessment and hypothesis...',
  saveSuccess: 'Pattern successfully approved and promoted.',
  rejectSuccess: 'Pattern candidate rejected.',
  badgeHighConfidence: 'High Signal',
  badgeMediumConfidence: 'Moderate Signal',
  badgeEmergent: 'Emergent Matrix',
  modalAriaLabel: 'Emergent Pattern Review Panel',
  refreshBtn: 'Refresh Queue',

  // Public Reader Situational Matrix
  publicHeading: 'Emergent Situational Matrix',
  publicSubheading: 'Multi-signal correlation & tactical intelligence hypotheses',
  exploreInGraph: 'Inspect in Intel Graph',
  coOccurringSignals: 'Co-Occurring Story Signals',
  dismissLabel: 'Dismiss briefing banner',
  highConfidenceBadge: 'High Confidence',
  moderateConfidenceBadge: 'Moderate Confidence',
  patternCountPrefix: 'Pattern',
  prevPattern: 'Previous pattern',
  nextPattern: 'Next pattern',
  toggleSignals: 'Toggle co-occurring signals',
  radarLiveSignal: 'LIVE SIGNAL CORRELATION'
} as const;

export default PATTERN_STRINGS;
