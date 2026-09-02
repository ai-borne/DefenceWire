/**
 * Unit Tests for PSU Tender Scraper (MOAT3 Phase 3)
 * Fixture-based — no live network in CI. One table-driven parser over four
 * PSU source configs (BDL, Mazagon Dock, BEML, Indian Coast Guard).
 * Hard limit: <= 300 LOC.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  PSU_SOURCES,
  parsePsuListingHtml,
  fetchPsuTenders,
  isPsuSchemaMismatch
} from '../../crawler/tenderScraperPsu.js';
import { TenderSessionClient } from '../../crawler/tenderSessionClient.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const readFixture = (name: string) => readFileSync(join(__dirname, '../fixtures', name), 'utf-8');

function jsonResponse(body: string, status = 200): Response {
  return new Response(body, { status, headers: {} });
}

describe('PSU Tender Scraper', () => {
  describe('parsePsuListingHtml', () => {
    it('parses BDL fixture rows with absolute detail URLs and stable IDs', () => {
      const bdlConfig = PSU_SOURCES.find((c) => c.source === 'bdl')!;
      const results = parsePsuListingHtml(readFixture('psuBdlTenders.html'), bdlConfig);

      expect(results).toHaveLength(2);
      expect(results[0]!.title).toBe('Supply of Torpedo Warhead Casings');
      expect(results[0]!.organisationChain).toBe(bdlConfig.organisationChain);
      expect(results[0]!.publishedAt).toBe('2026-08-20');
      expect(results[0]!.closingAt).toBe('2026-09-10');
      expect(results[0]!.detailUrl).toBe('https://www.bdl-india.in/uploads/tenders/nit-787001.pdf');
      expect(results[0]!.source).toBe('bdl');
      expect(results[0]!.id).toBeTruthy();
    });

    it.each([
      ['mazagon_dock', 'psuMazagonDockTenders.html', 'Procurement of Marine Diesel Engine Spares'],
      ['beml', 'psuBemlTenders.html', 'Supply of Hydraulic Cylinders for BMP-II'],
      ['coast_guard', 'psuCoastGuardTenders.html', 'Annual Maintenance of Fast Patrol Vessel Engines']
    ] as const)('parses %s fixture', (source, fixtureFile, expectedTitle) => {
      const config = PSU_SOURCES.find((c) => c.source === source)!;
      const results = parsePsuListingHtml(readFixture(fixtureFile), config);
      expect(results).toHaveLength(1);
      expect(results[0]!.title).toBe(expectedTitle);
    });

    it('returns an empty array for unparseable/empty HTML without throwing', () => {
      expect(parsePsuListingHtml('', PSU_SOURCES[0]!)).toEqual([]);
      expect(parsePsuListingHtml('<html></html>', PSU_SOURCES[0]!)).toEqual([]);
    });
  });

  describe('isPsuSchemaMismatch', () => {
    it('is false when parsing recovers rows', () => {
      expect(isPsuSchemaMismatch(readFixture('psuBdlTenders.html'), 2)).toBe(false);
    });

    it('is true when the page is substantial but nothing parsed (site redesign / new portal)', () => {
      expect(isPsuSchemaMismatch(readFixture('psuUnexpectedMarkup.html'), 0)).toBe(true);
    });

    it('is false for a genuinely empty listing (no tenders currently posted)', () => {
      expect(isPsuSchemaMismatch('<html><body><table id="tenderTable"></table></body></html>', 0)).toBe(false);
    });
  });

  describe('fetchPsuTenders', () => {
    const bdlConfig = PSU_SOURCES.find((c) => c.source === 'bdl')!;

    it('returns ok with parsed tenders on a successful fetch', async () => {
      const fetchFn = vi.fn().mockResolvedValue(jsonResponse(readFixture('psuBdlTenders.html')));
      const client = new TenderSessionClient({ fetchFn: fetchFn as unknown as typeof fetch });
      const result = await fetchPsuTenders(client, bdlConfig, 'https://www.bdl-india.in/tenders/');

      expect(result.ok).toBe(true);
      expect(result.tenders).toHaveLength(2);
      expect(result.failureReason).toBeUndefined();
    });

    it('flags schema_mismatch without crashing when the source markup no longer matches', async () => {
      const fetchFn = vi.fn().mockResolvedValue(jsonResponse(readFixture('psuUnexpectedMarkup.html')));
      const client = new TenderSessionClient({ fetchFn: fetchFn as unknown as typeof fetch });
      const result = await fetchPsuTenders(client, bdlConfig, 'https://www.bdl-india.in/tenders/');

      expect(result.ok).toBe(false);
      expect(result.failureReason).toBe('schema_mismatch');
      expect(result.tenders).toEqual([]);
    });

    it('flags http_error on a non-2xx response without crashing the batch', async () => {
      const fetchFn = vi.fn().mockResolvedValue(jsonResponse('Not Found', 404));
      const client = new TenderSessionClient({ fetchFn: fetchFn as unknown as typeof fetch });
      const result = await fetchPsuTenders(client, bdlConfig, 'https://www.bdl-india.in/tenders/');

      expect(result.ok).toBe(false);
      expect(result.failureReason).toBe('http_error');
    });
  });
});
