/**
 * defproc.gov.in Tender Listing Parser (MOAT3 Phase 1 — foundations)
 * Parses the `FrontEndLatestActiveTendersOrgwise` listing table (verified
 * live 2026-09-02, no captcha on this route — see
 * tests/fixtures/defprocLatestActiveTenders.html for the confirmed column
 * layout). Scope filtering (excluding MES/Cantonment/DGDE civic tenders) is
 * Phase 2 (tenderFilterConfig.ts); this module only extracts raw records.
 * Hard limit: <= 300 LOC.
 */

import { decodeHtmlEntities, sanitizePlainText } from '../src/utils/security.js';
import { computeStableHash } from '../src/utils/stableId.js';

export interface RawDefprocTender {
  publishedAt: string;   // ISO date, e.g. '2026-08-26'
  closingAt: string;     // ISO datetime, e.g. '2026-09-15T17:00:00'
  title: string;
  referenceNumber?: string;
  organisationChain: string;
  detailUrl: string;
  id: string;
}

const MONTHS: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
};

/** Converts defproc's 'DD-Mon-YYYY' or 'DD-Mon-YYYY HH:MM AM/PM' into ISO 8601. */
export function parseDefprocDate(raw: string): string {
  const clean = (raw || '').trim();
  const match = clean.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})(?:\s+(\d{1,2}):(\d{2})\s*(AM|PM))?/i);
  if (!match) return '';

  const [, dayStr, monStr, yearStr, hourStr, minStr, ampm] = match;
  const month = MONTHS[monStr!.toLowerCase()];
  if (!month) return '';
  const day = dayStr!.padStart(2, '0');

  if (!hourStr) return `${yearStr}-${month}-${day}`;

  let hour = parseInt(hourStr, 10);
  if (ampm?.toUpperCase() === 'PM' && hour !== 12) hour += 12;
  if (ampm?.toUpperCase() === 'AM' && hour === 12) hour = 0;
  const hh = String(hour).padStart(2, '0');
  return `${yearStr}-${month}-${day}T${hh}:${minStr}:00`;
}

function extractCells(rowHtml: string): string[] {
  const cellMatches = rowHtml.match(/<td[\s\S]*?<\/td>/gi) || [];
  return cellMatches.map((cell) => cell.replace(/^<td[^>]*>/i, '').replace(/<\/td>$/i, ''));
}

function extractEncId(href: string): string | null {
  const match = href.match(/encId=([^&"'\s]+)/i);
  return match ? decodeHtmlEntities(match[1]!) : null;
}

/** Parses one `<table class="list_table">` listing (defproc/eprocure share this NIC eProcurement markup). */
export function parseDefprocListingHtml(html: string, source: 'defproc' | 'eprocure' = 'defproc'): RawDefprocTender[] {
  if (!html || typeof html !== 'string') return [];

  const tableMatch = html.match(/<table[^>]*class="list_table"[^>]*>[\s\S]*?<\/table>/i);
  if (!tableMatch) return [];

  const rowMatches = tableMatch[0].match(/<tr[^>]*class="(?:even|odd)"[\s\S]*?<\/tr>/gi) || [];
  const results: RawDefprocTender[] = [];

  for (const row of rowMatches) {
    const cells = extractCells(row);
    if (cells.length < 6) continue;

    const [, publishedRaw, closingRaw, , titleCell, orgCell] = cells;
    const linkMatch = titleCell!.match(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!linkMatch) continue;

    const href = decodeHtmlEntities(linkMatch[1]!);
    const linkText = linkMatch[2]!;
    const encId = extractEncId(href);
    if (!encId) continue;

    const titleAndRefText = sanitizePlainText(linkText.replace(/<br\s*\/?>/gi, '\n'));
    const [titlePart, ...refParts] = titleAndRefText.split('\n').map((s) => s.trim()).filter(Boolean);
    const refMatch = refParts.join(' ').match(/Tender No:\s*(.+)/i);

    const organisationChain = sanitizePlainText(orgCell!.replace(/\|\|/g, ' | '));
    const publishedAt = parseDefprocDate(publishedRaw!);
    const closingAt = parseDefprocDate(closingRaw!);

    results.push({
      publishedAt,
      closingAt,
      title: titlePart || 'Untitled Tender',
      referenceNumber: refMatch ? refMatch[1]!.trim() : undefined,
      organisationChain,
      detailUrl: href.startsWith('http') ? href : `https://defproc.gov.in${href}`,
      id: encId.includes('_') ? encId : `${source}-${computeStableHash(encId)}`
    });
  }

  return results;
}
