/**
 * Knowledge Graph String Resources SSOT (Phase 2)
 * Centralizes UI copy, node categories, predicates, and error messages
 * for the knowledge graph visualizer and query APIs.
 * Hard limit: <= 300 LOC.
 */

const graphStrings = {
  tabTitle: 'Intel Graph',
  tabSubtitle: 'Interactive relational knowledge graph of sovereign defence platforms, deployments, and strategic linkages.',
  loadingGraph: 'Synthesizing knowledge graph...',
  errorLoadingGraph: 'Failed to load knowledge graph slice. Please try again.',
  emptyGraph: 'No relational graph nodes found for the selected parameters.',
  nodesCountLabel: 'Nodes',
  edgesCountLabel: 'Edges',
  categoryFilterAll: 'All Categories',
  categoryPlatform: 'Physical Platforms & Units',
  categoryThreat: 'Threats & Anomalies',
  categoryFacility: 'Facilities & Bases',
  categoryLocation: 'Geographic Locations',
  categoryOrganization: 'Agencies & Armed Forces',
  categoryProgram: 'Strategic Programs',
  predicateDeployedTo: 'Deployed Near / In',
  predicateConnectedTo: 'Connected To',
  predicateProcures: 'Procures / Acquires',
  predicateTestedAt: 'Tested At',
  predicateTargets: 'Engages / Targets',
  predicateDevelopedBy: 'Developed By',
  predicateEngagedWith: 'Engaged With',
  predicateSupplies: 'Supplies',
  predicateIntercepted: 'Intercepted',
  predicateCollaboratesWith: 'Collaborates With',
  stateConfirmed: 'Confirmed',
  stateContested: 'Contested',
  stateDisputed: 'Disputed',
  stateSuperseded: 'Superseded',
  stateRetracted: 'Retracted',
  timeScrubberTitle: 'Timeline Scrubber',
  twoHopNeighborhood: '2-Hop Local Neighborhood',
  resetView: 'Reset Graph View',
  rateLimitExceeded: 'Too many requests. Please slow down.'
} as const;

export default graphStrings;
