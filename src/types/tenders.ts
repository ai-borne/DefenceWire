/**
 * Frontend Tender Types for DefenceWire.in
 * Camel-case view shape for a tender/RFP or iDEX/TDF innovation-grant record,
 * mirroring the D1 TenderRow (src/archive/d1QueryBuilder.ts) the way
 * StoryCluster mirrors ArchivedStoryRow.
 * Hard limit: <= 300 LOC.
 */

export type TenderStatus = 'active' | 'closed' | 'cancelled';

export type TenderSourceScope = 'mod' | 'idex' | 'all';

export interface Tender {
  id: string;
  source: string;
  title: string;
  organisationChain: string;
  referenceNumber: string | null;
  category: string | null;
  domain: string | null;
  publishedAt: string | null;
  closingAt: string | null;
  emdAmount: number | null;
  iddmPercent: number | null;
  programIds: string[];
  detailUrl: string;
  pdfR2Key: string | null;
  status: TenderStatus;
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface TenderFilters {
  status: TenderStatus | 'all';
  domain: string | 'all';
  sourceScope: TenderSourceScope;
  query: string;
}
