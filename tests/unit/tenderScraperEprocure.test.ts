/**
 * Unit Tests for eprocure.gov.in Tender Scraper (MOAT3 Phase 3)
 * Fixture-based — no live network in CI (tests/fixtures/eprocureLatestActiveTenders.html).
 * Hard limit: <= 300 LOC.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { fetchEprocureTenders, filterEprocureAllowed } from '../../crawler/tenderScraperEprocure.js';
import { parseDefprocListingHtml } from '../../crawler/tenderScraperDefproc.js';
import { TenderSessionClient } from '../../crawler/tenderSessionClient.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_HTML = readFileSync(join(__dirname, '../fixtures/eprocureLatestActiveTenders.html'), 'utf-8');

function jsonResponse(body: string, status = 200): Response {
  return new Response(body, { status, headers: {} });
}

describe('eprocure.gov.in Tender Scraper', () => {
  describe('filterEprocureAllowed', () => {
    const raw = parseDefprocListingHtml(FIXTURE_HTML, 'eprocure');

    it('parses all rows from the shared NIC listing markup', () => {
      expect(raw).toHaveLength(3);
    });

    it('keeps only org-chains on the allowlist (Layer 1), dropping all-of-govt noise like Railways', () => {
      const allowed = filterEprocureAllowed(raw);
      const ids = allowed.map((t) => t.id);
      expect(ids).toContain('2026_ARMY_112233_1');
      expect(ids).not.toContain('2026_RLY_445566_1');
    });

    it('still includes an Army+MES row after Layer 1 (Layer 2 civic exclusion is a separate, later filter)', () => {
      const allowed = filterEprocureAllowed(raw);
      expect(allowed.map((t) => t.id)).toContain('2026_MES_778899_1');
    });
  });

  describe('fetchEprocureTenders', () => {
    it('returns ok with allowlist-filtered tenders on a successful, captcha-free fetch', async () => {
      const fetchFn = vi.fn().mockResolvedValue(jsonResponse(FIXTURE_HTML));
      const client = new TenderSessionClient({ fetchFn: fetchFn as unknown as typeof fetch });
      const result = await fetchEprocureTenders(client, 'https://eprocure.gov.in/eprocure/app');

      expect(result.ok).toBe(true);
      expect(result.tenders.map((t) => t.id)).toEqual(['2026_ARMY_112233_1', '2026_MES_778899_1']);
      expect(result.failureReason).toBeUndefined();
    });

    it('flags captcha_detected and returns no tenders without crashing when the portal gates the route', async () => {
      const fetchFn = vi.fn().mockResolvedValue(jsonResponse('<html>Please Enter Captcha and click on Search button</html>'));
      const client = new TenderSessionClient({ fetchFn: fetchFn as unknown as typeof fetch });
      const result = await fetchEprocureTenders(client, 'https://eprocure.gov.in/eprocure/app');

      expect(result.ok).toBe(false);
      expect(result.failureReason).toBe('captcha_detected');
      expect(result.tenders).toEqual([]);
    });

    it('flags http_error without crashing on a non-2xx response', async () => {
      const fetchFn = vi.fn().mockResolvedValue(jsonResponse('Service Unavailable', 503));
      const client = new TenderSessionClient({ fetchFn: fetchFn as unknown as typeof fetch });
      const result = await fetchEprocureTenders(client, 'https://eprocure.gov.in/eprocure/app');

      expect(result.ok).toBe(false);
      expect(result.failureReason).toBe('http_error');
      expect(result.tenders).toEqual([]);
    });
  });
});
