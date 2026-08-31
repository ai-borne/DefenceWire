/**
 * Verified Social & Multimedia Intelligence Feeds
 * YouTube Armed Forces Atom Feeds & Official Social Ingestion Endpoints.
 * Hard limit: <= 300 LOC.
 */

import { SourceTier } from '../src/types/source.js';
import { FeedConfig } from './feedTypes.js';

export const YOUTUBE_ARMED_FORCES_FEEDS: FeedConfig[] = [
  {
    id: 'feed-youtube-drdo',
    name: 'DRDO India (Official YouTube)',
    url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCV9WiohwtfgSwHAar039sNw',
    domain: 'youtube.com',
    tier: SourceTier.TIER_1_SOCIAL,
    defaultCategory: 'tech',
    enabled: true,
    timeoutMs: 8000
  },
  {
    id: 'feed-youtube-army',
    name: 'ADG PI - Indian Army (Official YouTube)',
    url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UClnMEy7EJWhtWPINNygT_jg',
    domain: 'youtube.com',
    tier: SourceTier.TIER_1_SOCIAL,
    defaultCategory: 'army',
    enabled: true,
    timeoutMs: 8000
  },
  {
    id: 'feed-youtube-iaf',
    name: 'Indian Air Force (Official YouTube)',
    url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC5jeeBnawh1VvE5yTB5bQHw',
    domain: 'youtube.com',
    tier: SourceTier.TIER_1_SOCIAL,
    defaultCategory: 'airforce',
    enabled: true,
    timeoutMs: 8000
  },
  {
    id: 'feed-youtube-navy',
    name: 'Indian Navy (Official YouTube)',
    url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCbtFn_Ml8HuQ7nGHQ2LTQZg',
    domain: 'youtube.com',
    tier: SourceTier.TIER_1_SOCIAL,
    defaultCategory: 'navy',
    enabled: true,
    timeoutMs: 8000
  },
  {
    id: 'feed-youtube-mod',
    name: 'Ministry of Defence India (Official YouTube)',
    url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCtHnxLd8OMR-7yILSyNa_Tg',
    domain: 'youtube.com',
    tier: SourceTier.TIER_1_SOCIAL,
    defaultCategory: 'strategic',
    enabled: true,
    timeoutMs: 8000
  },
  {
    id: 'feed-youtube-pib',
    name: 'PIB India (Official YouTube)',
    url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCGn6a5SI8SNlj7WylmPD6GQ',
    domain: 'youtube.com',
    tier: SourceTier.TIER_1_SOCIAL,
    defaultCategory: 'strategic',
    enabled: true,
    timeoutMs: 8000
  }
];

export const SOCIAL_FEEDS: FeedConfig[] = [
  ...YOUTUBE_ARMED_FORCES_FEEDS
];
