/**
 * Tender Row Mapper for DefenceWire.in
 * SSOT translation from a D1 TenderRow (snake_case, src/archive/d1QueryBuilder.ts)
 * to the camel-case Tender view shape, mirroring src/archive/archiveRow.ts.
 * Hard limit: <= 300 LOC.
 */

import { TenderRow } from '../archive/d1QueryBuilder.js';
import { Tender, TenderStatus } from '../types/tenders.js';

const VALID_STATUSES: readonly TenderStatus[] = ['active', 'closed', 'cancelled'];

function toStatus(raw: string): TenderStatus {
  return (VALID_STATUSES as readonly string[]).includes(raw) ? (raw as TenderStatus) : 'active';
}

function parseProgramIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export function fromTenderRow(row: TenderRow): Tender {
  return {
    id: row.id,
    source: row.source,
    title: row.title,
    organisationChain: row.organisation_chain,
    referenceNumber: row.reference_number,
    category: row.category,
    domain: row.domain,
    publishedAt: row.published_at,
    closingAt: row.closing_at,
    emdAmount: row.emd_amount,
    iddmPercent: row.iddm_percent,
    programIds: parseProgramIds(row.program_ids),
    detailUrl: row.detail_url,
    pdfR2Key: row.pdf_r2_key,
    status: toStatus(row.status),
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at
  };
}
