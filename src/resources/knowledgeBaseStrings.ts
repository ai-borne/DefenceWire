/**
 * Curator Desk — Knowledge Base Tab String Resources SSOT for DefenceWire.in (Phase 5)
 * Centralizes labels for the read-only Knowledge Base tab: table selector,
 * toolbar, pagination, and empty/error states.
 *
 * Deliberately NOT merged into resources/strings.ts's shared STRINGS object:
 * strings.ts is imported eagerly by main.ts (for public reader strings), so
 * anything folded into STRINGS ships in the public 82KB-gzip-capped main
 * bundle regardless of where it's actually used — Rollup has no per-property
 * tree-shaking for a single exported object literal. This file is instead
 * imported directly by KnowledgeBaseView.ts/EditorDashboard.ts, both of which
 * are already lazy-loaded only when the Curator Desk opens, so its content
 * lands in that lazy chunk instead. (curatorDeskStrings/ingestStrings/
 * editorSupplierCandidateStrings predate this fix and still leak into the
 * main bundle via STRINGS — flagged as pre-existing budget debt, not
 * reworked here to stay surgical to Phase 5's own scope.)
 * Hard limit: <= 300 LOC.
 */

const knowledgeBaseStrings = {
  tabLabel: '📚 Knowledge Base',
  heading: 'Knowledge Base',
  subheading: 'Live, read-only view of the desk’s D1 data tables.',
  tableSelectLabel: 'Table',
  tableDiscoveredEntities: 'Discovered Entities',
  tableSourceReputation: 'Source Reputation',
  tableSupplierCandidates: 'Supplier Candidates',
  tableCuratorOverrides: 'Curator Overrides',
  tablePublishedSnapshots: 'Publish History',
  filterPlaceholder: 'Filter rows...',
  loading: 'Loading...',
  noRows: 'No rows found.',
  errorPrefix: 'Error: ',
  prevPage: '← Prev',
  nextPage: 'Next →',
  pageInfoPrefix: 'Page',
  ofLabel: 'of',
  rowsSuffix: 'rows'
} as const;

export default knowledgeBaseStrings;
