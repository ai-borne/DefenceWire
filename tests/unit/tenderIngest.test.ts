/**
 * Unit Tests for the Tender Ingestion Orchestrator (MOAT3 Phase 4)
 * Verifies the circuit breaker: a captcha/schema-mismatch/http_error on one
 * source is flagged in tender_source_health and the source is skipped,
 * without aborting the other sources' ingestion — the core regression this
 * module exists to guard (plan Phase 3/4 gate). No live network: every
 * fetch is mocked per-URL.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, vi } from 'vitest';
import { runTenderIngestion } from '../../crawler/tenderIngest.js';
import type { D1RestConfig } from '../../crawler/archiveSync.js';

const config: D1RestConfig = { accountId: 'acct', databaseId: 'db', apiToken: 'token' };

// Column layout matches tests/fixtures/defprocLatestActiveTenders.html exactly:
// S.No / Published / Closing / Opening / Title+Ref (link) / Organisation Chain.
const DEFPROC_LISTING_TABLE = `<table class="list_table"><tr class="odd">
  <td>1</td><td>26-Aug-2026</td><td>15-Sep-2026 05:00 PM</td><td>16-Sep-2026 11:00 AM</td>
  <td><a href="app?page=FrontEndTenderDetail&encId=2026_IAF_787429_1">Radar Spares<br>Tender No: IAF/2026/RADAR/1</a></td>
  <td>Indian Air Force</td>
</tr></table>`;

const D1_OK_RESPONSE = JSON.stringify({ result: [{ results: [] }] });

function makeFetch(routes: Record<string, { status: number; body: string }>) {
  return vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    for (const [match, resp] of Object.entries(routes)) {
      if (url.includes(match)) {
        return new Response(resp.body, { status: resp.status, headers: { 'content-type': 'text/html' } });
      }
    }
    // D1 REST endpoint — always accept writes so we can isolate scraper behavior.
    if (url.includes('api.cloudflare.com')) {
      return new Response(D1_OK_RESPONSE, { status: 200 });
    }
    return new Response('', { status: 404 });
  });
}

describe('runTenderIngestion — resilience', () => {
  it('no-ops without hitting the network when D1 config is absent', async () => {
    const fetchFn = vi.fn();
    const result = await runTenderIngestion(null, { fetchFn: fetchFn as unknown as typeof fetch });

    expect(result).toEqual({ upserted: 0, failedSources: [] });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('flags a captcha-gated source and continues ingesting the rest rather than aborting the run', async () => {
    const fetchFn = makeFetch({
      'defproc.gov.in': { status: 200, body: '<html>Enter Captcha and click Search</html>' },
      'eprocure.gov.in': { status: 200, body: DEFPROC_LISTING_TABLE.replace('Indian Air Force', 'Indian Army') },
      'bdl-india.in': { status: 200, body: '<table id="tenderTable"></table>' },
      'mazagondock.in': { status: 200, body: '<table id="tenderTable"></table>' },
      'beml.co.in': { status: 200, body: '<table id="tenderTable"></table>' },
      'indiancoastguard.gov.in': { status: 200, body: '<table id="tenderTable"></table>' },
      'idex.gov.in': { status: 200, body: '<html></html>' },
      'tdf.drdo.in': { status: 200, body: '<html></html>' }
    });

    const result = await runTenderIngestion(config, { fetchFn });

    expect(result.failedSources).toContain('defproc');
    // eprocure's fixture row is in-scope (Indian Army) and should have upserted successfully.
    expect(result.failedSources).not.toContain('eprocure');
    expect(result.upserted).toBeGreaterThan(0);
  });

  it('records a captcha_detected health write for the failing source', async () => {
    const fetchFn = makeFetch({
      'defproc.gov.in': { status: 200, body: '<html>Please provide Captcha</html>' },
      'eprocure.gov.in': { status: 200, body: '<html></html>' },
      'bdl-india.in': { status: 200, body: '<table id="tenderTable"></table>' },
      'mazagondock.in': { status: 200, body: '<table id="tenderTable"></table>' },
      'beml.co.in': { status: 200, body: '<table id="tenderTable"></table>' },
      'indiancoastguard.gov.in': { status: 200, body: '<table id="tenderTable"></table>' },
      'idex.gov.in': { status: 200, body: '<html></html>' },
      'tdf.drdo.in': { status: 200, body: '<html></html>' }
    });

    await runTenderIngestion(config, { fetchFn });

    const healthWriteCall = fetchFn.mock.calls.find(([, init]) => {
      const body = (init as RequestInit | undefined)?.body;
      return typeof body === 'string' && body.includes('captcha_detected') && body.includes('defproc');
    });
    expect(healthWriteCall).toBeTruthy();
  });

  it('never calls Gemini extraction when no API key is configured', async () => {
    const fetchFn = makeFetch({
      'defproc.gov.in': { status: 200, body: DEFPROC_LISTING_TABLE },
      'eprocure.gov.in': { status: 200, body: '<html></html>' },
      'bdl-india.in': { status: 200, body: '<table id="tenderTable"></table>' },
      'mazagondock.in': { status: 200, body: '<table id="tenderTable"></table>' },
      'beml.co.in': { status: 200, body: '<table id="tenderTable"></table>' },
      'indiancoastguard.gov.in': { status: 200, body: '<table id="tenderTable"></table>' },
      'idex.gov.in': { status: 200, body: '<html></html>' },
      'tdf.drdo.in': { status: 200, body: '<html></html>' }
    });

    await runTenderIngestion(config, { fetchFn, geminiApiKey: '' });

    const geminiCall = fetchFn.mock.calls.find(([input]) => {
      const url = typeof input === 'string' ? input : (input as URL | Request).toString();
      return url.includes('generativelanguage.googleapis.com');
    });
    expect(geminiCall).toBeUndefined();
  });
});
