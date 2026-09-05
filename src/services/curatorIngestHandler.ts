/**
 * Curator Ad-Hoc Ingestion Handler for DefenceWire.in (Phase 4).
 * Edge-agnostic core behind functions/api/curator/ingest.ts. Turns a
 * curator-supplied URL or pasted text into a single StoryCluster using the
 * existing clustering/extractive-intel engine (no second scoring/clustering
 * implementation), then republishes the live KV snapshot via the same
 * publish path `curatorPublishHandler.ts` uses so the item is visible on
 * the homepage within seconds, not the next hourly crawl.
 * Hard limit: <= 300 LOC.
 */

import { StoryCluster, StorySourceItem } from '../types/news.js';
import { SourceTier } from '../types/source.js';
import { clusterArticles } from '../engine/clusterEngine.js';
import { computeStableHash } from '../utils/stableId.js';
import { sanitizePlainText } from '../utils/security.js';
import { isSsrfSafeUrl } from '../utils/ssrfGuard.js';
import {
  handleCuratorPublish,
  CuratorPublishDependencies
} from './curatorPublishHandler.js';

// Reused by generateExtractiveSSBIntel below via dynamic-shaped import to
// avoid a second HTML parser — see extractiveMiner.ts (edge-runtime-safe,
// no node:* imports, unlike crawler/summarizer.ts which pulls in node:crypto).
import { generateExtractiveSSBIntel } from '../../crawler/extractiveMiner.js';

const FETCH_TIMEOUT_MS = 9000;
const MAX_TEXT_LENGTH = 20_000;

export type CuratorIngestRequest =
  | { mode: 'url'; url: string }
  | { mode: 'text'; text: string; sourceName?: string };

export interface CuratorIngestResult {
  success: boolean;
  cluster?: StoryCluster;
  message?: string;
  error?: string;
}

export interface CuratorIngestDependencies extends CuratorPublishDependencies {
  fetchFn?: typeof fetch;
  /** Reads the currently-live merged snapshot (KV `live_snapshot`), or null if none published yet. */
  getLiveSnapshot: () => Promise<{ clusters: StoryCluster[]; river: StorySourceItem[] } | null>;
  now?: Date;
}

/**
 * Fetches a URL with a bounded timeout. Deliberately not routed through
 * crawler/parser.ts's fetchFeedWithCircuitBreaker, which is keyed by
 * registered feed sources and wrong for a one-off ad-hoc fetch.
 */
