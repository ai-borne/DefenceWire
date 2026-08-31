/**
 * Verified Social & Multimedia Intelligence Feeds
 * YouTube Armed Forces Atom Feeds & Official X.com Operational Signal Ingestion Endpoints.
 * Hard limit: <= 300 LOC.
 */

import { SourceTier } from '../src/types/source.js';
import { FeedConfig } from './feedTypes.js';
import { buildXFeedUrl, XHandleMetadata } from './socialNormalizer.js';

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

export const X_OFFICIAL_HANDLES: XHandleMetadata[] = [
  {
    handle: '@adgpi',
    name: 'ADG PI - Indian Army',
    domain: 'x.com',
    defaultCategory: 'army',
    isOfficialGov: true
  },
  {
    handle: '@IAF_MCC',
    name: 'Indian Air Force',
    domain: 'x.com',
    defaultCategory: 'airforce',
    isOfficialGov: true
  },
  {
    handle: '@indiannavy',
    name: 'SpokespersonNavy - Indian Navy',
    domain: 'x.com',
    defaultCategory: 'navy',
    isOfficialGov: true
  },
  {
    handle: '@DRDO_India',
    name: 'DRDO',
    domain: 'x.com',
    defaultCategory: 'tech',
    isOfficialGov: true
  },
  {
    handle: '@DefenceMinIndia',
    name: 'Ministry of Defence',
    domain: 'x.com',
    defaultCategory: 'strategic',
    isOfficialGov: true
  },
  {
    handle: '@NorthernComd_IA',
    name: 'Northern Command Indian Army',
    domain: 'x.com',
    defaultCategory: 'army',
    isOfficialGov: true
  },
  {
    handle: '@EasternCommand_IA',
    name: 'Eastern Command Indian Army',
    domain: 'x.com',
    defaultCategory: 'army',
    isOfficialGov: true
  },
  {
    handle: '@PRODefEast',
    name: 'PRO Defence Eastern Region',
    domain: 'x.com',
    defaultCategory: 'strategic',
    isOfficialGov: true
  }
];

export function createXFeedConfig(
  meta: XHandleMetadata,
  provider?: string,
  customBaseUrl?: string
): FeedConfig {
  const cleanHandle = meta.handle.replace(/^@/, '').toLowerCase();
  return {
    id: `feed-x-${cleanHandle}`,
    name: `${meta.name} (${meta.handle})`,
    url: buildXFeedUrl(meta.handle, provider as any, customBaseUrl),
    domain: 'x.com',
    tier: SourceTier.TIER_1_SOCIAL,
    defaultCategory: meta.defaultCategory,
    enabled: true,
    timeoutMs: 8000
  };
}

export const X_ARMED_FORCES_FEEDS: FeedConfig[] = X_OFFICIAL_HANDLES.map((meta) =>
  createXFeedConfig(meta)
);

export const SOCIAL_FEEDS: FeedConfig[] = [
  ...YOUTUBE_ARMED_FORCES_FEEDS,
  ...X_ARMED_FORCES_FEEDS
];
