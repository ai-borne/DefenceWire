/**
 * Isolated Resilient RSS/Atom Feed Parser with Circuit Breakers
 * Hard limit: <= 300 LOC.
 */

import { StorySourceItem } from '../src/types/news.js';
import { SourceTier } from '../src/types/source.js';
import { isValidUrl, sanitizePlainText, decodeHtmlEntities } from '../src/utils/security.js';
import { computeStableHash } from '../src/utils/stableId.js';
import { FeedConfig } from './feedTypes.js';
import { normalizeSocialPostItem } from './socialNormalizer.js';

export interface CircuitState {
  failures: number;
  lastFailureTime: number;
  isOpen: boolean;
}

const CIRCUIT_REGISTRY = new Map<string, CircuitState>();
const FAILURE_THRESHOLD = 3;
const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

export function resetCircuitBreakers(): void {
  CIRCUIT_REGISTRY.clear();
}

export function getCircuitBreakerStatus(feedId: string): CircuitState {
  const existing = CIRCUIT_REGISTRY.get(feedId);
  if (!existing) {
    const fresh: CircuitState = { failures: 0, lastFailureTime: 0, isOpen: false };
    CIRCUIT_REGISTRY.set(feedId, fresh);
    return fresh;
  }
  if (existing.isOpen && Date.now() - existing.lastFailureTime > COOLDOWN_MS) {
    existing.isOpen = false;
    existing.failures = 0;
  }
  return existing;
}

function recordFeedFailure(feedId: string): void {
  const state = getCircuitBreakerStatus(feedId);
  state.failures += 1;
  state.lastFailureTime = Date.now();
  if (state.failures >= FAILURE_THRESHOLD) {
    state.isOpen = true;
  }
}

function recordFeedSuccess(feedId: string): void {
  const state = getCircuitBreakerStatus(feedId);
  state.failures = 0;
  state.isOpen = false;
}

function extractTagValue(xmlBlock: string, tagName: string): string {
  const cdataRegex = new RegExp(`<${tagName}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tagName}>`, 'i');
  const cdataMatch = xmlBlock.match(cdataRegex);
  if (cdataMatch?.[1]) return decodeHtmlEntities(cdataMatch[1]);

  const standardRegex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = xmlBlock.match(standardRegex);
  return match?.[1] ? decodeHtmlEntities(match[1]) : '';
}

function extractLink(xmlBlock: string): string {
  const hrefMatch = xmlBlock.match(/<link\b[^>]*?\bhref=["']([^"']+)["'][^>]*>/i);
  if (hrefMatch?.[1]) return decodeHtmlEntities(hrefMatch[1]);

  const standardLink = extractTagValue(xmlBlock, 'link');
  if (standardLink) return standardLink;

  const guidLink = extractTagValue(xmlBlock, 'guid');
  if (guidLink && isValidUrl(guidLink)) return guidLink;

  return '';
}

function extractThumbnail(xmlBlock: string): string | undefined {
  const thumbMatch = xmlBlock.match(/<media:thumbnail\b[^>]*?\burl=["']([^"']+)["'][^>]*>/i);
  if (thumbMatch?.[1] && isValidUrl(thumbMatch[1])) {
    return decodeHtmlEntities(thumbMatch[1]);
  }

  const mediaContentMatch = xmlBlock.match(/<media:content\b[^>]*?\burl=["']([^"']+)["'][^>]*(?:type=["']image\/|medium=["']image["'])[^>]*>/i);
  if (mediaContentMatch?.[1] && isValidUrl(mediaContentMatch[1])) {
    return decodeHtmlEntities(mediaContentMatch[1]);
  }

  const enclosureMatch = xmlBlock.match(/<enclosure\b[^>]*?\burl=["']([^"']+)["'][^>]*\btype=["']image\/[^"']+["'][^>]*>/i);
  if (enclosureMatch?.[1] && isValidUrl(enclosureMatch[1])) {
    return decodeHtmlEntities(enclosureMatch[1]);
  }

  return undefined;
}

function parsePublicationDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString();
  try {
    const timestamp = Date.parse(dateStr);
    if (!isNaN(timestamp)) {
      return new Date(timestamp).toISOString();
    }
  } catch {
    // Fallback
  }
  return new Date().toISOString();
}

export function parseFeedXml(xmlContent: string, feed: FeedConfig): StorySourceItem[] {
  if (!xmlContent || typeof xmlContent !== 'string') return [];

  const items: StorySourceItem[] = [];
  const isAtom = xmlContent.includes('<feed') || xmlContent.includes('<entry');
  const blockRegex = isAtom ? /<entry[\s\S]*?<\/entry>/gi : /<item[\s\S]*?<\/item>/gi;

  const matches = xmlContent.match(blockRegex) || [];

  for (let i = 0; i < matches.length; i++) {
    const block = matches[i];
    if (!block) continue;

    const rawTitle = extractTagValue(block, 'title');
    const rawLink = extractLink(block);
    const rawPubDate =
      extractTagValue(block, 'pubDate') ||
      extractTagValue(block, 'published') ||
      extractTagValue(block, 'updated') ||
      extractTagValue(block, 'dc:date');
    const rawDescription =
      extractTagValue(block, 'description') ||
      extractTagValue(block, 'media:description') ||
      extractTagValue(block, 'summary') ||
      extractTagValue(block, 'content:encoded') ||
      extractTagValue(block, 'content');
    const rawImageUrl = extractThumbnail(block);

    const cleanTitle = sanitizePlainText(rawTitle);
    const cleanSnippet = sanitizePlainText(rawDescription).slice(0, 260);

    if (!cleanTitle || !rawLink || !isValidUrl(rawLink)) {
      continue;
    }

    let item: StorySourceItem = {
      id: `${feed.id}-${computeStableHash(rawLink)}`,
      title: cleanTitle,
      url: rawLink,
      sourceName: feed.name,
      sourceDomain: feed.domain,
      tier: feed.tier,
      publishedAt: parsePublicationDate(rawPubDate),
      snippet: cleanSnippet.length > 0 ? cleanSnippet : undefined,
      imageUrl: rawImageUrl
    };

    if (feed.tier === SourceTier.TIER_1_SOCIAL || feed.domain === 'x.com' || feed.domain === 'twitter.com') {
      item = normalizeSocialPostItem(item);
    }

    items.push(item);
  }

  return items;
}

export async function fetchFeedWithCircuitBreaker(
  feed: FeedConfig,
  options: { timeoutMs?: number; fetchFn?: typeof fetch } = {}
): Promise<StorySourceItem[]> {
  const circuit = getCircuitBreakerStatus(feed.id);
  if (circuit.isOpen) {
    return [];
  }

  const timeoutMs = options.timeoutMs ?? feed.timeoutMs ?? 7500;
  const fetcher = options.fetchFn ?? globalThis.fetch;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetcher(feed.url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'DefenceWire/1.0 (Autonomous Intelligence Ingestion; +https://defencewire.in)',
        Accept: 'application/rss+xml, application/atom+xml, text/xml, application/xml;q=0.9, */*;q=0.8'
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      recordFeedFailure(feed.id);
      return [];
    }

    const xml = await response.text();
    recordFeedSuccess(feed.id);
    return parseFeedXml(xml, feed);
  } catch {
    clearTimeout(timeoutId);
    recordFeedFailure(feed.id);
    return [];
  }
}
