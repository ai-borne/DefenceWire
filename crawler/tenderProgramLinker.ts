/**
 * Tender-to-Strategic-Program Linker (MOAT3 Phase 2)
 * Thin wrapper over the existing src/engine/programMatcher.ts regex matcher —
 * no parallel matcher (DRY/SSOT). Links a tender's title/org-chain/reference
 * number to the strategic programs it names, for the `program_ids` column.
 * Hard limit: <= 300 LOC.
 */

import { matchProgramIds } from '../src/engine/programMatcher.js';

export interface TenderProgramLinkInput {
  title: string;
  organisationChain?: string;
  referenceNumber?: string;
}

/** Returns distinct strategic program IDs mentioned in a tender's text fields. */
export function linkTenderToPrograms(tender: TenderProgramLinkInput): string[] {
  const parts = [tender.title, tender.organisationChain, tender.referenceNumber].filter(Boolean);
  return matchProgramIds(parts.join(' '));
}
