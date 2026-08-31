/**
 * Social Intelligence Normalizer & Sanitizer for X.com / Twitter & Armed Forces Signals
 * Sanitizes tweet text, strips t.co tracking links, removes trailing noise hashtags,
 * synthesizes clean headlines, and normalizes social items into StorySourceItem schema.
 * Hard limit: <= 300 LOC.
 */

import { StorySourceItem } from '../src/types/news.js';
import { SourceTier } from '../src/types/source.js';
import { decodeHtmlEntities, isValidUrl, sanitizePlainText } from '../src/utils/security.js';

export type XFeedProvider = 'rss_bridge' | 'nitter' | 'twitterapi' | 'cf_browser';

export interface XHandleMetadata {
  handle: string;
  name: string;
  domain: string;
  defaultCategory: 'army' | 'navy' | 'airforce' | 'tech' | 'strategic';
  isOfficialGov: boolean;
}

const TCO_TRACKING_REGEX = /https?:\/\/t\.co\/[a-zA-Z0-9_-]+/gi;
const GENERIC_TRACKER_REGEX = /https?:\/\/(?:bit\.ly|tinyurl\.com|ow\.ly|buff\.ly)\/[a-zA-Z0-9_-]+/gi;
const TWITTER_AUTHOR_PREFIX_REGEX = /^(?:(?:ADG\s+PI|IAF|Indian\s+Navy|DRDO|MoD|PRO\s+Def|Spokesperson)[^:]*:\s*|X\s*\/\s*[\w]+:\s*|@[\w]+\s*:\s*)/i;
const TRAILING_HASHTAGS_REGEX = /(?:\s*#[a-zA-Z0-9_]+)+\s*$/i;

/**
 * Strips t.co and other URL shortener tracking links from tweet text.
 */
export function stripTrackingUrls(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(TCO_TRACKING_REGEX, '')
    .replace(GENERIC_TRACKER_REGEX, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Decodes HTML entities, strips tracking links, and normalizes spacing.
 */
export function normalizeSocialText(text: string): string {
  if (!text || typeof text !== 'string') return '';
  const decoded = decodeHtmlEntities(text);
  const withoutTrackers = stripTrackingUrls(decoded);
  return sanitizePlainText(withoutTrackers);
}

/**
 * Extracts a clean, single-line headline from raw tweet text.
 * Strips leading handle prefixes and trailing hashtag blocks, preserving core semantic text.
 */
export function cleanTweetHeadline(rawText: string, maxLen = 140): string {
  if (!rawText || typeof rawText !== 'string') return '';

  let cleaned = decodeHtmlEntities(rawText);
  cleaned = stripTrackingUrls(cleaned);
  cleaned = cleaned.replace(TWITTER_AUTHOR_PREFIX_REGEX, '').trim();
  cleaned = cleaned.replace(TRAILING_HASHTAGS_REGEX, '').trim();
  cleaned = sanitizePlainText(cleaned);

  if (cleaned.length <= maxLen) {
    return cleaned;
  }

  // Extract first complete sentence if available
  const sentenceMatch = cleaned.match(/^([^.!?]+[.!?])/);
  if (sentenceMatch?.[1] && sentenceMatch[1].length >= 30 && sentenceMatch[1].length <= maxLen) {
    return sentenceMatch[1].trim();
  }

  // Truncate at word boundary
  const sub = cleaned.slice(0, maxLen);
  const lastSpace = sub.lastIndexOf(' ');
  if (lastSpace > 30) {
    return `${sub.slice(0, lastSpace)}...`;
  }

  return `${sub}...`;
}

/**
 * Extracts a Twitter/X handle from a handle string or status URL.
 */
export function extractSocialHandle(textOrUrl: string): string | null {
  if (!textOrUrl || typeof textOrUrl !== 'string') return null;

  const urlMatch = textOrUrl.match(/(?:x\.com|twitter\.com|nitter\.[a-z]+)\/([a-zA-Z0-9_]{1,25})/i);
  if (urlMatch?.[1]) {
    return `@${urlMatch[1]}`;
  }

  const handleMatch = textOrUrl.match(/@([a-zA-Z0-9_]{1,25})/);
  if (handleMatch?.[1]) {
    return `@${handleMatch[1]}`;
  }

  return null;
}

/**
 * Constructs a syndicated feed URL for an official X handle based on provider strategy.
 */
export function buildXFeedUrl(
  handle: string,
  provider: XFeedProvider = 'rss_bridge',
  customBaseUrl?: string
): string {
  const cleanHandle = handle.replace(/^@/, '');
  const envProvider = (process.env.X_FEED_PROVIDER as XFeedProvider) || provider;
  const envBase = process.env.X_RSS_BRIDGE_BASE_URL || process.env.X_FEED_BASE_URL || customBaseUrl;

  switch (envProvider) {
    case 'nitter': {
      const base = envBase || 'https://nitter.net';
      const cleanBase = base.replace(/\/+$/, '');
      return `${cleanBase}/${cleanHandle}/rss`;
    }
    case 'twitterapi': {
      const base = envBase || 'https://api.twitterapi.io/twitter/user/last_tweets';
      return `${base}?userName=${cleanHandle}`;
    }
    case 'cf_browser': {
      const base = envBase || 'https://browser-render.defencewire.in/x';
      return `${base}?handle=${cleanHandle}&format=atom`;
    }
    case 'rss_bridge':
    default: {
      const base = envBase || 'https://rss-bridge.defencewire.in';
      const cleanBase = base.replace(/\/+$/, '');
      return `${cleanBase}/?action=display&bridge=TwitterBridge&context=By+username&u=${cleanHandle}&format=Atom`;
    }
  }
}

/**
 * Normalizes a StorySourceItem originating from a social feed.
 */
export function normalizeSocialPostItem(
  item: StorySourceItem,
  handleMeta?: Partial<XHandleMetadata>
): StorySourceItem {
  const cleanTitle = cleanTweetHeadline(item.title);
  const cleanSnippet = normalizeSocialText(item.snippet || item.title).slice(0, 260);

  // Determine handle
  const handle =
    handleMeta?.handle ||
    extractSocialHandle(item.sourceName) ||
    extractSocialHandle(item.url) ||
    extractSocialHandle(item.id);
  const handleNoAt = handle ? handle.replace(/^@/, '') : '';

  // Extract status ID from URL, item.id, or URL hash fragment
  let statusId: string | null = null;
  const statusMatch = `${item.url} ${item.id}`.match(/(?:status|statuses)\/([0-9]+)/i);
  if (statusMatch?.[1]) {
    statusId = statusMatch[1];
  } else {
    const hashMatch = item.url.match(/#([0-9]{10,})/);
    if (hashMatch?.[1]) {
      statusId = hashMatch[1];
    }
  }

  // Normalize syndicated/bridge URLs back to canonical x.com status link
  let normalizedUrl = item.url;
  if (statusId && handleNoAt) {
    normalizedUrl = `https://x.com/${handleNoAt}/status/${statusId}`;
  } else if (item.url.includes('nitter.') && statusId) {
    const userMatch = item.url.match(/nitter\.[a-z]+\/([^/]+)\/status/i);
    const user = userMatch?.[1] || handleNoAt || 'adgpi';
    normalizedUrl = `https://x.com/${user}/status/${statusId}`;
  }

  const author =
    handleMeta?.name && handleMeta?.handle
      ? `${handleMeta.name} (${handleMeta.handle})`
      : item.author || (handle ? `${item.sourceName}` : undefined);

  return {
    ...item,
    title: cleanTitle || item.title,
    snippet: cleanSnippet || undefined,
    url: isValidUrl(normalizedUrl) ? normalizedUrl : item.url,
    tier: SourceTier.TIER_1_SOCIAL,
    sourceDomain: item.sourceDomain === 'youtube.com' ? 'youtube.com' : 'x.com',
    author
  };
}
