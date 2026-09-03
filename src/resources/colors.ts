/**
 * Centralized Color Tokens SSOT for DefenceWire.in
 * Defines color palettes and theme token mappings.
 * Hard limit: <= 300 LOC.
 */

export const COLOR_PALETTE = {
  // Brand & Accent Colors
  crimson: {
    primary: '#B31919',
    hover: '#8C1212',
    subtle: '#FFEBEB'
  },
  tacticalOlive: {
    base: '#4A5D4E',
    dark: '#2A362D',
    light: '#728876',
    border: '#38463B'
  },
  tacticalAmber: {
    glow: '#E5A93C',
    dim: '#8E6822'
  },
  // Light Theme (Newsprint)
  light: {
    bgCanvas: '#FBFBF9',
    bgCard: '#FFFFFF',
    bgSecondary: '#F2F2EE',
    bgHover: '#EBEBE6',
    borderPrimary: '#D8D8CE',
    borderSecondary: '#E8E8E0',
    textPrimary: '#121212',
    textSecondary: '#555555',
    textMuted: '#777777',
    textAccent: '#B31919',
    link: '#0F5499',
    linkVisited: '#6B4086',
    badgeBg: '#ECECE5',
    badgeText: '#2B2B28',
    officialLokSabhaBg: '#E6F4EA',
    officialLokSabhaText: '#137333',
    officialRajyaSabhaBg: '#FEF7E0',
    officialRajyaSabhaText: '#B06000',
    officialPibBg: '#E8F0FE',
    officialPibText: '#1A73E8',
    officialTenderBg: '#F3E8FF',
    officialTenderText: '#7E22CE',
    officialIdexBg: '#E0F2FE',
    officialIdexText: '#0369A1'
  },
  // Dark Theme (Tactical Slate / Military Command)
  dark: {
    bgCanvas: '#0C0F12',
    bgCard: '#13181E',
    bgSecondary: '#192028',
    bgHover: '#202A35',
    borderPrimary: '#2B3542',
    borderSecondary: '#1E252E',
    textPrimary: '#E8ECEF',
    textSecondary: '#A0ACB9',
    textMuted: '#6C7A89',
    textAccent: '#E55353',
    link: '#58A6FF',
    linkVisited: '#BC8CFF',
    badgeBg: '#1D2733',
    badgeText: '#89D185',
    officialLokSabhaBg: '#0D381E',
    officialLokSabhaText: '#81C995',
    officialRajyaSabhaBg: '#3E2723',
    officialRajyaSabhaText: '#FDD663',
    officialPibBg: '#174EA6',
    officialPibText: '#8AB4F8',
    officialTenderBg: '#3B0764',
    officialTenderText: '#D8B4FE',
    officialIdexBg: '#0C4A6E',
    officialIdexText: '#7DD3FC'
  },
  // Official Government & Primary Source Badges
  officialBadge: {
    lokSabhaBg: '#064E3B',
    lokSabhaText: '#ECFDF5',
    rajyaSabhaBg: '#78350F',
    rajyaSabhaText: '#FEF3C7',
    pibBg: '#1E3A8A',
    pibText: '#DBEAFE',
    tenderBg: '#701A75',
    tenderText: '#FDF4FF',
    idexBg: '#0F766E',
    idexText: '#CCFBF1'
  },
  // Strategic Program Stages & Domains
  programStage: {
    conceptBg: '#F3F4F6',
    conceptText: '#4B5563',
    sanctionedBg: '#FEF3C7',
    sanctionedText: '#92400E',
    developmentBg: '#DBEAFE',
    developmentText: '#1E40AF',
    trialsBg: '#FFEDD5',
    trialsText: '#9A3412',
    productionBg: '#CCFBF1',
    productionText: '#115E59',
    inductionBg: '#DCFCE7',
    inductionText: '#166534'
  },
  programDomain: {
    aerospace: '#0284C7',
    naval: '#0F766E',
    land: '#854D0E',
    missiles: '#DC2626',
    unmanned: '#7C3AED'
  },
  // Tier Colors
  tier: {
    tier1: '#1E7E34', // Sovereign / Official MoD
    tier1Social: '#0284C7', // Official Social / Operational Handle
    tier2: '#0D6EFD', // National Wire / Accredited
    tier3: '#D97706', // Defence Specialized / Defense Portal
    tier4: '#6C757D'  // Think Tank / OSINT
  }
} as const;

