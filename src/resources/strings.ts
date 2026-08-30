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
    institutionalBadge: 'INSTITUTIONAL INTELLIGENCE WIRE',
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
    river: 'River of News'
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
    expandSSBAriaLabel: 'Expand SSB Intelligence Briefing',
    sourceTierTooltip: 'Institutional Reliability Tier'
  },
  ssb: {
    drawerTitle: 'SSB Intelligence Briefing',
    drawerSubtitle: 'Curated for SSB Aspirants (NDA, CDS, AFCAT, INET, SSB Boards)',
    whyItMattersHeading: 'Why This Matters for SSB',
    gdTopicsHeading: 'Group Discussion (GD) & Lecturette Angles',
    interviewQuestionsHeading: 'Potential IO / Interview Questions',
    techTakeawayHeading: 'Defence Tech & Specifications',
    strategicAngleHeading: 'Strategic & National Security Impact',
    ctaHeading: 'Deepen your SSB preparation with automated mock interviews:',
    ctaButton: 'Practice on SSBMax.ai →',
    ctaLink: 'https://ssbmax.ai'
  },
  ecosystem: {
    sponsorTag: 'DEFENCEWIRE NETWORK',
    ssbMaxTitle: 'SSBMax.ai — AI SSB Interview Coach',
    ssbMaxDesc: 'Practice OIR, PPDT, Mock Interviews & GD with India’s 1st Defence AI mentor.',
    ssbMaxCta: 'Visit SSBMax.ai',
    aiBorneTitle: 'AI-Borne.in — Sovereign AI & Defence Tech',
    aiBorneDesc: 'Deep research into autonomous systems, counter-UAS, and sovereign defence computing.',
    aiBorneCta: 'Explore AI-Borne.in',
    aiBorneUrl: 'https://ai-borne.in',
    ssbMaxUrl: 'https://ssbmax.ai'
  },
  editor: {
    dashboardTitle: 'Editorial Curation Control',
    promoteToLead: 'Promote to Lead',
    demoteStory: 'Demote',
    editHeadline: 'Edit Synthesized Headline',
    editSSBBrief: 'Edit SSB Brief',
    ignoreCluster: 'Ignore Cluster',
    saveChanges: 'Save Changes',
    cancel: 'Cancel',
    statusActive: 'Active',
    statusIgnored: 'Ignored',
    scoreLabel: 'DefenceScore'
  },
  theme: {
    toggleThemeAria: 'Switch visual theme mode',
    light: 'Light (Newsprint)',
    dark: 'Dark (Tactical Slate)',
    system: 'System Default'
  },
  river: {
    heading: 'River of News',
    subheading: 'Chronological unfiltered wire from 40+ Indian defence feeds',
    sourceLabel: 'Source',
    filterPlaceholder: 'Filter wire...'
  },
  footer: {
    copyright: '© DefenceWire.in — Real-Time Indian Defence & Geopolitical Intelligence Aggregator.',
    disclaimer: 'Aggregated strictly from accredited open-source defence journalism, PIB, MoD, and public institutional press releases.',
    ecosystemHeading: 'Institutional Defence Network',
    privacyPolicy: 'Privacy Policy',
    editorialPolicy: 'Editorial Guidelines & Source Tiers',
    contact: 'Contact & Press Submissions'
  },
  errors: {
    feedLoadFailed: 'Unable to retrieve live feed. Loading cached intelligence...',
    invalidUrl: 'Invalid or unsafe external URL detected.',
    emptyCluster: 'No stories available in this category at this time.'
  }
} as const;

export type StringResourceKeys = typeof STRINGS;
