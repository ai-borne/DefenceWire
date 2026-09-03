/**
 * Verified Indian Defence Ecosystem (Supplier Directory) String Resources SSOT
 * Spread into STRINGS.suppliers by strings.ts (kept as a sibling file since
 * strings.ts is already near its 300-LOC limit).
 * Hard limit: <= 300 LOC.
 */

const supplierStrings = {
  navTab: 'Ecosystem',
  heading: 'Verified Indian Defence Ecosystem',
  subheading: 'Supply-chain layer of the Programs pillar — verified suppliers, primes and DPSUs mapped to the platforms they build',
  coverageStripPrefix: 'of',
  coverageStripSuffix: 'programs have verified supply chains mapped',
  lastVerifiedPrefix: 'Last verified',
  featuredLinkPrefix: 'Did you know?',
  filterAllTiers: 'All Tiers',
  filterAllCapabilities: 'All Capabilities',
  filterAllCorridors: 'All Corridors',
  filterAllCertifications: 'All Certifications',
  tierDpsu: 'DPSU',
  tierPrivatePrime: 'Private Prime / Tier-1',
  tierTier2Msme: 'Tier-2 MSME',
  tierDeepTechStartup: 'Deep-Tech Startup (iDEX / SRIJAN)',
  searchPlaceholder: 'Search suppliers by name, capability or subsystem...',
  noResults: 'No verified suppliers matched your filter criteria.',
  linkedProgramsPrefix: 'Linked to',
  linkedProgramsSuffix: 'programs',
  sortLinkedDesc: 'Most Connected',
  sortAlphabetical: 'A–Z',
  sortAriaLabel: 'Sort supplier cards',
  cardAriaLabel: 'View supplier dossier for',
  modalCloseAria: 'Close supplier dossier',
  tabOverview: 'Overview',
  tabCapabilities: 'Capabilities & Certifications',
  tabLinkedPrograms: 'Linked Strategic Programs',
  tabIndigenisation: 'SRIJAN & iDEX Records',
  tabWireMentions: 'Live Wire Mentions',
  tabAriaLabel: 'Supplier dossier sections',
  overviewHqLabel: 'Headquarters',
  overviewCorridorLabel: 'Defence Industrial Corridor',
  overviewWebsiteLabel: 'Official Website',
  overviewListedLabel: 'Listed Entity',
  overviewStockLabel: 'Stock Symbol',
  linkedProgramsEmpty: 'No verified strategic program links found — this indicates a data integrity issue, not a valid supplier state.',
  linkedProgramsSubsystemPrefix: 'Manufactures',
  indigenisationSrijanBadge: 'SRIJAN Indigenisation',
  indigenisationIdexBadge: 'iDEX Winner',
  indigenisationEmpty: 'No SRIJAN or iDEX records currently mapped to this supplier.',
  wireMentionsEmpty: 'No recent wire coverage mentioning this supplier.',
  capabilitiesEmpty: 'No capability domains currently mapped to this supplier.'
} as const;

export default supplierStrings;
