/**
 * Tier 1 (Official) & Tier 2 (National Wires) Defence Feeds
 * Hard limit: <= 300 LOC.
 */

import { SourceTier } from '../src/types/source.js';
import { FeedConfig } from './feedTypes.js';

export const OFFICIAL_AND_NATIONAL_FEEDS: FeedConfig[] = [
  // Tier 1 — Official Government & Armed Forces
  {
    id: 'feed-pib-mod-en',
    name: 'Press Information Bureau (MoD English)',
    url: 'https://pib.gov.in/RssMain.aspx?ModId=4',
    domain: 'pib.gov.in',
    tier: SourceTier.TIER_1_OFFICIAL,
    defaultCategory: 'official',
    enabled: true,
    timeoutMs: 8000
  },
  {
    id: 'feed-mod-press',
    name: 'Ministry of Defence Press Releases',
    url: 'https://mod.gov.in/rss.xml',
    domain: 'mod.gov.in',
    tier: SourceTier.TIER_1_OFFICIAL,
    defaultCategory: 'official',
    enabled: true,
    timeoutMs: 8000
  },
  {
    id: 'feed-sansad-ls-defence',
    name: 'Sansad Lok Sabha (Defence Q&A)',
    url: 'https://sansad.in/ls/questions/rss?ministry=defence',
    domain: 'sansad.in',
    tier: SourceTier.TIER_1_OFFICIAL,
    defaultCategory: 'official',
    enabled: true,
    timeoutMs: 8000
  },
  {
    id: 'feed-sansad-rs-defence',
    name: 'Sansad Rajya Sabha (Defence Q&A)',
    url: 'https://sansad.in/rs/questions/rss?ministry=defence',
    domain: 'sansad.in',
    tier: SourceTier.TIER_1_OFFICIAL,
    defaultCategory: 'official',
    enabled: true,
    timeoutMs: 8000
  },
  {
    id: 'feed-drdo-news',
    name: 'DRDO Press & Technology Releases',
    url: 'https://drdo.gov.in/rss.xml',
    domain: 'drdo.gov.in',
    tier: SourceTier.TIER_1_OFFICIAL,
    defaultCategory: 'tech',
    enabled: true,
    timeoutMs: 8000
  },
  {
    id: 'feed-ddp-gov',
    name: 'Dept of Defence Production (DDP)',
    url: 'https://www.ddpmod.gov.in/rss.xml',
    domain: 'ddpmod.gov.in',
    tier: SourceTier.TIER_1_OFFICIAL,
    defaultCategory: 'procurement',
    enabled: true,
    timeoutMs: 8000
  },
  {
    id: 'feed-army-adgpi',
    name: 'Indian Army (ADG PI Releases)',
    url: 'https://indianarmy.nic.in/rss/press-releases.xml',
    domain: 'indianarmy.nic.in',
    tier: SourceTier.TIER_1_OFFICIAL,
    defaultCategory: 'army',
    enabled: true,
    timeoutMs: 8000
  },
  {
    id: 'feed-navy-spokesperson',
    name: 'Indian Navy (Spokesperson Releases)',
    url: 'https://indiannavy.nic.in/rss/news.xml',
    domain: 'indiannavy.nic.in',
    tier: SourceTier.TIER_1_OFFICIAL,
    defaultCategory: 'navy',
    enabled: true,
    timeoutMs: 8000
  },
  {
    id: 'feed-iaf-media',
    name: 'Indian Air Force (IAF Media Cell)',
    url: 'https://indianairforce.nic.in/rss/media.xml',
    domain: 'indianairforce.nic.in',
    tier: SourceTier.TIER_1_OFFICIAL,
    defaultCategory: 'airforce',
    enabled: true,
    timeoutMs: 8000
  },

  // Tier 2 — National & Global Wire Services
  {
    id: 'feed-the-hindu-national',
    name: 'The Hindu (National Security)',
    url: 'https://www.thehindu.com/news/national/feeder/default.rss',
    domain: 'thehindu.com',
    tier: SourceTier.TIER_2_NATIONAL,
    defaultCategory: 'strategic',
    enabled: true
  },
  {
    id: 'feed-the-print-defence',
    name: 'ThePrint (Defence & Strategic)',
    url: 'https://theprint.in/category/defence/feed/',
    domain: 'theprint.in',
    tier: SourceTier.TIER_2_NATIONAL,
    defaultCategory: 'strategic',
    enabled: true
  },
  {
    id: 'feed-ani-defence',
    name: 'ANI News (National Defence Wire)',
    url: 'https://www.aninews.in/rss/feed/category/national/defence/',
    domain: 'aninews.in',
    tier: SourceTier.TIER_2_NATIONAL,
    defaultCategory: 'strategic',
    enabled: true
  },
  {
    id: 'feed-indian-express',
    name: 'The Indian Express (India Defence)',
    url: 'https://indianexpress.com/section/india/feed/',
    domain: 'indianexpress.com',
    tier: SourceTier.TIER_2_NATIONAL,
    defaultCategory: 'strategic',
    enabled: true
  },
  {
    id: 'feed-hindustan-times',
    name: 'Hindustan Times (India Security)',
    url: 'https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml',
    domain: 'hindustantimes.com',
    tier: SourceTier.TIER_2_NATIONAL,
    defaultCategory: 'strategic',
    enabled: true
  },
  {
    id: 'feed-times-of-india',
    name: 'Times of India (Defence News)',
    url: 'https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms',
    domain: 'timesofindia.indiatimes.com',
    tier: SourceTier.TIER_2_NATIONAL,
    defaultCategory: 'strategic',
    enabled: true
  },
  {
    id: 'feed-economic-times-defence',
    name: 'Economic Times (Defence Industry)',
    url: 'https://economictimes.indiatimes.com/news/defence/rssfeeds/47348981.cms',
    domain: 'economictimes.indiatimes.com',
    tier: SourceTier.TIER_2_NATIONAL,
    defaultCategory: 'procurement',
    enabled: true
  },
  {
    id: 'feed-financial-express-defence',
    name: 'Financial Express (Defence & Aerospace)',
    url: 'https://www.financialexpress.com/about/defence/feed/',
    domain: 'financialexpress.com',
    tier: SourceTier.TIER_2_NATIONAL,
    defaultCategory: 'procurement',
    enabled: true
  },
  {
    id: 'feed-ndtv-defence',
    name: 'NDTV India (Defence & Border Security)',
    url: 'https://feeds.feedburner.com/ndtvnews-india-news',
    domain: 'ndtv.com',
    tier: SourceTier.TIER_2_NATIONAL,
    defaultCategory: 'strategic',
    enabled: true
  },
  {
    id: 'feed-tribune-india',
    name: 'The Tribune India (National Security)',
    url: 'https://www.tribuneindia.com/rss/nation.aspx',
    domain: 'tribuneindia.com',
    tier: SourceTier.TIER_2_NATIONAL,
    defaultCategory: 'army',
    enabled: true
  },
  {
    id: 'feed-deccan-herald',
    name: 'Deccan Herald (National Affairs)',
    url: 'https://www.deccanherald.com/rss/national.rss',
    domain: 'deccanherald.com',
    tier: SourceTier.TIER_2_NATIONAL,
    defaultCategory: 'strategic',
    enabled: true
  },
  {
    id: 'feed-business-standard-defence',
    name: 'Business Standard (Defence & Security)',
    url: 'https://www.business-standard.com/rss/current-affairs-102.rss',
    domain: 'business-standard.com',
    tier: SourceTier.TIER_2_NATIONAL,
    defaultCategory: 'procurement',
    enabled: true
  },
  {
    id: 'feed-reuters-india',
    name: 'Reuters (India Security & Defence)',
    url: 'https://www.reutersagency.com/feed/?best-topics=world-at-work&post_type=best',
    domain: 'reuters.com',
    tier: SourceTier.TIER_2_NATIONAL,
    defaultCategory: 'strategic',
    enabled: true
  },
  {
    id: 'feed-firstpost-defence',
    name: 'Firstpost (Strategic & Geopolitics)',
    url: 'https://www.firstpost.com/commonfeeds/v1/mfp/rss/india.xml',
    domain: 'firstpost.com',
    tier: SourceTier.TIER_2_NATIONAL,
    defaultCategory: 'strategic',
    enabled: true
  }
];
