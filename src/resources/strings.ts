/**
 * Centralized String Resources SSOT for DefenceWire.in
 * All user-facing text, labels, aria-labels, and messages are defined here.
 * Hard limit: <= 300 LOC.
 */

export const STRINGS = {
  app: {
    name: 'DefenceWire.in',
    tagline: 'India’s Institutional Defence & Strategic Intelligence Wire',
    shortTagline: 'Indian Defence Intelligence Wire',
    metaDescription:
      'Real-time automated news aggregator for Indian defence, military technology, procurement, geopolitics, and SSB preparation.',
    institutionalBadge: '🌏 Intelligent Wire',
    liveUpdateLabel: 'LIVE IST',
    offlineNotice: 'You are viewing cached offline intelligence.',
    onlineNotice: 'Live feed connected.'
  },
  nav: {
    all: 'Top Stories',
    army: 'Army',
    navy: 'Navy',
    airforce: 'Air Force',
    tech: 'Defence Tech',
    strategic: 'Geopolitics',
    procurement: 'Procurement',
    ssb: 'SSB Intel',
    river: 'River of News',
    archive: 'Archive'
  },
  categories: {
    all: 'All Domains',
    army: 'Indian Army',
    navy: 'Indian Navy',
    airforce: 'Indian Air Force',
    tech: 'Defence Technology & R&D',
    strategic: 'Strategic & Geopolitics',
    procurement: 'Procurement & Capital Acquisition',
    ssb: 'SSB Interview Focus',
    river: 'Chronological Wire'
  },
  story: {
    primarySourcePrefix: 'Via',
    relatedCoverageHeading: 'Related Coverage',
    discussionHeading: 'Analysis & Commentary',
    moreSources: 'more sources',
    viewOriginalArticle: 'Open primary report',
    timeAgoMinutes: 'm ago',
    timeAgoHours: 'h ago',
    timeAgoDays: 'd ago',
    justNow: 'Just now',
    shareAriaLabel: 'Share this intelligence briefing',
    expandSummaryAriaLabel: 'Expand article summary',
    permalinkIcon: '🔗',
    permalinkCopiedIcon: '✓',
    permalinkTooltip: 'Copy share link',
    permalinkCopiedTooltip: 'Link copied to clipboard',
    permalinkLabel: '🔗 Permalink',
    permalinkCopied: '✓ Link copied',
    sourceTierTooltip: 'Institutional Reliability Tier',
    officialSignalBadge: 'Verified Signal'
  },
  summary: {
    drawerTitle: 'Summary',
    collapseSuffix: 'Collapse',
    collapseDrawerBtn: 'Collapse Summary',
    collapseAriaLabel: 'Collapse article summary',
    whyItMattersHeading: 'Why It Matters',
    techTakeawayHeading: 'Key Specifications',
    strategicAngleHeading: 'Strategic Angle'
  },
  // SSB-specific framing (GD points, interview questions, coaching CTA), rendered only
  // as an opt-in insight box on clusters editorially tagged with the 'ssb' category.
  ssb: {
    insightBadge: 'SSB Insight',
    drawerSubtitle: 'Curated for SSB Aspirants (NDA, CDS, AFCAT, INET, SSB Boards)',
    gdTopicsHeading: 'Group Discussion (GD) & Lecturette Angles',
    interviewQuestionsHeading: 'Potential IO / Interview Questions',
    ctaHeading: 'Deepen your SSB preparation with automated mock interviews:',
    ctaButton: 'Practice on SSBMax.ai →',
    ctaLink: 'https://ssbmax.ai'
  },
  ecosystem: {
    sponsorTag: 'DEFENCEWIRE NETWORK',
    ssbMaxTitle: 'SSBMax.ai — AI SSB Interview Coach',
    ssbMaxDesc: 'Practice OIR, PPDT, Mock Interviews & GD with India’s 1st Defence AI mentor.',
    ssbMaxCta: 'Visit SSBMax.ai',
    ssbMaxUrl: 'https://ssbmax.ai',
    ssbMaxDestinationId: 'SSBMax.ai',
    aiBorneTitle: 'ai-borne.in — Sovereign AI & Defence Tech',
    aiBorneDesc: 'Deep research into autonomous systems, counter-UAS, and sovereign defence computing.',
    aiBorneCta: 'Explore ai-borne.in',
    aiBorneUrl: 'https://ai-borne.in',
    aiBorneDestinationId: 'ai-borne.in'
  },
  editor: {
    dashboardTitle: 'Editorial Curation Control',
    openDashboard: 'Curator Desk',
    closeDashboard: 'Close Desk',
    toggleAria: 'Toggle Editorial Curation Control Desk',
    promoteToLead: 'Promote to Lead',
    demoteStory: 'Demote Lead',
    editHeadline: 'Edit Synthesized Headline',
    editSSBBrief: 'Edit SSB Brief',
    ignoreCluster: 'Ignore Story',
    restoreCluster: 'Restore Story',
    saveChanges: 'Save Changes',
    cancel: 'Cancel',
    statusActive: 'Active',
    statusIgnored: 'Ignored',
    statusPromoted: 'Lead Story',
    scoreLabel: 'DefenceScore',
    sourcesCountLabel: 'sources',
    candidateClusters: 'Candidate Clusters',
    filterAll: 'All Stories',
    filterActive: 'Active Only',
    filterIgnored: 'Ignored Only',
    headlineModalTitle: 'Edit Synthesized Headline',
    headlinePlaceholder: 'Enter authoritative synthesized headline...',
    ssbModalTitle: 'Edit SSB Intelligence Brief',
    whyItMattersLabel: 'Why This Matters for SSB',
    gdTopicsLabel: 'GD / Lecturette Points (one per line)',
    interviewQuestionsLabel: 'Interview Questions (one per line)',
    strategicAngleLabel: 'Strategic Angle',
    noClustersFound: 'No clusters found in this view.',
    // Auth & Stealth Controls
    authTitle: 'Institutional Curator Access',
    authSubtitle: 'Restricted to authorized DefenceWire editorial personnel.',
    zeroTrustLoginBtn: 'Login with Cloudflare Zero Trust (Email PIN)',
    orDivider: '— OR ENTER PASSCODE —',
    passcodePlaceholder: 'Enter Security Passcode...',
    unlockButton: 'Unlock Curator Desk',
    invalidPasscode: 'Invalid passcode. Access denied.',
    lockDesk: 'Lock Desk',
    rememberSession: 'Remember session',
    // Worldwide Edge Sync & Export
    publishToProduction: 'Sync to Cloudflare D1',
    publishing: 'Syncing to Cloudflare D1...',
    publishSuccess: 'Synced to Cloudflare D1 successfully!',
    publishError: 'Failed to sync with Cloudflare D1.',
    exportJson: 'Export JSON',
    copyJson: 'Copy JSON',
    copiedToClipboard: 'Curated intelligence JSON copied to clipboard!',
    stealthHint: 'Curator Desk unlocked via institutional shortcut.',
    zeroTrustBadge: 'Zero Trust Verified',
    sessionBadge: 'Institutional Session'
  },
  pwa: {
    installPrompt: 'Install DefenceWire for offline tactical intelligence',
    installButton: 'Install App',
    closeButton: 'Dismiss',
    offlineBanner: 'Offline Mode: Serving cached tactical intelligence briefings',
    onlineBanner: 'Online: Real-time intelligence feed reconnected'
  },
  funnel: {
    utmSource: 'defencewire',
    utmMediumSSB: 'ssb_drawer',
    utmMediumEcosystem: 'ecosystem_rail',
    utmCampaignDefault: 'organic'
  },
  theme: {
    toggleThemeAria: 'Switch visual theme mode',
    light: 'Light (Newsprint)',
    dark: 'Dark (Tactical Slate)',
    system: 'System Default',
    iconLight: '☀️',
    iconDark: '🌙',
    iconSystem: '⚙️'
  },
  river: {
    heading: 'River of News',
    subheading: 'Chronological unfiltered wire from 40+ Indian defence feeds',
    sourceLabel: 'Source',
    filterPlaceholder: 'Filter wire...'
  },
  archive: {
    heading: 'Archive',
    subheading: 'Every story that has ever run on DefenceWire, searchable in full.',
    searchPlaceholder: 'Search the full archive (e.g. Tejas, S-400, Agni-V)...',
    searchButton: 'Search',
    searchAriaLabel: 'Search the story archive',
    emptyArchive: 'The archive is still empty — check back once stories start aging out of the live feed.',
    noResults: 'No archived stories matched your search.',
    loading: 'Loading the archive...',
    loadingMore: 'Loading more...',
    error: 'Archive search is temporarily unavailable. Please try again shortly.'
  },
  footer: {
    copyright: '© DefenceWire.in — Real-Time Indian Defence & Geopolitical Intelligence Aggregator.',
    disclaimer: 'Aggregated strictly from accredited open-source defence journalism, PIB, MoD, and public institutional press releases.',
    ecosystemHeading: 'Institutional Defence Network',
    privacyPolicy: 'Privacy Policy',
    editorialPolicy: 'Editorial Guidelines & Source Tiers',
    contact: 'Contact & Press Submissions'
  },
  search: {
    placeholder: 'Search intelligence, systems, entities (e.g. Tejas, LAC, DRDO)...',
    ariaLabel: 'Search defence news and intelligence',
    clearAriaLabel: 'Clear search query',
    toggleSearchAria: 'Toggle search bar',
    closeSearchAria: 'Close search bar',
    expandSearchTooltip: 'Search intelligence',
    resultsFound: 'briefings matching query',
    noResults: 'No intelligence briefings matching query.'
  },
  tiers: {
    tier1: 'Official / MoD',
    tier1Social: 'Official Handle',
    tier2: 'National Wire',
    tier3: 'Specialized Defence',
    tier4: 'Think Tank / OSINT'
  },
  errors: {
    feedLoadFailed: 'Unable to retrieve live feed. Loading cached intelligence...',
    invalidUrl: 'Invalid or unsafe external URL detected.',
    emptyCluster: 'No stories available in this category at this time.',
    authRequired: 'Authentication required.',
    authFailed: 'Authentication failed.',
    authConfigMissing: 'Server configuration error: Authentication secrets not configured.',
    rateLimitExceeded: 'Too many login attempts. Please try again later.'
  },
  sync: {
    buttonLabel: 'Sync',
    syncingLabel: 'Syncing...',
    checkingLabel: 'Checking...',
    updatedLabel: 'Updated',
    errorLabel: 'Sync failed',
    idleTooltip: 'Click to revalidate live intelligence feed',
    checkingTooltip: 'Checking for newer intelligence updates...',
    syncingTooltip: 'Fetching latest defence intelligence...',
    updatedTooltip: 'Live intelligence feed is up to date',
    errorTooltip: 'Unable to sync feed. Showing cached intelligence.',
    ariaSyncNow: 'Revalidate and synchronize live defence intelligence feed',
    liveStatus: 'Live Feed Connected'
  },
  dossier: {
    modalTitlePrefix: '🛡️ Sovereign Dossier: ',
    closeAriaLabel: 'Close Dossier',
    loading: 'Querying D1 intelligence archive...',
    noRecordsPrefix: 'No historical dossier records found for ',
    domainLabel: 'DOMAIN',
    corroborationLabel: 'CORROBORATION',
    wireMentionsLabel: 'WIRE MENTIONS',
    platformLabel: 'PLATFORM',
    monitoringLabel: 'MONITORING',
    statusLabel: 'STATUS',
    defaultCategory: 'Strategic',
    sourcesSuffix: 'Sources',
    watch247: '24/7 Watch',
    liveWire247: '24/7 Live Wire',
    activeTracking: 'Active Tracking',
    timelineHeading: 'Development Timeline & Corroborated Coverage:',
    activeWatchTitle: 'Active Intelligence Watch:',
    activeWatchBody:
      'Real-time monitoring is active across 50+ official defence feeds. Historical milestones, tests, contracts, and deployments will automatically index here as coverage develops.',
    activeWatchFallbackBody:
      'This sovereign platform is tracked across 50+ official military feeds. Development milestones, trials, and procurement updates will automatically aggregate here as stories develop.'
  }
} as const;

export type StringResourceKeys = typeof STRINGS;

