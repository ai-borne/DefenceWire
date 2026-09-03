/**
 * Fowler Half-Open Circuit Breaker & Conditional Scraping Engine
 * Implements 3-state circuit breaker (CLOSED -> OPEN -> HALF-OPEN)
 * and HTTP 304 / ETag / Last-Modified conditional fetching.
 * Hard limit: <= 300 LOC.
 */

import { StorySourceItem } from '../src/types/news.js';
import { registerSourceCircuitState, resetSourceCircuitRegistry } from '../src/engine/sourceReputation.js';
import { FeedConfig } from './feedTypes.js';
import { isSafeFeedUrl, MAX_FEED_BYTES, parseFeedXml, readStreamWithLimit } from './parser.js';

export type FowlerCircuitState = 'CLOSED' | 'HALF-OPEN' | 'OPEN';

export interface FeedCircuitRecord {
  feedId: string;
  domain: string;
  state: FowlerCircuitState;
  consecutiveFailures: number;
  lastFailureTime: number;
  lastSuccessTime?: number;
  etag?: string;
  lastModified?: string;
}

export const FOWLER_FAILURE_THRESHOLD = 5;
export const FOWLER_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

const fowlerCircuitRegistry = new Map<string, FeedCircuitRecord>();

/**
 * Evaluates and returns the Fowler circuit status for a feed.
 * Automatically transitions from OPEN to HALF-OPEN when the 24-hour probe cooldown expires.
 */
export function getFowlerCircuitStatus(
  feedId: string,
  options: { cooldownMs?: number; now?: number; domain?: string } = {}
): FeedCircuitRecord {
  const cleanId = (feedId || 'unknown').toLowerCase();
  let record = fowlerCircuitRegistry.get(cleanId);
  const now = options.now ?? Date.now();
  const cooldown = options.cooldownMs ?? FOWLER_COOLDOWN_MS;

  if (!record) {
    record = {
      feedId: cleanId,
      domain: (options.domain || cleanId).toLowerCase(),
      state: 'CLOSED',
      consecutiveFailures: 0,
      lastFailureTime: 0
    };
    fowlerCircuitRegistry.set(cleanId, record);
    return record;
  }

  if (options.domain && record.domain === cleanId) {
    record.domain = options.domain.toLowerCase();
  }

  // Fowler Half-Open transition: if OPEN and cooldown has elapsed, transition to HALF-OPEN
  if (record.state === 'OPEN' && now - record.lastFailureTime >= cooldown) {
    record.state = 'HALF-OPEN';
    registerSourceCircuitState({
      domain: record.domain,
      feedId: record.feedId,
      state: 'HALF-OPEN',
      consecutiveFailures: record.consecutiveFailures,
      lastFailureAt: new Date(record.lastFailureTime).toISOString(),
      lastSuccessAt: record.lastSuccessTime ? new Date(record.lastSuccessTime).toISOString() : undefined
    });
  }

  return record;
}

/**
 * Records a successful fetch or 304 Not Modified, recovering HALF-OPEN/CLOSED to 0 failures.
 */
export function recordFowlerSuccess(
  feedId: string,
  options: { etag?: string | null; lastModified?: string | null; now?: number; domain?: string } = {}
): void {
  const record = getFowlerCircuitStatus(feedId, options);
  record.state = 'CLOSED';
  record.consecutiveFailures = 0;
  record.lastSuccessTime = options.now ?? Date.now();
  if (options.etag) record.etag = options.etag;
  if (options.lastModified) record.lastModified = options.lastModified;

  registerSourceCircuitState({
    domain: record.domain,
    feedId: record.feedId,
    state: 'CLOSED',
    consecutiveFailures: 0,
    lastSuccessAt: new Date(record.lastSuccessTime).toISOString()
  });
}

/**
 * Records a failure. Trips to OPEN on 5 consecutive failures or on failed HALF-OPEN probe.
 */
