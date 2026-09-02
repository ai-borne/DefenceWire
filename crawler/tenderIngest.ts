/**
 * Tender Ingestion Orchestrator (MOAT3 Phase 4)
 * Wires the four per-source scrapers (defproc, eprocure, PSU, iDEX/TDF)
 * built in Phases 1-3 into one ingest-cycle stage: fetch -> Layer 1-2 scope
 * filter (tenderFilterConfig.ts) -> Layer 3 Gemini extraction
 * (tenderExtractor.ts) -> program linking -> D1 upsert. Each source's
 * circuit breaker writes tender_source_health independently, so one
 * captcha/schema-mismatch source is skipped and flagged rather than
 * aborting the whole run — same philosophy as the Atomic Commit Guard in
 * crawler/ingest.ts.
 * Hard limit: <= 300 LOC.
 */

import { D1RestConfig, executeD1Query } from './archiveSync.js';
import { TenderSessionClient } from './tenderSessionClient.js';
import { parseDefprocListingHtml, RawDefprocTender } from './tenderScraperDefproc.js';
import { fetchEprocureTenders } from './tenderScraperEprocure.js';
import { PSU_SOURCES, fetchPsuTenders, RawPsuTender } from './tenderScraperPsu.js';
import { IDEX_TDF_SOURCES, fetchIdexTdfTenders, RawGrantTender } from './idexTdfScraper.js';
import { isTenderInScope } from './tenderFilterConfig.js';
import { extractTenderIntel } from './tenderExtractor.js';
import { linkTenderToPrograms } from './tenderProgramLinker.js';
import {
  buildUpsertTenderStatement,
  buildUpsertTenderHealthSuccessStatement,
  buildUpsertTenderHealthFailureStatement,
  TenderRow
} from '../src/archive/d1QueryBuilder.js';

const DEFPROC_URL = 'https://defproc.gov.in/nicgep/app?page=FrontEndLatestActiveTendersOrgwise&service=page';
const EPROCURE_URL = 'https://eprocure.gov.in/eprocure/app?page=FrontEndLatestActiveTendersOrgwise&service=page';
const PSU_LISTING_PATH = '/tenders';
const IDEX_URL = 'https://idex.gov.in/challenges';
const TDF_URL = 'https://tdf.drdo.in/calls';

export interface TenderIngestDeps {
  fetchFn?: typeof fetch;
  now?: () => Date;
  geminiApiKey?: string;
}

export interface TenderIngestResult {
  upserted: number;
  failedSources: string[];
}

interface UnifiedRaw {
  source: string;
  title: string;
  organisationChain: string;
  referenceNumber?: string;
  category?: string;
  publishedAt?: string;
  closingAt?: string;
  detailUrl: string;
  id: string;
}

function fromDefproc(t: RawDefprocTender, source: string): UnifiedRaw {
  return {
    source, title: t.title, organisationChain: t.organisationChain, referenceNumber: t.referenceNumber,
    publishedAt: t.publishedAt, closingAt: t.closingAt, detailUrl: t.detailUrl, id: t.id
  };
}

function fromPsu(t: RawPsuTender): UnifiedRaw {
  return {
    source: t.source, title: t.title, organisationChain: t.organisationChain,
    publishedAt: t.publishedAt, closingAt: t.closingAt, detailUrl: t.detailUrl, id: t.id
  };
}

function fromGrant(t: RawGrantTender): UnifiedRaw {
  return {
    source: t.source, title: t.title, organisationChain: t.organisationChain, category: t.category,
    closingAt: t.closingAt, detailUrl: t.detailUrl, id: t.id
  };
}

/** Filters to in-scope tenders, extracts domain/IDDM% intel, links programs, and upserts each one. */
async function persistTenders(
  tenders: UnifiedRaw[],
  config: D1RestConfig,
  fetchFn: typeof fetch,
  nowIso: string,
  geminiApiKey: string
): Promise<number> {
  let upserted = 0;
  for (const t of tenders) {
    const inScope = isTenderInScope({
      source: t.source, organisationChain: t.organisationChain, title: t.title, category: t.category
    });
    if (!inScope) continue;

    const intel = geminiApiKey
      ? await extractTenderIntel(
          { title: t.title, organisationChain: t.organisationChain, referenceNumber: t.referenceNumber, category: t.category },
          geminiApiKey,
          fetchFn
        )
      : null;
    const programIds = linkTenderToPrograms({
      title: t.title, organisationChain: t.organisationChain, referenceNumber: t.referenceNumber
    });

    const row: TenderRow = {
      id: t.id, source: t.source, title: t.title, organisation_chain: t.organisationChain,
      reference_number: t.referenceNumber ?? null, category: t.category ?? null,
      domain: intel?.domain ?? null, published_at: t.publishedAt ?? null, closing_at: t.closingAt ?? null,
      emd_amount: null, iddm_percent: intel?.iddmPercent ?? null,
      program_ids: JSON.stringify(programIds), detail_url: t.detailUrl, pdf_r2_key: null,
      status: 'active', first_seen_at: nowIso, last_seen_at: nowIso
    };

    const result = await executeD1Query(buildUpsertTenderStatement(row), config, fetchFn);
    if (result.ok) upserted++;
  }
  return upserted;
}