async function fetchWithTimeout(url: string, fetchFn: typeof fetch): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetchFn(url, { signal: controller.signal, redirect: 'follow' });
    if (!response.ok) {
      throw new Error(`Fetch failed with HTTP ${response.status}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Minimal fallback HTML-to-text extraction: no readability-style article
 * parser exists in crawler/ to reuse (grepped, none found), so this strips
 * tags via the existing sanitizePlainText utility. This is intentionally
 * NOT a full readability implementation (no boilerplate/nav stripping) —
 * good enough for a curator manually reviewing/pasting a single article.
 */
function extractReadableText(html: string): string {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? sanitizePlainText(titleMatch[1] || '') : '';
  const bodyText = sanitizePlainText(html).replace(/\s+/g, ' ').trim();
  return title ? `${title}. ${bodyText}` : bodyText;
}

function buildSourceItem(
  url: string,
  title: string,
  snippet: string,
  sourceName: string,
  now: Date
): StorySourceItem {
  const id = computeStableHash(url || `${sourceName}:${title}:${now.getTime()}`);
  return {
    id,
    title: title.slice(0, 300),
    url,
    sourceName,
    sourceDomain: (() => {
      try {
        return new URL(url).hostname;
      } catch {
        return sourceName.toLowerCase().replace(/\s+/g, '-');
      }
    })(),
    tier: SourceTier.TIER_4_OSINT,
    publishedAt: now.toISOString(),
    snippet: snippet.slice(0, 500),
    isPrimary: true
  };
}

export async function handleCuratorIngest(
  body: CuratorIngestRequest | null | undefined,
  isAuthorized: boolean,
  deps: CuratorIngestDependencies,
  curatorEmail: string = 'curator@institutional.internal'
): Promise<{ status: number; result: CuratorIngestResult }> {
  if (!isAuthorized) {
    return { status: 401, result: { success: false, error: 'Unauthorized: Valid curator session required.' } };
  }

  if (!body || (body.mode !== 'url' && body.mode !== 'text')) {
    return { status: 400, result: { success: false, error: 'Request must specify mode: "url" or "text".' } };
  }

  const now = deps.now ?? new Date();
  const fetchFn = deps.fetchFn ?? globalThis.fetch;

  let title = '';
  let bodyText = '';
  let sourceUrl = '';
  let sourceName = 'Curator Ingest';

  if (body.mode === 'url') {
    const url = typeof body.url === 'string' ? body.url.trim() : '';
    if (!url || !isSsrfSafeUrl(url)) {
      return { status: 400, result: { success: false, error: 'URL rejected: unsafe, private, or malformed target.' } };
    }
    try {
      const html = await fetchWithTimeout(url, fetchFn);
      const extracted = extractReadableText(html);
      bodyText = extracted;
      title = extracted.split('. ')[0]?.slice(0, 200) || url;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { status: 502, result: { success: false, error: `Failed to fetch URL: ${message}` } };
    }
    sourceUrl = url;
    try {
      sourceName = new URL(url).hostname;
    } catch {
      sourceName = 'Curator Ingest';
    }
  } else {
    const rawText = typeof body.text === 'string' ? body.text : '';
    if (!rawText.trim()) {
      return { status: 400, result: { success: false, error: 'Pasted text must not be empty.' } };
    }
    bodyText = sanitizePlainText(rawText).slice(0, MAX_TEXT_LENGTH);
    title = bodyText.split(/[.\n]/)[0]?.slice(0, 200) || 'Curator Submission';
    sourceName = body.sourceName ? sanitizePlainText(body.sourceName).slice(0, 80) : 'Curator Submission';
    sourceUrl = `internal://curator-ingest/${computeStableHash(bodyText).slice(0, 16)}`;
  }

  if (!bodyText.trim()) {
    return { status: 422, result: { success: false, error: 'No readable content could be extracted.' } };
  }

  const sourceItem = buildSourceItem(sourceUrl, title, bodyText, sourceName, now);
  const clusters = clusterArticles([sourceItem], now);
  const cluster = clusters[0];
  if (!cluster) {
    return { status: 422, result: { success: false, error: 'Could not derive a story cluster from the supplied content.' } };
  }

  // Promoted so it survives the desk's filters and appears immediately.
  // clusterArticles() always marks the sole cluster of a singleton batch as
  // isLeadStory (it's "highest-scored of one"), but that flag is otherwise
  // owned by rankingEngine.ts's score-based pass across ALL clusters — a pass
  // curatorPublishHandler does not re-run on publish. Left as true here it
  // would hijack the homepage lead slot from whatever story actually ranks
  // highest, with nothing to correct it, so it's explicitly reset.
  cluster.isEditorPromoted = true;
  cluster.isLeadStory = false;
  cluster.ssbIntel = generateExtractiveSSBIntel(cluster);

  const liveSnapshot = await deps.getLiveSnapshot();
  const existingClusters = liveSnapshot?.clusters ?? [];
  const existingRiver = liveSnapshot?.river ?? [];
  const mergedClusters = [cluster, ...existingClusters.filter((c) => c.id !== cluster.id)];
  const mergedRiver = [sourceItem, ...existingRiver.filter((r) => r.id !== sourceItem.id)];

  const publishResult = await handleCuratorPublish(
    { clusters: mergedClusters, river: mergedRiver },
    null,
    { ...deps, verifyAuth: async () => true },
    undefined,
    curatorEmail
  );

  if (!publishResult.success) {
    return { status: 502, result: { success: false, error: publishResult.error || 'Failed to publish ingested story.' } };
  }

  return {
    status: 200,
    result: { success: true, cluster, message: 'Story ingested and published live.' }
  };
}
