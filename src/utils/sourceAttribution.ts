/**
 * Geopolitical Flag Resolution & Source Attribution DOM Factory
 * Assembles unified top attribution lines: [🇮🇳 / 🌏] [Official Badge or Source Name] • [Relative Time].
 * Hard limit: <= 300 LOC.
 */

import { StorySourceItem } from '../types/news.js';
import { STRINGS } from '../resources/strings.js';
import { sanitizePlainText } from './security.js';
import { cleanSourceName } from './snippetCleaner.js';
import { formatTimeAgo } from './dateUtils.js';
import { renderOfficialBadge } from '../components/OfficialBadge.js';

/**
 * Known Indian national media, defence portals, and research institutions.
 */
const INDIAN_DOMAINS = new Set([
  'thehindu.com',
  'theprint.in',
  'aninews.in',
  'indianexpress.com',
  'hindustantimes.com',
  'timesofindia.indiatimes.com',
  'indiatimes.com',
  'livefistdefence.com',
  'idrw.org',
  'bharatshakti.in',
  'forceindia.net',
  'idsa.in',
  'orfonline.org',
  'usiofindia.org',
  'claws.in',
  'maritimeindia.org',
  'tribuneindia.com',
  'deccanherald.com',
  'business-standard.com',
  'ddnews.gov.in'
]);

/**
 * Curated international defence intelligence and global wire domains.
 */
const INTERNATIONAL_DOMAINS = new Set([
  'reuters.com',
  'janes.com',
  'defensenews.com',
  'twz.com',
  'aviationweek.com',
  'defenseone.com',
  'shephardmedia.com',
  'airandspaceforces.com',
  'armadainternational.com',
  'asianmilitaryreview.com',
  'sipri.org',
  'navalnews.com',
  'usni.org',
  'naval-technology.com',
  'airforce-technology.com',
  'breakingdefense.com',
  'csis.org',
  'iiss.org',
  'bbc.com',
  'bbc.co.uk',
  'aljazeera.com',
  'bloomberg.com',
  'ft.com',
  'wsj.com',
  'defense.gov',
  'mod.uk'
]);

/**
 * Cleans and normalizes domain or URL to bare hostname.
 */
function cleanHostname(domainOrUrl: string): string {
  if (!domainOrUrl || typeof domainOrUrl !== 'string') {
    return '';
  }
  let str = domainOrUrl.trim().toLowerCase();
  if (str.includes('://')) {
    try {
      str = new URL(str).hostname;
    } catch {
      str = str.split('/')[2] || str;
    }
  }
  return str.replace(/^www\./, '').split('/')[0] || '';
}

/**
 * Resolves whether a story source is Indian sovereign/national (🇮🇳) or foreign/international (🌏).
 */
export function resolveGeopoliticalScope(source: StorySourceItem): string {
  if (!source) {
    return STRINGS.story.domesticFlag;
  }

  // 1. Parliament questions and official government types are strictly sovereign Indian
  if (source.parliamentMeta || source.officialType) {
    return STRINGS.story.domesticFlag;
  }

  const domain = cleanHostname(source.sourceDomain || source.url || '');
  const name = (source.sourceName || '').toLowerCase().trim();

  // 2. Explicit International Domain check (takes precedence over generic "India" beat titles in foreign wires)
  if (INTERNATIONAL_DOMAINS.has(domain)) {
    return STRINGS.story.globalFlag;
  }
  for (const intDomain of INTERNATIONAL_DOMAINS) {
    if (domain.endsWith(`.${intDomain}`)) {
      return STRINGS.story.globalFlag;
    }
  }

  // 3. Indian TLD and sovereign domains (.in, .gov.in, .nic.in, etc.)
  if (
    domain.endsWith('.in') ||
    domain.includes('.gov.in') ||
    domain.includes('.nic.in') ||
    INDIAN_DOMAINS.has(domain)
  ) {
    return STRINGS.story.domesticFlag;
  }

  // 4. Subdomain check for known Indian domains
  for (const indianDomain of INDIAN_DOMAINS) {
    if (domain.endsWith(`.${indianDomain}`)) {
      return STRINGS.story.domesticFlag;
    }
  }

  // 5. Source name keywords indicating Indian origin
  if (
    name.includes('pib') ||
    name.includes('mod') ||
    name.includes('drdo') ||
    name.includes('ani') ||
    name.includes('the hindu') ||
    name.includes('theprint') ||
    name.includes('livefist') ||
    name.includes('idrw') ||
    name.includes('bharat') ||
    name.includes('armed forces') ||
    name.includes('indian army') ||
    name.includes('indian navy') ||
    name.includes('indian air force') ||
    name.includes('lok sabha') ||
    name.includes('rajya sabha')
  ) {
    return STRINGS.story.domesticFlag;
  }

  // 6. Foreign / International source default
  return STRINGS.story.globalFlag;
}

/**
 * Renders the consolidated top attribution line for a story cluster card.
 * Assembles [Flag] [Official Badge or Source Name] • [Relative Time].
 */
export function renderSourceAttribution(source: StorySourceItem): HTMLElement {
  const container = document.createElement('div');
  container.className = 'dw-source-attribution';

  // 1. Geopolitical Flag
  const flag = resolveGeopoliticalScope(source);
  const flagSpan = document.createElement('span');
  flagSpan.className = 'dw-geo-flag';
  flagSpan.textContent = flag;
  container.appendChild(flagSpan);

  // 2. Official Badge OR Source Name
  const officialBadge = renderOfficialBadge(source);
  if (officialBadge) {
    container.appendChild(officialBadge);
  } else {
    const sourceNameEl = document.createElement('span');
    sourceNameEl.className = 'dw-source-name';
    sourceNameEl.textContent = sanitizePlainText(cleanSourceName(source.sourceName));
    container.appendChild(sourceNameEl);
  }

  // 3. Relative Time
  if (source.publishedAt) {
    const timeSpan = document.createElement('span');
    timeSpan.className = 'dw-river-meta';
    timeSpan.textContent = `• ${formatTimeAgo(source.publishedAt)}`;
    container.appendChild(timeSpan);
  }

  return container;
}
