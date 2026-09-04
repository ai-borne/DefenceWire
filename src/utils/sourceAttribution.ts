/**
 * Source Attribution & Geopolitical Scope Resolver for DefenceWire.in
 * Consolidates domestic (🇮🇳) vs global (🌏) scope flags, official badges,
 * clean brand source names, and relative timestamps into a single top line.
 * Hard limit: <= 300 LOC. Target: < 150 LOC.
 */

import { StorySourceItem } from '../types/news.js';
import { SourceTier } from '../types/source.js';
import { STRINGS } from '../resources/strings.js';
import { sanitizePlainText } from './security.js';
import { cleanSourceName } from './snippetCleaner.js';
import { formatTimeAgo } from './dateUtils.js';
import { renderOfficialBadge, resolveOfficialType } from '../components/OfficialBadge.js';

export type GeopoliticalScope = 'domestic' | 'global';

/** Curated international defence domains and foreign media outlets */
const INTERNATIONAL_DOMAINS = new Set([
  'defensenews.com',
  'twz.com',
  'aviationweek.com',
  'defenseone.com',
  'shephardmedia.com',
  'airandspaceforces.com',
  'janes.com',
  'sipri.org',
  'iiss.org',
  'csis.org',
  'usni.org',
  'navalnews.com',
  'naval-technology.com',
  'airforce-technology.com',
  'breakingdefense.com',
  'reuters.com',
  'bbc.com',
  'bbc.co.uk',
  'aljazeera.com',
  'theguardian.com',
  'ft.com',
  'wsj.com',
  'bloomberg.com',
  'apnews.com',
  'afp.com',
  'kyodonews.net',
  'scmp.com',
  'japantimes.co.jp',
  'taipeitimes.com',
  'defense-aerospace.com',
  'defense-update.com',
  'overtdefense.com'
]);

/** Indian domestic defence and security domains without standard .in TLD */
const DOMESTIC_DOMAINS = new Set([
  'thehindu.com',
  'hindustantimes.com',
  'timesofindia.indiatimes.com',
  'timesofindia.com',
  'idrw.org',
  'livefistdefence.com',
  'forceindia.net',
  'usiofindia.org',
  'orfonline.org',
  'claws.in',
  'maritimeindia.org',
  'bharatshakti.in',
  'sansad.in',
  'indianexpress.com'
]);

/** Regex detecting domestic Indian institutional source names */
const DOMESTIC_NAME_PATTERN = /(?:pib|drdo|mod|indian\s+army|indian\s+navy|indian\s+air\s+force|adg\s+pi|the\s+hindu|theprint|ani|indian\s+express|livefist|idrw|bharat\s+shakti|force\s+india|idsa|orf|usi|claws|nmf|hindustan\s+times|times\s+of\s+india)/i;

/**
 * Extracts normalized hostname domain from sourceDomain or URL.
 */
function extractCleanDomain(domainOrUrl?: string): string {
  if (!domainOrUrl || typeof domainOrUrl !== 'string') return '';
  try {
    const raw = domainOrUrl.startsWith('http://') || domainOrUrl.startsWith('https://')
      ? domainOrUrl
      : `https://${domainOrUrl}`;
    return new URL(raw).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return domainOrUrl.toLowerCase().replace(/^www\./, '').split('/')[0] || '';
  }
}

/**
 * Resolves domestic (Indian) vs global geopolitical scope for a story source item.
 */
export function resolveGeopoliticalScope(
  source?: Partial<StorySourceItem> | null
): GeopoliticalScope {
  if (!source) return 'domestic';

  // 1. Explicit official badge or parliament metadata is sovereign domestic
  if (source.officialType || source.parliamentMeta) return 'domestic';
  if (source.tier === SourceTier.TIER_1_OFFICIAL || source.tier === SourceTier.TIER_1_SOCIAL) return 'domestic';
  if (resolveOfficialType(source as StorySourceItem) !== null) return 'domestic';

  // 2. Domain classification
  const domain = extractCleanDomain(source.sourceDomain || source.url);
  if (domain) {
    if (INTERNATIONAL_DOMAINS.has(domain)) return 'global';
    if (domain.endsWith('.in') || domain.endsWith('.nic.in') || domain.endsWith('.gov.in')) return 'domestic';
    if (DOMESTIC_DOMAINS.has(domain)) return 'domestic';
  }

  // 3. Name-based signal fallback
  if (source.sourceName && DOMESTIC_NAME_PATTERN.test(source.sourceName)) {
    return 'domestic';
  }

  // 4. Default: If it has an unrecognized non-.in domain, classify as global; otherwise domestic
  if (domain && !domain.endsWith('.in')) {
    return 'global';
  }

  return 'domestic';
}

/**
 * Returns geopolitical flag emoji string SSOT.
 */
export function getGeopoliticalFlag(scope: GeopoliticalScope): string {
  return scope === 'domestic' ? STRINGS.story.domesticFlag : STRINGS.story.globalFlag;
}

/**
 * Renders consolidated top attribution line:
 * [Flag (🇮🇳 / 🌏)] [Official Badge / Source Name] • [Relative Time Ago]
 */
export function renderSourceAttribution(source: StorySourceItem): HTMLElement {
  const container = document.createElement('div');
  container.className = 'dw-source-attribution';

  // 1. Geopolitical Scope Flag
  const scope = resolveGeopoliticalScope(source);
  const flagSpan = document.createElement('span');
  flagSpan.className = 'dw-source-flag';
  flagSpan.textContent = getGeopoliticalFlag(scope);
  flagSpan.setAttribute('aria-label', scope === 'domestic' ? 'Domestic (India)' : 'International / Global');
  flagSpan.setAttribute('title', scope === 'domestic' ? 'Domestic Indian Source' : 'International Source');
  container.appendChild(flagSpan);

  // 2. Official Badge OR Source Name
  const officialBadgeEl = renderOfficialBadge(source);
  if (officialBadgeEl) {
    container.appendChild(officialBadgeEl);
  } else {
    const sourceNameEl = document.createElement('span');
    sourceNameEl.className = 'dw-source-name';
    sourceNameEl.textContent = sanitizePlainText(cleanSourceName(source.sourceName || source.sourceDomain || 'Source'));
    container.appendChild(sourceNameEl);
  }

  // 3. Relative Time Ago
  const timeSpan = document.createElement('span');
  timeSpan.className = 'dw-river-meta dw-attribution-time';
  timeSpan.textContent = `• ${formatTimeAgo(source.publishedAt)}`;
  container.appendChild(timeSpan);

  return container;
}
