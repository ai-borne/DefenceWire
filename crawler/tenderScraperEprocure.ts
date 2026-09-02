/**
 * eprocure.gov.in Tender Scraper (MOAT3 Phase 3 — source breadth)
 * Shares the NIC eProcurement `list_table` markup with defproc.gov.in
 * (parseDefprocListingHtml is source-agnostic), but eprocure.gov.in spans
 * all-of-government, not just MoD — so Layer 1 (org-chain allowlist,
 * tenderFilterConfig.ts) is applied here before anything downstream ever
 * sees a non-defence row. Layer 2 (civic/estate exclusion) runs later in
 * the pipeline against the already-allowlisted set.
 * Hard limit: <= 300 LOC.
 */

import { parseDefprocListingHtml, RawDefprocTender } from './tenderScraperDefproc.js';
import { TenderSessionClient } from './tenderSessionClient.js';
import { isEprocureOrgAllowed } from './tenderFilterConfig.js';

export interface TenderScrapeResult {
  ok: boolean;
  tenders: RawDefprocTender[];
  failureReason?: 'captcha_detected' | 'http_error';
}

/** Layer 1: drops any row whose organisation chain isn't on the defence allowlist. */
export function filterEprocureAllowed(tenders: RawDefprocTender[]): RawDefprocTender[] {
  return tenders.filter((tender) => isEprocureOrgAllowed(tender.organisationChain));
}

/** Fetches+parses one eprocure.gov.in listing page, applying the Layer 1 allowlist before returning. */
export async function fetchEprocureTenders(client: TenderSessionClient, url: string): Promise<TenderScrapeResult> {
  const result = await client.fetch(url);

  if (result.captchaDetected) {
    return { ok: false, tenders: [], failureReason: 'captcha_detected' };
  }
  if (!result.ok) {
    return { ok: false, tenders: [], failureReason: 'http_error' };
  }

  const raw = parseDefprocListingHtml(result.body, 'eprocure');
  return { ok: true, tenders: filterEprocureAllowed(raw) };
}
