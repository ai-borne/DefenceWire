/**
 * Authoritative Indian Defence News Sources Registry
 * Hard limit: <= 300 LOC.
 */

import { NewsSource, SourceTier, TierWeight } from '../types/source.js';

export const TIER_WEIGHTS: Record<SourceTier, TierWeight> = {
  [SourceTier.TIER_1_OFFICIAL]: {
    tier: SourceTier.TIER_1_OFFICIAL,
    authorityWeight: 1.0,
    label: 'Tier 1 — Official Government & Armed Forces'
  },
  [SourceTier.TIER_2_NATIONAL]: {
    tier: SourceTier.TIER_2_NATIONAL,
    authorityWeight: 0.85,
    label: 'Tier 2 — National & Global Wire Services'
  },
  [SourceTier.TIER_3_SPECIALIZED]: {
    tier: SourceTier.TIER_3_SPECIALIZED,
    authorityWeight: 0.7,
    label: 'Tier 3 — Specialized Defence & Aerospace Portals'
  },
  [SourceTier.TIER_4_OSINT]: {
    tier: SourceTier.TIER_4_OSINT,
    authorityWeight: 0.5,
    label: 'Tier 4 — Think Tanks & Strategic OSINT'
  }
};

export const SOURCE_REGISTRY: NewsSource[] = [
  // Tier 1 — Official / Sovereign
  {
    id: 'pib-defence',
    name: 'Press Information Bureau (PIB MoD)',
    domain: 'pib.gov.in',
    tier: SourceTier.TIER_1_OFFICIAL,
    feedUrl: 'https://pib.gov.in/RssMain.aspx?ModId=4',
    isOfficialGov: true
  },
  {
    id: 'mod-gov',
    name: 'Ministry of Defence (MoD)',
    domain: 'mod.gov.in',
    tier: SourceTier.TIER_1_OFFICIAL,
    feedUrl: 'https://mod.gov.in/rss.xml',
    isOfficialGov: true
  },
  {
    id: 'drdo-gov',
    name: 'Defence Research and Development Organisation (DRDO)',
    domain: 'drdo.gov.in',
    tier: SourceTier.TIER_1_OFFICIAL,
    feedUrl: 'https://drdo.gov.in/rss.xml',
    isOfficialGov: true
  },
  {
    id: 'indian-army',
    name: 'ADG PI - Indian Army',
    domain: 'indianarmy.nic.in',
    tier: SourceTier.TIER_1_OFFICIAL,
    isOfficialGov: true
  },
  {
    id: 'indian-navy',
    name: 'SpokespersonNavy - Indian Navy',
    domain: 'indiannavy.nic.in',
    tier: SourceTier.TIER_1_OFFICIAL,
    isOfficialGov: true
  },
  {
    id: 'indian-air-force',
    name: 'Indian Air Force (IAF Media)',
    domain: 'indianairforce.nic.in',
    tier: SourceTier.TIER_1_OFFICIAL,
    isOfficialGov: true
  },

  // Tier 2 — National & Global Wire
  {
    id: 'the-hindu',
    name: 'The Hindu (National Security)',
    domain: 'thehindu.com',
    tier: SourceTier.TIER_2_NATIONAL,
    feedUrl: 'https://www.thehindu.com/news/national/feeder/default.rss',
    isOfficialGov: false
  },
  {
    id: 'the-print',
    name: 'ThePrint (Defence & Strategic Affairs)',
    domain: 'theprint.in',
    tier: SourceTier.TIER_2_NATIONAL,
    feedUrl: 'https://theprint.in/category/defence/feed/',
    isOfficialGov: false
  },
  {
    id: 'ani-news',
    name: 'Asian News International (ANI Defence)',
    domain: 'aninews.in',
    tier: SourceTier.TIER_2_NATIONAL,
    feedUrl: 'https://www.aninews.in/rss/feed/category/national/defence/',
    isOfficialGov: false
  },
  {
    id: 'indian-express',
    name: 'The Indian Express (Defence)',
    domain: 'indianexpress.com',
    tier: SourceTier.TIER_2_NATIONAL,
    feedUrl: 'https://indianexpress.com/section/india/feed/',
    isOfficialGov: false
  },
  {
    id: 'reuters-india',
    name: 'Reuters (India Security)',
    domain: 'reuters.com',
    tier: SourceTier.TIER_2_NATIONAL,
    feedUrl: 'https://www.reutersagency.com/feed/?best-topics=world-at-work&post_type=best',
    isOfficialGov: false
  },
  {
    id: 'hindustan-times',
    name: 'Hindustan Times (India Defence)',
    domain: 'hindustantimes.com',
    tier: SourceTier.TIER_2_NATIONAL,
    feedUrl: 'https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml',
    isOfficialGov: false
  },
  {
    id: 'times-of-india',
    name: 'Times of India (Defence)',
    domain: 'timesofindia.indiatimes.com',
    tier: SourceTier.TIER_2_NATIONAL,
    feedUrl: 'https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms',
    isOfficialGov: false
  },

  // Tier 3 — Specialized Defence Portals
  {
    id: 'livefist',
    name: 'Livefist Defence (Shiv Aroor)',
    domain: 'livefistdefence.com',
    tier: SourceTier.TIER_3_SPECIALIZED,
    feedUrl: 'https://www.livefistdefence.com/feed/',
    isOfficialGov: false
  },
  {
    id: 'idrw',
    name: 'IDRW (Indian Defence Research Wing)',
    domain: 'idrw.org',
    tier: SourceTier.TIER_3_SPECIALIZED,
    feedUrl: 'https://idrw.org/feed/',
    isOfficialGov: false
  },
  {
    id: 'janes',
    name: "Janes Defence (Asia-Pacific)",
    domain: 'janes.com',
    tier: SourceTier.TIER_3_SPECIALIZED,
    isOfficialGov: false
  },
  {
    id: 'naval-news',
    name: 'Naval News (Indian Ocean & Submarines)',
    domain: 'navalnews.com',
    tier: SourceTier.TIER_3_SPECIALIZED,
    feedUrl: 'https://www.navalnews.com/feed/',
    isOfficialGov: false
  },
  {
    id: 'bharat-shakti',
    name: 'Bharat Shakti (Nitin Gokhale)',
    domain: 'bharatshakti.in',
    tier: SourceTier.TIER_3_SPECIALIZED,
    feedUrl: 'https://bharatshakti.in/feed/',
    isOfficialGov: false
  },
  {
    id: 'force-india',
    name: 'Force Magazine (Pravin Sawhney)',
    domain: 'forceindia.net',
    tier: SourceTier.TIER_3_SPECIALIZED,
    feedUrl: 'https://forceindia.net/feed/',
    isOfficialGov: false
  },

  // Tier 4 — Think Tanks & Strategic OSINT
  {
    id: 'idsa',
    name: 'Manohar Parrikar IDSA',
    domain: 'idsa.in',
    tier: SourceTier.TIER_4_OSINT,
    feedUrl: 'https://www.idsa.in/rss.xml',
    isOfficialGov: false
  },
  {
    id: 'orf',
    name: 'Observer Research Foundation (ORF)',
    domain: 'orfonline.org',
    tier: SourceTier.TIER_4_OSINT,
    feedUrl: 'https://www.orfonline.org/feed',
    isOfficialGov: false
  },
  {
    id: 'usi-india',
    name: 'United Service Institution of India (USI)',
    domain: 'usiofindia.org',
    tier: SourceTier.TIER_4_OSINT,
    isOfficialGov: false
  },
  {
    id: 'claws',
    name: 'Centre for Land Warfare Studies (CLAWS)',
    domain: 'claws.in',
    tier: SourceTier.TIER_4_OSINT,
    isOfficialGov: false
  },
  {
    id: 'nmf',
    name: 'National Maritime Foundation (NMF)',
    domain: 'maritimeindia.org',
    tier: SourceTier.TIER_4_OSINT,
    isOfficialGov: false
  }
];

