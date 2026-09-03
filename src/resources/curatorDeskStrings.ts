/**
 * Curator Desk 5-Tab Workstation String Resources SSOT for DefenceWire.in
 * Centralizes labels, headers, empty states, and tab titles for the modular Curator Desk.
 * Hard limit: <= 300 LOC.
 */

const curatorDeskStrings = {
  // Tabs
  tabWire: '📰 Wire Curation',
  tabIntel: '🧠 Intelligence Review',
  tabEcosystem: '🌱 Ecosystem Pipeline',
  tabCrawler: '🛰️ Crawler Health',
  tabScorecard: '📊 Source Scorecard',

  // Tab 1: Wire Curation
  wireHeading: 'Candidate Story Clusters',
  wireSubheading: 'Human-in-the-loop candidate curation with 1-click promote, demote, headline, and ignore controls.',

  // Tab 2: Intelligence Review
  intelReviewHeading: 'Strategic Intelligence & Briefings Review',
  intelReviewSubheading: 'Inspect and refine synthesized analysis, SSB interview angles, and domain takeaways.',
  filterAllIntel: 'All Intelligence',
  filterHasSsb: 'With SSB Intel',
  filterHasSummary: 'With Domain Summary',
  noIntelFound: 'No story intelligence matches the selected filter.',
  searchIntelPlaceholder: 'Search briefs by headline or entity...',
  editBriefBtn: 'Edit Brief',
  editSummaryBtn: 'Edit Summary',
  whyItMattersLabel: 'Why It Matters',
  strategicAngleLabel: 'Strategic Angle',
  keySpecsLabel: 'Key Specs / Metrics',

  // Tab 4: Crawler Health
  crawlerHealthHeading: 'Crawler & Source Circuit Breaker Health',
  crawlerHealthSubheading: 'Real-time telemetry across 40+ Indian defence feeds with Fowler Half-Open circuit protection.',
  statusStable: 'All Circuits Operational',
  statusAlert: 'Circuit Breaker Alert',
  quarantinedBanner: 'Quarantined Feeds: Failover protection active for degraded endpoints.',
  totalFeedsLabel: 'Monitored Feeds',
  healthyFeedsLabel: 'Healthy / Closed',
  quarantinedFeedsLabel: 'Quarantined / Open',
  lastCrawlLabel: 'Last Sync',
  probeStatusLabel: 'Probe Mode',
  halfOpenProbe: 'HALF-OPEN (Probing)',
  circuitClosed: 'CLOSED (Healthy)',
  circuitOpen: 'OPEN (Tripped)',
  refreshHealthBtn: '↻ Check Health',
  feedNameCol: 'Feed / Channel',
  feedTierCol: 'Tier',
  feedStateCol: 'Circuit State',
  feedStatusCol: 'Health Status',

  // Tab 5: Source Scorecard
  scorecardHeading: 'Source Reliability & Reputation Scorecard',
  scorecardSubheading: 'Weighted authority rankings, scoop velocity credits, and corroboration multiplier indexes.',
  searchSourcesPlaceholder: 'Filter sources by name or domain...',
  colSource: 'Source & Domain',
  colTier: 'Authority Tier',
  colWeight: 'Base Weight',
  colMultiplier: 'Dynamic Multiplier',
  colStatus: 'Signal Type',
  noSourcesFound: 'No registered news sources matched your query.',
  officialBadge: 'Official Gov',
  wireBadge: 'Wire Service',
  specializedBadge: 'Specialized',
  osintBadge: 'OSINT'
} as const;

export default curatorDeskStrings;
