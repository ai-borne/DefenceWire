/**
 * Unit Tests for iDEX/TDF Innovation-Grant Scraper (MOAT3 Phase 3)
 * Fixture-based — no live network in CI. idex.gov.in structure verified
 * live this session (server-rendered, no captcha/JS); tdf.drdo.in follows
 * the same table-driven design per the Phase 1 spike finding.
 * Hard limit: <= 300 LOC.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { IDEX_TDF_SOURCES, parseIdexTdfListingHtml, fetchIdexTdfTenders } from '../../crawler/idexTdfScraper.js';
import { TenderSessionClient } from '../../crawler/tenderSessionClient.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const readFixture = (name: string) => readFileSync(join(__dirname, '../fixtures', name), 'utf-8');

function jsonResponse(body: string, status = 200): Response {
  return new Response(body, { status, headers: {} });
}

describe('iDEX/TDF Innovation-Grant Scraper', () => {
  describe('parseIdexTdfListingHtml', () => {
    it('parses iDEX challenge cards into grant records', () => {
      const idexConfig = IDEX_TDF_SOURCES.find((c) => c.source === 'idex')!;
      const results = parseIdexTdfListingHtml(readFixture('idexChallenges.html'), idexConfig);

      expect(results).toHaveLength(2);
      expect(results[0]!.title).toBe('DISC 12 Re Open');
      expect(results[0]!.closingAt).toBe('2026-07-15');
      expect(results[0]!.isOpen).toBe(false);
      expect(results[0]!.category).toBe('grant');
      expect(results[0]!.source).toBe('idex');

      expect(results[1]!.title).toBe('OPEN CHALLENGE');
      expect(results[1]!.closingAt).toBe('2026-09-30');
      expect(results[1]!.isOpen).toBe(true);
      expect(results[1]!.detailUrl).toBe('https://www.idex.gov.in/disc-category/18');
    });

    it('parses TDF call cards into grant records using the same table-driven config', () => {
      const tdfConfig = IDEX_TDF_SOURCES.find((c) => c.source === 'tdf')!;
      const results = parseIdexTdfListingHtml(readFixture('tdfCalls.html'), tdfConfig);

      expect(results).toHaveLength(2);
      expect(results[0]!.title).toBe('Development of Autonomous Underwater Glider');
      expect(results[0]!.closingAt).toBe('2026-10-20');
      expect(results[0]!.isOpen).toBe(true);
      expect(results[1]!.isOpen).toBe(false);
    });

    it('returns an empty array for unparseable/empty HTML without throwing', () => {
      const idexConfig = IDEX_TDF_SOURCES.find((c) => c.source === 'idex')!;
      expect(parseIdexTdfListingHtml('', idexConfig)).toEqual([]);
      expect(parseIdexTdfListingHtml('<html></html>', idexConfig)).toEqual([]);
    });
  });

  describe('fetchIdexTdfTenders', () => {
    const idexConfig = IDEX_TDF_SOURCES.find((c) => c.source === 'idex')!;

    it('returns ok with parsed grants on a successful fetch', async () => {
      const fetchFn = vi.fn().mockResolvedValue(jsonResponse(readFixture('idexChallenges.html')));
      const client = new TenderSessionClient({ fetchFn: fetchFn as unknown as typeof fetch });
      const result = await fetchIdexTdfTenders(client, idexConfig, 'https://www.idex.gov.in/challenges');

      expect(result.ok).toBe(true);
      expect(result.tenders).toHaveLength(2);
    });

    it('flags captcha_detected without crashing if the portal ever adds a gate', async () => {
      const fetchFn = vi.fn().mockResolvedValue(jsonResponse('<html>Please Enter Captcha</html>'));
      const client = new TenderSessionClient({ fetchFn: fetchFn as unknown as typeof fetch });
      const result = await fetchIdexTdfTenders(client, idexConfig, 'https://www.idex.gov.in/challenges');

      expect(result.ok).toBe(false);
      expect(result.failureReason).toBe('captcha_detected');
      expect(result.tenders).toEqual([]);
    });

    it('flags schema_mismatch without crashing when markup no longer matches', async () => {
      const fetchFn = vi.fn().mockResolvedValue(jsonResponse('<html><head><title>Notice</title></head><body><header><nav><a href="/">Home</a></nav></header><div class="notice"><p>Site under maintenance, please check back later for updates. We apologize for the inconvenience and are working to restore full service as soon as possible.</p></div><footer>Copyright 2026</footer></body></html>'));
      const client = new TenderSessionClient({ fetchFn: fetchFn as unknown as typeof fetch });
      const result = await fetchIdexTdfTenders(client, idexConfig, 'https://www.idex.gov.in/challenges');

      expect(result.ok).toBe(false);
      expect(result.failureReason).toBe('schema_mismatch');
    });

    it('flags http_error on a non-2xx response without crashing the batch', async () => {
      const fetchFn = vi.fn().mockResolvedValue(jsonResponse('Not Found', 404));
      const client = new TenderSessionClient({ fetchFn: fetchFn as unknown as typeof fetch });
      const result = await fetchIdexTdfTenders(client, idexConfig, 'https://www.idex.gov.in/challenges');

      expect(result.ok).toBe(false);
      expect(result.failureReason).toBe('http_error');
    });
  });
});
