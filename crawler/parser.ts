/**
 * Isolated Resilient RSS/Atom Feed Parser with Circuit Breakers & SSRF Defense
 * Hard limit: <= 300 LOC.
 */

import { StorySourceItem } from '../src/types/news.js';
import { SourceTier } from '../src/types/source.js';
import { isValidUrl, sanitizePlainText, decodeHtmlEntities } from '../src/utils/security.js';
import { cleanStorySnippet } from '../src/utils/snippetCleaner.js';
import { computeStableHash } from '../src/utils/stableId.js';
import { FeedConfig } from './feedTypes.js';
import { parseSansadXmlFeed } from './sansadScraper.js';
import { normalizeSocialPostItem } from './socialNormalizer.js';

export const MAX_FEED_BYTES = 5 * 1024 * 1024; // 5 MB stream cap

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

function isPrivateOrReservedIPv4(ip: string): boolean {
  const [a, b, c] = ip.split('.').map((p) => parseInt(p, 10)) as [number, number, number, number];
  if ([a, b, c].some((p) => isNaN(p) || p < 0 || p > 255)) return true;
  if (a === 0 || a === 10 || a === 127 || (a === 169 && b === 254)) return true;
  if ((a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127)) return true;
  if ((a === 192 && b === 0 && (c === 0 || c === 2)) || (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100)))) return true;
  return a === 203 && b === 0 && c === 113 ? true : a >= 224;
}

function isPrivateOrReservedIPv6(ip: string): boolean {
  const clean = ip.toLowerCase().replace(/^\[|\]$/g, '');
  if (clean === '::1' || clean === '::' || clean === '0:0:0:0:0:0:0:1' || clean === '0:0:0:0:0:0:0:0') return true;
  if (clean.startsWith('fe8') || clean.startsWith('fe9') || clean.startsWith('fea') || clean.startsWith('feb')) return true;
  if (clean.startsWith('fc') || clean.startsWith('fd') || clean.startsWith('ff')) return true;
  return clean.startsWith('::ffff:') ? isPrivateOrReservedIPv4(clean.slice(7)) : false;
}

const BLOCKED_HOST_SUFFIXES = ['.localhost', '.local', '.internal', '.lan', '.localdomain', '.home.arpa'];

export function isSafeFeedUrl(urlStr: string): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    if (!host || host === 'localhost' || BLOCKED_HOST_SUFFIXES.some((s) => host.endsWith(s))) return false;
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host) && isPrivateOrReservedIPv4(host)) return false;
    if (/^(0x[0-9a-f]+|\d+)$/i.test(host)) return false;
    return !(host.includes(':') && isPrivateOrReservedIPv6(host));
  } catch {
    return false;
  }
}

export async function readStreamWithLimit(
  response: Response,
  maxBytes: number = MAX_FEED_BYTES
): Promise<string | null> {
  const cl = response.headers?.get?.('content-length');
  if (cl && parseInt(cl, 10) > maxBytes) return null;

  if (response.body && typeof response.body.getReader === 'function') {
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          totalBytes += value.byteLength;
          if (totalBytes > maxBytes) {
            await reader.cancel('Feed byte limit exceeded');
            return null;
          }
          chunks.push(value);
        }
      }
      const combined = new Uint8Array(totalBytes);
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.byteLength;
      }
      return new TextDecoder('utf-8').decode(combined);
    } catch {
      return null;
    }
  }

  const text = await response.text();
  return text.length > maxBytes ? null : text;
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
  if (thumbMatch?.[1] && isValidUrl(thumbMatch[1])) return decodeHtmlEntities(thumbMatch[1]);

  const mediaContentMatch = xmlBlock.match(/<media:content\b[^>]*?\burl=["']([^"']+)["'][^>]*(?:type=["']image\/|medium=["']image["'])[^>]*>/i);
  if (mediaContentMatch?.[1] && isValidUrl(mediaContentMatch[1])) return decodeHtmlEntities(mediaContentMatch[1]);

  const enclosureMatch = xmlBlock.match(/<enclosure\b[^>]*?\burl=["']([^"']+)["'][^>]*\btype=["']image\/[^"']+["'][^>]*>/i);
  if (enclosureMatch?.[1] && isValidUrl(enclosureMatch[1])) return decodeHtmlEntities(enclosureMatch[1]);

  return undefined;
}

function parsePublicationDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString();
  try {
    const timestamp = Date.parse(dateStr);
    if (!isNaN(timestamp)) return new Date(timestamp).toISOString();
  } catch {
    // Fallback
  }
  return new Date().toISOString();
}

export function parseFeedXml(xmlContent: string, feed: FeedConfig): StorySourceItem[] {
  if (!xmlContent || typeof xmlContent !== 'string') return [];
  if (feed.domain === 'sansad.in') {
    return parseSansadXmlFeed(xmlContent, feed.name.includes('Rajya') ? 'Rajya Sabha' : 'Lok Sabha');
  }

  const items: StorySourceItem[] = [];
  const isAtom = xmlContent.includes('<feed') || xmlContent.includes('<entry');
  const blockRegex = isAtom ? /<entry[\s\S]*?<\/entry>/gi : /<item[\s\S]*?<\/item>/gi;
  const matches = xmlContent.match(blockRegex) || [];

  for (const block of matches) {
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
    const cleanSnippet = cleanStorySnippet(rawDescription, 280);

    if (!cleanTitle || !rawLink || !isValidUrl(rawLink)) continue;

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

    if (
      feed.tier === SourceTier.TIER_1_OFFICIAL &&
      (feed.domain === 'pib.gov.in' || feed.domain === 'mod.gov.in' || feed.defaultCategory === 'official')
    ) {
      item.officialType = 'pib_mod';
    }

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
  if (circuit.isOpen) return [];

  if (!isSafeFeedUrl(feed.url)) {
    recordFeedFailure(feed.id);
    return [];
  }

  const timeoutMs = options.timeoutMs ?? feed.timeoutMs ?? 8000;
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

    const xml = await readStreamWithLimit(response, MAX_FEED_BYTES);
    if (!xml) {
      recordFeedFailure(feed.id);
      return [];
    }

    recordFeedSuccess(feed.id);
    return parseFeedXml(xml, feed);
  } catch {
    clearTimeout(timeoutId);
    recordFeedFailure(feed.id);
    return [];
  }
}
