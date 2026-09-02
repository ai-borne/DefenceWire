/**
 * Tender Scope Filter SSOT (MOAT3 Phase 2)
 * Single source of truth for the defence-scope filtering rules described in
 * the MOAT3 plan: Layer 1 (source-level org-chain allowlist for eprocure.gov.in,
 * which spans all-of-govt) and Layer 2 (deterministic exclude by org-chain
 * substring / category / keyword denylist). Both layers are pure, table-driven
 * functions — no live network, no model calls (CLAUDE.md Rule 5: code does
 * routing, the model only does judgment on what survives these layers).
 * Hard limit: <= 300 LOC.
 */

/** Org-chain substrings that mark a tender as civic/estate scope, not acquisition (excluded regardless of source). */
export const CIVIC_ORG_CHAIN_DENYLIST: string[] = [
  'Cantonment Board',
  'DGDE',
  'MES'
];

/** Tender categories that only matter when raised under an excluded civic/estate org chain (Works = civil works there). */
export const CIVIC_CATEGORY_DENYLIST = new Set(['Works']);

/** Keyword backstop for civic/estate tenders that slip through org-chain matching (e.g. a differently-named sub-office). */
export const CIVIC_KEYWORD_DENYLIST: string[] = [
  'street light',
  'park',
  'horticulture',
  'catering',
  'sanitation',
  'painting of building'
];

/** Org-chain tokens in scope for eprocure.gov.in, which spans all of government (defproc/PSU sites are MoD-only by construction). */
export const EPROCURE_ORG_ALLOWLIST: string[] = [
  'Indian Army',
  'Indian Navy',
  'Indian Air Force',
  'DRDO',
  'Bharat Dynamics',
  'Mazagon Dock',
  'BEML',
  'Indian Coast Guard',
  'Ordnance Factory',
  'Bharat Electronics'
];

function containsAnySubstring(haystack: string, needles: string[]): boolean {
  if (!haystack) return false;
  const lower = haystack.toLowerCase();
  return needles.some((needle) => lower.includes(needle.toLowerCase()));
}

/** Layer 2a: excludes by civic/estate org-chain substring (Cantonment Board / DGDE / MES). */
export function isExcludedByOrgChain(organisationChain: string): boolean {
  return containsAnySubstring(organisationChain, CIVIC_ORG_CHAIN_DENYLIST);
}

/** Layer 2a (category form): a 'Works' category tender is civil/estate scope only when also raised under a civic org chain. */
export function isExcludedByCategory(organisationChain: string, category: string | undefined): boolean {
  if (!category || !CIVIC_CATEGORY_DENYLIST.has(category)) return false;
  return isExcludedByOrgChain(organisationChain);
}

/** Layer 2b: keyword backstop over the tender title for civic/estate content that slips org-chain matching. */
export function isExcludedByKeyword(title: string): boolean {
  return containsAnySubstring(title, CIVIC_KEYWORD_DENYLIST);
}

/** Layer 1: eprocure.gov.in-only allowlist — defproc/PSU sources are in-scope by construction and skip this check. */
export function isEprocureOrgAllowed(organisationChain: string): boolean {
  return containsAnySubstring(organisationChain, EPROCURE_ORG_ALLOWLIST);
}

export interface TenderScopeInput {
  source: string;
  organisationChain: string;
  title: string;
  category?: string;
}

/**
 * Combined defence-scope decision applied to every raw tender before it
 * reaches Gemini extraction (Layer 3) — cheapest-first, deterministic only.
 */
export function isTenderInScope(input: TenderScopeInput): boolean {
  if (input.source === 'eprocure' && !isEprocureOrgAllowed(input.organisationChain)) {
    return false;
  }
  if (isExcludedByOrgChain(input.organisationChain)) return false;
  if (isExcludedByCategory(input.organisationChain, input.category)) return false;
  if (isExcludedByKeyword(input.title)) return false;
  return true;
}