export const CSS_VARS = {
  bgCanvas: 'var(--dw-bg-canvas)',
  bgCard: 'var(--dw-bg-card)',
  bgSecondary: 'var(--dw-bg-secondary)',
  bgHover: 'var(--dw-bg-hover)',
  borderPrimary: 'var(--dw-border-primary)',
  borderSecondary: 'var(--dw-border-secondary)',
  textPrimary: 'var(--dw-text-primary)',
  textSecondary: 'var(--dw-text-secondary)',
  textMuted: 'var(--dw-text-muted)',
  textAccent: 'var(--dw-text-accent)',
  link: 'var(--dw-link)',
  linkVisited: 'var(--dw-link-visited)',
  badgeBg: 'var(--dw-badge-bg)',
  badgeText: 'var(--dw-badge-text)',
  officialLokSabhaBg: 'var(--dw-official-loksabha-bg)',
  officialLokSabhaText: 'var(--dw-official-loksabha-text)',
  officialRajyaSabhaBg: 'var(--dw-official-rajyasabha-bg)',
  officialRajyaSabhaText: 'var(--dw-official-rajyasabha-text)',
  officialPibBg: 'var(--dw-official-pib-bg)',
  officialPibText: 'var(--dw-official-pib-text)',
  officialTenderBg: 'var(--dw-official-tender-bg)',
  officialTenderText: 'var(--dw-official-tender-text)',
  officialIdexBg: 'var(--dw-official-idex-bg)',
  officialIdexText: 'var(--dw-official-idex-text)',
  domainAerospace: 'var(--dw-domain-aerospace)',
  domainNaval: 'var(--dw-domain-naval)',
  domainLand: 'var(--dw-domain-land)',
  domainMissiles: 'var(--dw-domain-missiles)',
  domainUnmanned: 'var(--dw-domain-unmanned)',
  stageConceptBg: 'var(--dw-stage-concept-bg)',
  stageConceptText: 'var(--dw-stage-concept-text)',
  stageSanctionedBg: 'var(--dw-stage-sanctioned-bg)',
  stageSanctionedText: 'var(--dw-stage-sanctioned-text)',
  stageDevBg: 'var(--dw-stage-dev-bg)',
  stageDevText: 'var(--dw-stage-dev-text)',
  stageTrialsBg: 'var(--dw-stage-trials-bg)',
  stageTrialsText: 'var(--dw-stage-trials-text)',
  stageProdBg: 'var(--dw-stage-prod-bg)',
  stageProdText: 'var(--dw-stage-prod-text)',
  stageInductionBg: 'var(--dw-stage-induction-bg)',
  stageInductionText: 'var(--dw-stage-induction-text)',
  statusOfflineBg: 'var(--dw-status-offline-bg)',
  statusOfflineText: 'var(--dw-status-offline-text)',
  statusOnlineBg: 'var(--dw-status-online-bg)',
  statusOnlineText: 'var(--dw-status-online-text)',
  overlayBackdrop: 'var(--dw-overlay-backdrop)',
  overlayBackdropEditor: 'var(--dw-overlay-backdrop-editor)',
  shadowModal: 'var(--dw-shadow-modal)',
  shadowElevationCard: 'var(--dw-shadow-elevation-card)',
  textOnAccent: 'var(--dw-text-on-accent)',
  badgeTintAccent: 'var(--dw-badge-tint-accent)',
  tier1Bg: 'var(--dw-tier-1-bg)',
  tier1Text: 'var(--dw-tier-1-text)',
  tier1SocialBg: 'var(--dw-tier-1-social-bg)',
  tier1SocialText: 'var(--dw-tier-1-social-text)',
  tier2Bg: 'var(--dw-tier-2-bg)',
  tier2Text: 'var(--dw-tier-2-text)',
  tier3Bg: 'var(--dw-tier-3-bg)',
  tier3Text: 'var(--dw-tier-3-text)',
  tier4Bg: 'var(--dw-tier-4-bg)',
  tier4Text: 'var(--dw-tier-4-text)',
  badgeVerifiedBg: 'var(--dw-badge-verified-bg)',
  badgeVerifiedText: 'var(--dw-badge-verified-text)'
} as const;

export type ThemeColors = typeof COLOR_PALETTE.light;
