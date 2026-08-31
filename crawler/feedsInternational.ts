/**
 * Curated Top-Tier International Defence & Aerospace Feeds
 * Reputed global institutional sources for Indo-Pacific and international military tracking.
 * Hard limit: <= 300 LOC.
 */

import { SourceTier } from '../src/types/source.js';
import { FeedConfig } from './feedTypes.js';

export const INTERNATIONAL_DEFENCE_FEEDS: FeedConfig[] = [
  {
    id: 'feed-defense-news',
    name: 'Defense News (Global Top 100)',
    url: 'https://www.defensenews.com/arc/outboundfeeds/rss/?outputType=xml',
    domain: 'defensenews.com',
    tier: SourceTier.TIER_3_SPECIALIZED,
    defaultCategory: 'procurement',
    enabled: true
  },
  {
    id: 'feed-the-war-zone',
    name: 'The War Zone (TWZ)',
    url: 'https://www.twz.com/feed',
    domain: 'twz.com',
    tier: SourceTier.TIER_3_SPECIALIZED,
    defaultCategory: 'tech',
    enabled: true
  },
  {
    id: 'feed-aviation-week',
    name: 'Aviation Week Defence',
    url: 'https://aviationweek.com/rss.xml',
    domain: 'aviationweek.com',
    tier: SourceTier.TIER_3_SPECIALIZED,
    defaultCategory: 'airforce',
    enabled: true
  },
  {
    id: 'feed-defense-one',
    name: 'Defense One',
    url: 'https://www.defenseone.com/rss/all/',
    domain: 'defenseone.com',
    tier: SourceTier.TIER_3_SPECIALIZED,
    defaultCategory: 'strategic',
    enabled: true
  },
  {
    id: 'feed-shephard-media',
    name: 'Shephard Media',
    url: 'https://www.shephardmedia.com/news/rss/',
    domain: 'shephardmedia.com',
    tier: SourceTier.TIER_3_SPECIALIZED,
    defaultCategory: 'tech',
    enabled: true
  },
  {
    id: 'feed-air-space-forces',
    name: 'Air & Space Forces Magazine',
    url: 'https://www.airandspaceforces.com/feed/',
    domain: 'airandspaceforces.com',
    tier: SourceTier.TIER_3_SPECIALIZED,
    defaultCategory: 'airforce',
    enabled: true
  },
  {
    id: 'feed-armada-international',
    name: 'Armada International (EW & Land Systems)',
    url: 'https://www.armadainternational.com/feed/',
    domain: 'armadainternational.com',
    tier: SourceTier.TIER_3_SPECIALIZED,
    defaultCategory: 'army',
    enabled: true
  },
  {
    id: 'feed-asian-military-review',
    name: 'Asian Military Review (Indo-Pacific)',
    url: 'https://www.asianmilitaryreview.com/feed/',
    domain: 'asianmilitaryreview.com',
    tier: SourceTier.TIER_3_SPECIALIZED,
    defaultCategory: 'strategic',
    enabled: true
  },
  {
    id: 'feed-janes-intelligence',
    name: "Janes Defence Intelligence",
    url: 'https://www.janes.com/defence-news/rss',
    domain: 'janes.com',
    tier: SourceTier.TIER_4_OSINT,
    defaultCategory: 'strategic',
    enabled: true
  },
  {
    id: 'feed-sipri-org',
    name: 'SIPRI (Stockholm Peace Research)',
    url: 'https://www.sipri.org/rss.xml',
    domain: 'sipri.org',
    tier: SourceTier.TIER_4_OSINT,
    defaultCategory: 'strategic',
    enabled: true
  }
];
