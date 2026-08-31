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
    badgeText: '#2B2B28'
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
    badgeText: '#89D185'
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
  statusOfflineBg: 'var(--dw-status-offline-bg)',
  statusOfflineText: 'var(--dw-status-offline-text)',
  statusOnlineBg: 'var(--dw-status-online-bg)',
  statusOnlineText: 'var(--dw-status-online-text)'
} as const;


export type ThemeColors = typeof COLOR_PALETTE.light;