export function recordFowlerFailure(
  feedId: string,
  options: { now?: number; threshold?: number; domain?: string } = {}
): void {
  const record = getFowlerCircuitStatus(feedId, options);
  const threshold = options.threshold ?? FOWLER_FAILURE_THRESHOLD;
  record.consecutiveFailures += 1;
  record.lastFailureTime = options.now ?? Date.now();

  if (record.state === 'HALF-OPEN' || record.consecutiveFailures >= threshold) {
    record.state = 'OPEN';
  }

  registerSourceCircuitState({
    domain: record.domain,
    feedId: record.feedId,
    state: record.state,
    consecutiveFailures: record.consecutiveFailures,
    lastFailureAt: new Date(record.lastFailureTime).toISOString()
  });
}

/**
 * Retrieves conditional HTTP headers (If-None-Match, If-Modified-Since) for a feed.
 */
export function getConditionalScrapeHeaders(feedId: string): Record<string, string> {
  const record = fowlerCircuitRegistry.get((feedId || '').toLowerCase());
  const headers: Record<string, string> = {};
  if (record?.etag) headers['If-None-Match'] = record.etag;
  if (record?.lastModified) headers['If-Modified-Since'] = record.lastModified;
  return headers;
}

/**
 * Retrieves all currently quarantined feeds.
 */
export function getQuarantinedFeedRecords(): FeedCircuitRecord[] {
  return Array.from(fowlerCircuitRegistry.values()).filter((r) => r.state === 'OPEN');
}

/**
 * Clears the Fowler circuit breaker registry (for testing).
 */
export function resetFowlerCircuitBreakers(): void {
  fowlerCircuitRegistry.clear();
  resetSourceCircuitRegistry();
}

/**
 * Fetches feed with Fowler Half-Open circuit breaker and conditional scraping (ETag/304).
 */
export async function fetchFeedWithFowlerBreaker(
  feed: FeedConfig,
  options: {
    fetchFn?: typeof fetch;
    timeoutMs?: number;
    now?: number;
    cooldownMs?: number;
    failureThreshold?: number;
  } = {}
): Promise<StorySourceItem[]> {
  const status = getFowlerCircuitStatus(feed.id, {
    cooldownMs: options.cooldownMs,
    now: options.now,
    domain: feed.domain
  });

  // Short-circuit if quarantined (OPEN)
  if (status.state === 'OPEN') {
    return [];
  }

  if (!isSafeFeedUrl(feed.url)) {
    recordFowlerFailure(feed.id, { now: options.now, threshold: options.failureThreshold, domain: feed.domain });
    return [];
  }

  const timeoutMs = options.timeoutMs ?? feed.timeoutMs ?? 8000;
  const fetcher = options.fetchFn ?? globalThis.fetch;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const conditionalHeaders = getConditionalScrapeHeaders(feed.id);

  try {
    const response = await fetcher(feed.url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'DefenceWire/1.0 (Autonomous Intelligence Ingestion; +https://defencewire.in)',
        Accept: 'application/rss+xml, application/atom+xml, text/xml, application/xml;q=0.9, */*;q=0.8',
        ...conditionalHeaders
      }
    });

    clearTimeout(timeoutId);

    // Conditional Scraping: 304 Not Modified exit
    if (response.status === 304) {
      recordFowlerSuccess(feed.id, { now: options.now, domain: feed.domain });
      return [];
    }

    if (!response.ok) {
      recordFowlerFailure(feed.id, { now: options.now, threshold: options.failureThreshold, domain: feed.domain });
      return [];
    }

    const xml = await readStreamWithLimit(response, MAX_FEED_BYTES);
    if (!xml) {
      recordFowlerFailure(feed.id, { now: options.now, threshold: options.failureThreshold, domain: feed.domain });
      return [];
    }

    const etag = response.headers?.get?.('etag');
    const lastModified = response.headers?.get?.('last-modified');
    recordFowlerSuccess(feed.id, { etag, lastModified, now: options.now, domain: feed.domain });
    return parseFeedXml(xml, feed);
  } catch {
    clearTimeout(timeoutId);
    recordFowlerFailure(feed.id, { now: options.now, threshold: options.failureThreshold, domain: feed.domain });
    return [];
  }
}
