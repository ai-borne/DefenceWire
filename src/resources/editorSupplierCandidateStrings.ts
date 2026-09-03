/**
 * Curator Desk Supplier Candidates Panel String Resources SSOT.
 * Kept as a sibling file since strings.ts is already near its 300-LOC limit.
 * Hard limit: <= 300 LOC.
 */

const editorSupplierCandidateStrings = {
  panelTabLabel: '🌱 Ecosystem Candidates',
  storiesTabLabel: '📰 Stories',
  heading: 'Pending Supplier Growth Candidates',
  subheading: 'Auto-drafted from wire co-mentions. Approving promotes the link into the live verified directory; nothing publishes without a click here.',
  loading: 'Loading pending candidates…',
  empty: 'No pending candidates right now — the hourly crawler drafts new ones as it finds them.',
  loadError: 'Could not load pending candidates.',
  approveBtn: '✓ Approve',
  rejectBtn: '✕ Reject',
  reviewing: 'Saving…',
  confidencePrefix: 'Confidence',
  mentionsLabel: 'mentions',
  sourcesLabel: 'sources',
  subsystemPrefix: 'Subsystem',
  refreshBtn: '↻ Refresh'
} as const;

export default editorSupplierCandidateStrings;
