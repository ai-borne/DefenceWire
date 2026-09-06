/**
 * SSOT for deciding whether a curator-published NEWS_LIVE KV snapshot or the
 * freshly-crawled static feed (public/data/news.json) is newer, so
 * functions/data/news.json.ts never lets one manual publish permanently
 * shadow every hourly crawl that follows it.
 * Hard limit: <= 300 LOC.
 */

export interface FreshnessCandidate {
  json: string | null;
}

export type FreshnessSource = 'kv' | 'static';

export interface FreshnessResult {
  json: string;
  source: FreshnessSource;
}

/** -1 = absent/unparsable (never wins over anything with a real timestamp). */
function generatedAtMs(json: string | null): number {
  if (!json) return -1;
  try {
    const parsed = JSON.parse(json) as { generatedAt?: string };
    if (!parsed.generatedAt) return 0;
    const ms = new Date(parsed.generatedAt).getTime();
    return Number.isNaN(ms) ? -1 : ms;
  } catch {
    return -1;
  }
}

/**
 * Picks the fresher of the two payloads by `generatedAt`. A snapshot with no
 * timestamp (legacy curator publishes predating this field) is treated as
 * oldest rather than winning by default. Ties and unparsable JSON favor the
 * static feed, since that is what the hourly crawl keeps moving forward.
 */
export function pickFresherSnapshot(
  kv: FreshnessCandidate,
  staticFeed: FreshnessCandidate
): FreshnessResult | null {
  const kvMs = generatedAtMs(kv.json);
  const staticMs = generatedAtMs(staticFeed.json);

  if (kv.json && kvMs > staticMs) {
    return { json: kv.json, source: 'kv' };
  }
  if (staticFeed.json) {
    return { json: staticFeed.json, source: 'static' };
  }
  if (kv.json) {
    return { json: kv.json, source: 'kv' };
  }
  return null;
}
