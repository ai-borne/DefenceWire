/**
 * Defence PSU Tender Scraper (MOAT3 Phase 3 — source breadth)
 * BDL, Mazagon Dock, BEML and Indian Coast Guard publish tenders as plain
 * server-rendered HTML tables (no captcha, no JS) — one table-driven parser
 * over a per-source config, rather than four near-duplicate modules (SRP).
 * NOTE: per-source table markup is modeled from the common govt/PSU
 * e-tendering shape (Sno/Title-link/Published/Closing columns), not
 * live-reverified against each site in this session (network egress to
 * beml.co.in/mazagondock.in was not reachable from this sandbox) — this is
 * exactly what `isPsuSchemaMismatch`'s circuit breaker exists for: if a
 * real site's markup differs, the scraper degrades to `schema_mismatch`
 * and skips that source for the run instead of corrupting the pipeline.
 * Hard limit: <= 300 LOC.
 */

import { sanitizePlainText, decodeHtmlEntities } from '../src/utils/security.js';
import { computeStableHash } from '../src/utils/stableId.js';
import { parseDefprocDate } from './tenderScraperDefproc.js';
import { TenderSessionClient } from './tenderSessionClient.js';

export interface PsuSourceConfig {
  source: 'bdl' | 'mazagon_dock' | 'beml' | 'coast_guard';
  organisationChain: string;
  baseUrl: string;
}

export const PSU_SOURCES: PsuSourceConfig[] = [
  { source: 'bdl', organisationChain: 'Ministry Of Defence | Bharat Dynamics Limited', baseUrl: 'https://www.bdl-india.in' },
  { source: 'mazagon_dock', organisationChain: 'Ministry Of Defence | Mazagon Dock Shipbuilders Limited', baseUrl: 'https://www.mazagondock.in' },
  { source: 'beml', organisationChain: 'Ministry Of Defence | BEML Limited', baseUrl: 'https://www.beml.co.in' },
  { source: 'coast_guard', organisationChain: 'Ministry Of Defence | Indian Coast Guard', baseUrl: 'https://indiancoastguard.gov.in' }
];

export interface RawPsuTender {
  source: string;
  title: string;
  organisationChain: string;
  publishedAt: string;
  closingAt: string;
  detailUrl: string;
  id: string;
}

/** Parses one PSU tender-listing table (`<table id="tenderTable">`, title link + published/closing date cells). */
export function parsePsuListingHtml(html: string, config: PsuSourceConfig): RawPsuTender[] {
  if (!html || typeof html !== 'string') return [];

  const tableMatch = html.match(/<table[^>]*id="tenderTable"[^>]*>[\s\S]*?<\/table>/i);
  if (!tableMatch) return [];

  const rowMatches = tableMatch[0].match(/<tr>[\s\S]*?<\/tr>/gi) || [];
  const results: RawPsuTender[] = [];

  for (const row of rowMatches) {
    const linkMatch = row.match(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!linkMatch) continue;

    const cellMatches = row.match(/<td[\s\S]*?<\/td>/gi) || [];
    if (cellMatches.length < 4) continue;

    const href = decodeHtmlEntities(linkMatch[1]!);
    const title = sanitizePlainText(linkMatch[2]!);
    const publishedRaw = cellMatches[2]!.replace(/^<td[^>]*>/i, '').replace(/<\/td>$/i, '');
    const closingRaw = cellMatches[3]!.replace(/^<td[^>]*>/i, '').replace(/<\/td>$/i, '');

    const detailUrl = href.startsWith('http') ? href : `${config.baseUrl}${href.startsWith('/') ? '' : '/'}${href}`;

    results.push({
      source: config.source,
      title,
      organisationChain: config.organisationChain,
      publishedAt: parseDefprocDate(publishedRaw),
      closingAt: parseDefprocDate(closingRaw),
      detailUrl,
      id: `${config.source}-${computeStableHash(detailUrl)}`
    });
  }

  return results;
}

/** True when the page carries real content but the table parser recovered nothing — a likely markup change, not an empty listing. */
export function isPsuSchemaMismatch(html: string, parsedCount: number): boolean {
  if (parsedCount > 0) return false;
  return html.length > 200 && !/<table[^>]*id="tenderTable"[^>]*>\s*<\/table>/i.test(html);
}

export interface PsuScrapeResult {
  ok: boolean;
  tenders: RawPsuTender[];
  failureReason?: 'schema_mismatch' | 'http_error';
}

/** Fetches+parses one PSU listing page, flagging schema_mismatch/http_error rather than throwing so a bad source never aborts the run. */
export async function fetchPsuTenders(
  client: TenderSessionClient,
  config: PsuSourceConfig,
  url: string
): Promise<PsuScrapeResult> {
  const result = await client.fetch(url);

  if (!result.ok) {
    return { ok: false, tenders: [], failureReason: 'http_error' };
  }

  const tenders = parsePsuListingHtml(result.body, config);
  if (isPsuSchemaMismatch(result.body, tenders.length)) {
    return { ok: false, tenders: [], failureReason: 'schema_mismatch' };
  }

  return { ok: true, tenders };
}