async function recordHealth(
  source: string, ok: boolean, reason: string | undefined,
  config: D1RestConfig, fetchFn: typeof fetch, nowIso: string
): Promise<void> {
  const statement = ok
    ? buildUpsertTenderHealthSuccessStatement(source, nowIso)
    : buildUpsertTenderHealthFailureStatement(source, reason || 'http_error', nowIso);
  try {
    await executeD1Query(statement, config, fetchFn);
  } catch (err) {
    console.error(`[TENDER HEALTH] ${source} health write failed:`, err);
  }
}

/** One source's fetch -> filter -> persist -> health-record pass, isolated so a single source's failure never aborts the others. */
async function ingestSource(
  source: string,
  fetchTenders: () => Promise<{ ok: boolean; tenders: UnifiedRaw[]; failureReason?: string }>,
  config: D1RestConfig, fetchFn: typeof fetch, nowIso: string, geminiApiKey: string
): Promise<{ upserted: number; failed: boolean }> {
  try {
    const result = await fetchTenders();
    if (!result.ok) {
      await recordHealth(source, false, result.failureReason, config, fetchFn, nowIso);
      return { upserted: 0, failed: true };
    }
    const upserted = await persistTenders(result.tenders, config, fetchFn, nowIso, geminiApiKey);
    await recordHealth(source, true, undefined, config, fetchFn, nowIso);
    return { upserted, failed: false };
  } catch (err) {
    console.error(`[TENDER INGEST] ${source} error:`, err);
    return { upserted: 0, failed: true };
  }
}

export async function runTenderIngestion(
  config: D1RestConfig | null,
  deps: TenderIngestDeps = {}
): Promise<TenderIngestResult> {
  if (!config) return { upserted: 0, failedSources: [] };

  const fetchFn = deps.fetchFn ?? globalThis.fetch;
  const nowIso = (deps.now ?? (() => new Date()))().toISOString();
  const geminiApiKey = deps.geminiApiKey ?? '';

  let upserted = 0;
  const failedSources: string[] = [];

  const tasks: { source: string; fetchTenders: () => Promise<{ ok: boolean; tenders: UnifiedRaw[]; failureReason?: string }> }[] = [
    {
      source: 'defproc',
      fetchTenders: async () => {
        const client = new TenderSessionClient({ fetchFn });
        const result = await client.fetch(DEFPROC_URL);
        if (result.captchaDetected) return { ok: false, tenders: [], failureReason: 'captcha_detected' };
        if (!result.ok) return { ok: false, tenders: [], failureReason: 'http_error' };
        return { ok: true, tenders: parseDefprocListingHtml(result.body, 'defproc').map((t) => fromDefproc(t, 'defproc')) };
      }
    },
    {
      source: 'eprocure',
      fetchTenders: async () => {
        const client = new TenderSessionClient({ fetchFn });
        const result = await fetchEprocureTenders(client, EPROCURE_URL);
        return { ok: result.ok, tenders: result.tenders.map((t) => fromDefproc(t, 'eprocure')), failureReason: result.failureReason };
      }
    },
    ...PSU_SOURCES.map((psuConfig) => ({
      source: psuConfig.source,
      fetchTenders: async () => {
        const client = new TenderSessionClient({ fetchFn });
        const result = await fetchPsuTenders(client, psuConfig, `${psuConfig.baseUrl}${PSU_LISTING_PATH}`);
        return { ok: result.ok, tenders: result.tenders.map(fromPsu), failureReason: result.failureReason };
      }
    })),
    ...IDEX_TDF_SOURCES.map((grantConfig) => ({
      source: grantConfig.source,
      fetchTenders: async () => {
        const client = new TenderSessionClient({ fetchFn });
        const url = grantConfig.source === 'idex' ? IDEX_URL : TDF_URL;
        const result = await fetchIdexTdfTenders(client, grantConfig, url);
        return { ok: result.ok, tenders: result.tenders.filter((t) => t.isOpen).map(fromGrant), failureReason: result.failureReason };
      }
    }))
  ];

  for (const task of tasks) {
    const outcome = await ingestSource(task.source, task.fetchTenders, config, fetchFn, nowIso, geminiApiKey);
    upserted += outcome.upserted;
    if (outcome.failed) failedSources.push(task.source);
  }

  return { upserted, failedSources };
}
