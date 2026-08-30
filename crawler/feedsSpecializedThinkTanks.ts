/**
 * Tier 3 (Specialized Portals) & Tier 4 (Think Tanks & OSINT) Feeds
 * Hard limit: <= 300 LOC.
 */

import { SourceTier } from '../src/types/source.js';
import { FeedConfig } from './feedTypes.js';

export const SPECIALIZED_AND_THINKTANK_FEEDS: FeedConfig[] = [
  // Tier 3 — Specialized Defence & Aerospace
  {
    id: 'feed-livefist-defence',
    name: 'Livefist Defence (Shiv Aroor)',
    url: 'https://www.livefistdefence.com/feed/',
    domain: 'livefistdefence.com',
    tier: SourceTier.TIER_3_SPECIALIZED,
    defaultCategory: 'tech',
    enabled: true
  },
  {
    id: 'feed-idrw',
    name: 'IDRW (Indian Defence Research Wing)',
    url: 'https://idrw.org/feed/',
    domain: 'idrw.org',
    tier: SourceTier.TIER_3_SPECIALIZED,
    defaultCategory: 'tech',
    enabled: true
  },
  {
    id: 'feed-naval-news',
    name: 'Naval News (Indo-Pacific & Submarines)',
    url: 'https://www.navalnews.com/feed/',
    domain: 'navalnews.com',
    tier: SourceTier.TIER_3_SPECIALIZED,
    defaultCategory: 'navy',
    enabled: true
  },
  {
    id: 'feed-bharat-shakti',
    name: 'Bharat Shakti (Nitin Gokhale)',
    url: 'https://bharatshakti.in/feed/',
    domain: 'bharatshakti.in',
    tier: SourceTier.TIER_3_SPECIALIZED,
    defaultCategory: 'strategic',
    enabled: true
  },
  {
    id: 'feed-force-india',
    name: 'Force Magazine (Defence & Security)',
    url: 'https://forceindia.net/feed/',
    domain: 'forceindia.net',
    tier: SourceTier.TIER_3_SPECIALIZED,
    defaultCategory: 'tech',
    enabled: true
  },
  {
    id: 'feed-raksha-anirveda',
    name: 'Raksha Anirveda (Military Technology)',
    url: 'https://raksha-anirveda.com/feed/',
    domain: 'raksha-anirveda.com',
    tier: SourceTier.TIER_3_SPECIALIZED,
    defaultCategory: 'tech',
    enabled: true
  },
  {
    id: 'feed-sps-land-forces',
    name: "SP's Land Forces",
    url: 'https://www.spslandforces.com/rss.xml',
    domain: 'spslandforces.com',
    tier: SourceTier.TIER_3_SPECIALIZED,
    defaultCategory: 'army',
    enabled: true
  },
  {
    id: 'feed-sps-aviation',
    name: "SP's Aviation",
    url: 'https://www.sps-aviation.com/rss.xml',
    domain: 'sps-aviation.com',
    tier: SourceTier.TIER_3_SPECIALIZED,
    defaultCategory: 'airforce',
    enabled: true
  },
  {
    id: 'feed-sps-naval',
    name: "SP's Naval Forces",
    url: 'https://www.spsnavalforces.com/rss.xml',
    domain: 'spsnavalforces.com',
    tier: SourceTier.TIER_3_SPECIALIZED,
    defaultCategory: 'navy',
    enabled: true
  },
  {
    id: 'feed-vayu-aerospace',
    name: 'Vayu Aerospace & Defence Review',
    url: 'https://vayuaerospace.in/feed/',
    domain: 'vayuaerospace.in',
    tier: SourceTier.TIER_3_SPECIALIZED,
    defaultCategory: 'airforce',
    enabled: true
  },
  {
    id: 'feed-frontier-india',
    name: 'Frontier India Strategic Affairs',
    url: 'https://frontierindia.com/feed/',
    domain: 'frontierindia.com',
    tier: SourceTier.TIER_3_SPECIALIZED,
    defaultCategory: 'strategic',
    enabled: true
  },
  {
    id: 'feed-def-aviation-post',
    name: 'Defence Aviation Post',
    url: 'https://defenceaviationpost.com/feed/',
    domain: 'defenceaviationpost.com',
    tier: SourceTier.TIER_3_SPECIALIZED,
    defaultCategory: 'tech',
    enabled: true
  },

  // Tier 4 — Think Tanks & Strategic OSINT
  {
    id: 'feed-idsa-research',
    name: 'Manohar Parrikar IDSA',
    url: 'https://www.idsa.in/rss.xml',
    domain: 'idsa.in',
    tier: SourceTier.TIER_4_OSINT,
    defaultCategory: 'strategic',
    enabled: true
  },
  {
    id: 'feed-orf-strategic',
    name: 'Observer Research Foundation (ORF)',
    url: 'https://www.orfonline.org/feed',
    domain: 'orfonline.org',
    tier: SourceTier.TIER_4_OSINT,
    defaultCategory: 'strategic',
    enabled: true
  },
  {
    id: 'feed-usi-india',
    name: 'United Service Institution of India (USI)',
    url: 'https://usiofindia.org/rss/articles.xml',
    domain: 'usiofindia.org',
    tier: SourceTier.TIER_4_OSINT,
    defaultCategory: 'strategic',
    enabled: true
  },
  {
    id: 'feed-claws-india',
    name: 'Centre for Land Warfare Studies (CLAWS)',
    url: 'https://www.claws.in/feed/',
    domain: 'claws.in',
    tier: SourceTier.TIER_4_OSINT,
    defaultCategory: 'army',
    enabled: true
  },
  {
    id: 'feed-caps-india',
    name: 'Centre for Air Power Studies (CAPS)',
    url: 'https://capsindia.org/feed/',
    domain: 'capsindia.org',
    tier: SourceTier.TIER_4_OSINT,
    defaultCategory: 'airforce',
    enabled: true
  },
  {
    id: 'feed-nmf-maritime',
    name: 'National Maritime Foundation (NMF)',
    url: 'https://maritimeindia.org/feed/',
    domain: 'maritimeindia.org',
    tier: SourceTier.TIER_4_OSINT,
    defaultCategory: 'navy',
    enabled: true
  },
  {
    id: 'feed-chanakya-forum',
    name: 'Chanakya Forum (National Security)',
    url: 'https://chanakyaforum.com/feed/',
    domain: 'chanakyaforum.com',
    tier: SourceTier.TIER_4_OSINT,
    defaultCategory: 'strategic',
    enabled: true
  },
  {
    id: 'feed-delhi-policy-group',
    name: 'Delhi Policy Group (Strategic)',
    url: 'https://www.delhipolicygroup.org/rss.xml',
    domain: 'delhipolicygroup.org',
    tier: SourceTier.TIER_4_OSINT,
    defaultCategory: 'strategic',
    enabled: true
  },
  {
    id: 'feed-takshashila-strategic',
    name: 'Takshashila Strategic Affairs',
    url: 'https://takshashila.org.in/feed',
    domain: 'takshashila.org.in',
    tier: SourceTier.TIER_4_OSINT,
    defaultCategory: 'strategic',
    enabled: true
  },
  {
    id: 'feed-stratnews-global',
    name: 'StratNews Global (Nitin Gokhale)',
    url: 'https://stratnewsglobal.com/feed/',
    domain: 'stratnewsglobal.com',
    tier: SourceTier.TIER_4_OSINT,
    defaultCategory: 'strategic',
    enabled: true
  },
  {
    id: 'feed-eurasian-times-defence',
    name: 'The EurAsian Times (Defence & Military)',
    url: 'https://www.eurasiantimes.com/feed/',
    domain: 'eurasiantimes.com',
    tier: SourceTier.TIER_4_OSINT,
    defaultCategory: 'tech',
    enabled: true
  }
];
