/**
 * Unit Tests for defproc.gov.in Tender Listing Parser
 * Fixture-based — no live network in CI (tests/fixtures/defprocLatestActiveTenders.html).
 * Hard limit: <= 300 LOC.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseDefprocDate, parseDefprocListingHtml } from '../../crawler/tenderScraperDefproc.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_HTML = readFileSync(join(__dirname, '../fixtures/defprocLatestActiveTenders.html'), 'utf-8');

describe('defproc.gov.in Tender Listing Parser', () => {
  describe('parseDefprocDate', () => {
    it('parses a date-only value into ISO date', () => {
      expect(parseDefprocDate('26-Aug-2026')).toBe('2026-08-26');
    });

    it('parses a date+time value with AM/PM into ISO datetime', () => {
      expect(parseDefprocDate('15-Sep-2026 05:00 PM')).toBe('2026-09-15T17:00:00');
      expect(parseDefprocDate('16-Sep-2026 11:00 AM')).toBe('2026-09-16T11:00:00');
    });

    it('handles 12 AM / 12 PM edge cases', () => {
      expect(parseDefprocDate('01-Jan-2026 12:00 AM')).toBe('2026-01-01T00:00:00');
      expect(parseDefprocDate('01-Jan-2026 12:00 PM')).toBe('2026-01-01T12:00:00');
    });

    it('returns empty string for unparseable input', () => {
      expect(parseDefprocDate('not a date')).toBe('');
      expect(parseDefprocDate('')).toBe('');
    });
  });

  describe('parseDefprocListingHtml', () => {
    const results = parseDefprocListingHtml(FIXTURE_HTML);

    it('extracts every tender row from the fixture listing table', () => {
      expect(results).toHaveLength(3);
    });

    it('extracts a raw record with all fields correctly mapped', () => {
      const first = results[0]!;
      expect(first.id).toBe('2026_IAF_787429_1');
      expect(first.title).toBe('Procurement of Spare Parts for Su-30MKI Avionics Suite');
      expect(first.referenceNumber).toBe('AF/2026/B/787429');
      expect(first.organisationChain).toBe('Ministry Of Defence | Indian Air Force | Air Headquarters');
      expect(first.publishedAt).toBe('2026-08-26');
      expect(first.closingAt).toBe('2026-09-15T17:00:00');
      expect(first.detailUrl).toContain('encId=2026_IAF_787429_1');
      expect(first.detailUrl.startsWith('https://defproc.gov.in')).toBe(true);
    });

    it('includes a civic/estate tender row as a raw record (scope filtering is a later layer, not this parser)', () => {
      const civic = results.find((r) => r.id === '2026_MES_991122_1');
      expect(civic).toBeDefined();
      expect(civic!.organisationChain).toContain('DGDE Cantonment Board');
    });

    it('returns an empty array for HTML with no list_table', () => {
      expect(parseDefprocListingHtml('<html><body>No table here</body></html>')).toEqual([]);
    });

    it('returns an empty array for empty/falsy input', () => {
      expect(parseDefprocListingHtml('')).toEqual([]);
    });

    it('skips rows missing a detail link with an encId', () => {
      const html = `<table class="list_table">
        <tr class="list_header"><td>S.No</td><td>e-Published Date</td><td>Bid Submission Closing Date</td><td>Tender Opening Date</td><td>Title</td><td>Org</td></tr>
        <tr class="even"><td>1</td><td>26-Aug-2026</td><td>15-Sep-2026 05:00 PM</td><td>16-Sep-2026 11:00 AM</td><td>No link here</td><td>Org Chain</td></tr>
      </table>`;
      expect(parseDefprocListingHtml(html)).toEqual([]);
    });

    it('tags eprocure-sourced rows distinctly when a raw encId lacks the native underscore-delimited shape', () => {
      const html = `<table class="list_table">
        <tr class="list_header"><td>S.No</td><td>e-Published Date</td><td>Bid Submission Closing Date</td><td>Tender Opening Date</td><td>Title</td><td>Org</td></tr>
        <tr class="even"><td>1</td><td>26-Aug-2026</td><td>15-Sep-2026 05:00 PM</td><td>16-Sep-2026 11:00 AM</td>
          <td><a href="/nicgep/app?page=WebTenderStatusLists&amp;encId=opaqueToken">Some Title<br/>Tender No: X/1<br/></a></td>
          <td>Org Chain</td></tr>
      </table>`;
      const [record] = parseDefprocListingHtml(html, 'eprocure');
      expect(record!.id.startsWith('eprocure-')).toBe(true);
    });
  });
});
