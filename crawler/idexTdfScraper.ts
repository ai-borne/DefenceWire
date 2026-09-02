/**
 * iDEX/TDF Innovation-Grant Scraper (MOAT3 Phase 3 — new content type)
 * idex.gov.in's `/challenges` listing was live-verified this session:
 * server-rendered `blog-card` markup, no captcha, no JS framework. Per the
 * Phase 1 spike finding, tdf.drdo.in needs no design change (also plain
 * HTML) — its exact card markup wasn't re-verifiable from this sandbox
 * (DNS to tdf.drdo.in was unreachable here), so `isPsuSchemaMismatch`-style
 * degradation applies equally: a real-markup mismatch flags
 * `schema_mismatch` and skips the source for the run rather than crashing
 * the pipeline. Same table-driven-config shape as tenderScraperPsu.ts.
 * Hard limit: <= 300 LOC.
 */

import { sanitizePlainText, decodeHtmlEntities } from '../src/utils/security.js';
import { computeStableHash } from '../src/utils/stableId.js';
import { TenderSessionClient } from './tenderSessionClient.js';

export interface IdexTdfSourceConfig {
  source: 'idex' | 'tdf';
  organisationChain: string;
  cardClass: string;       // e.g. 'blog-card' — the repeating card wrapper class
  titleClass: string;      // class of the element wrapping the title <a>
  closedKeyword: string;   // status text that marks a card as closed (e.g. 'Closed')
}

export const IDEX_TDF_SOURCES: IdexTdfSourceConfig[] = [
  { source: 'idex', organisationChain: 'Ministry Of Defence | iDEX', cardClass: 'blog-card', titleClass: 'blog-card__title', closedKeyword: 'Closed' },
  { source: 'tdf', organisationChain: 'Ministry Of Defence | DRDO | Technology Development Fund', cardClass: 'call-card', titleClass: 'call-card__title', closedKeyword: 'Closed' }
];

export interface RawGrantTender {
  source: string;
  title: string;
  organisationChain: string;
  category: 'grant';
  closingAt: string;
  isOpen: boolean;
  detailUrl: string;
  id: string;
}

const MONTHS: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
};

/** Parses 'DD Mon, YYYY' (idex/tdf's 'Last Date - ...' format) into an ISO date. */
function parseGrantDate(raw: string): string {
  const match = (raw || '').match(/(\d{1,2})\s+([A-Za-z]{3})[a-z]*,?\s+(\d{4})/);
  if (!match) return '';
  const [, day, monStr, year] = match;
  const month = MONTHS[monStr!.toLowerCase()];
  if (!month) return '';
  return `${year}-${month}-${day!.padStart(2, '0')}`;
}

function normalizeUrl(href: string): string {
  const decoded = decodeHtmlEntities(href).trim();
  return decoded.replace(/^(https?:\/\/[^/]+)\/\//, '$1/');
}

/** Parses one iDEX/TDF listing page's repeating cards into grant records, per the given source config. */
export function parseIdexTdfListingHtml(html: string, config: IdexTdfSourceConfig): RawGrantTender[] {
  if (!html || typeof html !== 'string') return [];

  const cardPattern = new RegExp(`<div class="${config.cardClass}">[\\s\\S]*?(?=<div class="${config.cardClass}">|$)`, 'gi');
  const cards = html.match(cardPattern) || [];
  const results: RawGrantTender[] = [];

  for (const card of cards) {
    const titlePattern = new RegExp(`class="${config.titleClass}">\\s*<a[^>]+href="([^"]+)"[^>]*>([\\s\\S]*?)<\\/a>`, 'i');
    const titleMatch = card.match(titlePattern);
    if (!titleMatch) continue;

    const dateMatch = card.match(/Last Date\s*-\s*([^&<]+)/i);
    const statusMatch = card.match(/(?:blog-card__link|call-card__status)[^>]*>([\s\S]*?)<\/(?:a|span)>/i);
    const statusText = statusMatch ? sanitizePlainText(statusMatch[1]!) : '';

    const detailUrl = normalizeUrl(titleMatch[1]!);
    const title = sanitizePlainText(titleMatch[2]!);
    const closingAt = dateMatch ? parseGrantDate(dateMatch[1]!) : '';

    results.push({
      source: config.source,
      title,
      organisationChain: config.organisationChain,
      category: 'grant',
      closingAt,
      isOpen: !statusText.toLowerCase().includes(config.closedKeyword.toLowerCase()),
      detailUrl,
      id: `${config.source}-${computeStableHash(detailUrl)}`
    });
  }

  return results;
}

/** True when the page carries real content but the card parser recovered nothing — a likely markup change. */
function isGrantSchemaMismatch(html: string, parsedCount: number): boolean {
  if (parsedCount > 0) return false;
  return html.length > 200;
}

export interface IdexTdfScrapeResult {
  ok: boolean;
  tenders: RawGrantTender[];
  failureReason?: 'captcha_detected' | 'schema_mismatch' | 'http_error';
}

/** Fetches+parses one iDEX/TDF listing page, degrading gracefully via the circuit breaker rather than throwing. */
export async function fetchIdexTdfTenders(
  client: TenderSessionClient,
  config: IdexTdfSourceConfig,
  url: string
): Promise<IdexTdfScrapeResult> {
  const result = await client.fetch(url);

  if (result.captchaDetected) {
    return { ok: false, tenders: [], failureReason: 'captcha_detected' };
  }
  if (!result.ok) {
    return { ok: false, tenders: [], failureReason: 'http_error' };
  }

  const tenders = parseIdexTdfListingHtml(result.body, config);
  if (isGrantSchemaMismatch(result.body, tenders.length)) {
    return { ok: false, tenders: [], failureReason: 'schema_mismatch' };
  }

  return { ok: true, tenders };
}