/**
 * Extracts and cleans hostname domain from any URL string.
 */
export function extractDomain(urlOrDomain: string): string {
  if (!urlOrDomain || typeof urlOrDomain !== 'string') {
    return '';
  }
  try {
    const url = urlOrDomain.startsWith('http://') || urlOrDomain.startsWith('https://')
      ? urlOrDomain
      : `https://${urlOrDomain}`;
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname.replace(/^www\./, '');
  } catch {
    return urlOrDomain.toLowerCase().replace(/^www\./, '').split('/')[0] || '';
  }
}

/**
 * Looks up a NewsSource by domain name with suffix matching.
 */
export function getSourceByDomain(domainOrUrl: string): NewsSource | undefined {
  const cleanDomain = extractDomain(domainOrUrl);
  if (!cleanDomain) {
    return undefined;
  }
  return SOURCE_REGISTRY.find(
    s => s.domain === cleanDomain || cleanDomain.endsWith(`.${s.domain}`) || s.domain.endsWith(`.${cleanDomain}`)
  );
}

/**
 * Retrieves the SourceTier for a given domain/URL. Defaults to TIER_4_OSINT if unknown.
 */
export function getSourceTier(domainOrUrl: string): SourceTier {
  const source = getSourceByDomain(domainOrUrl);
  return source ? source.tier : SourceTier.TIER_4_OSINT;
}

/**
 * Gets the numeric authority weight (0.0 to 1.0) for a given SourceTier.
 */
export function getTierAuthorityWeight(tier: SourceTier): number {
  const info = TIER_WEIGHTS[tier];
  return info ? info.authorityWeight : 0.5;
}

/**
 * Returns all registered sources.
 */
export function getAllSources(): NewsSource[] {
  return [...SOURCE_REGISTRY];
}
