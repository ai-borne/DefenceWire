/**
 * Curator Supplier Candidate Review Handler for DefenceWire.in
 * Edge-agnostic core behind functions/api/curator/supplier-candidates.ts —
 * the Curator Desk's click-through alternative to
 * scripts/review-supplier-candidates.mjs (Phase 2.6). Both paths write to
 * the same supplier_candidates / program_suppliers tables; this one is
 * gated by the same Cloudflare Zero Trust / passcode session as story
 * curation, not a separate auth system.
 * Hard limit: <= 300 LOC.
 */

import { verifySessionCookie } from './curatorAuthHandler.js';

export interface SupplierCandidateRow {
  id: string;
  candidate_type: string;
  supplier_id: string;
  supplier_name: string;
  program_id: string;
  subsystem_name: string;
  source_story_id: string | null;
  source_domains: string;
  mention_count: number;
  source_count: number;
  confidence: number;
  status: string;
  first_seen_at: string;
  last_seen_at: string;
}

export interface CuratorSupplierCandidateDependencies {
  runQuery: (sql: string, params: unknown[]) => Promise<Record<string, unknown>[]>;
  runMutation?: (sql: string, params: unknown[]) => Promise<unknown>;
  verifyAuth?: (cookieHeader: string | null) => Promise<boolean>;
}

export interface CuratorSupplierCandidateResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

async function resolveAuth(
  deps: CuratorSupplierCandidateDependencies,
  cookieHeader: string | null,
  secret: string | undefined,
  isAuthorized: boolean | undefined
): Promise<boolean> {
  if (isAuthorized !== undefined) return isAuthorized;
  if (deps.verifyAuth) return deps.verifyAuth(cookieHeader);
  if (!cookieHeader) return false;
  return verifySessionCookie(cookieHeader, secret);
}

/** Lists pending supplier-candidate rows — curator-only, unlike public override reads. */
export async function handleListSupplierCandidates(
  deps: CuratorSupplierCandidateDependencies,
  cookieHeader: string | null = null,
  secret?: string,
  isAuthorized?: boolean
): Promise<CuratorSupplierCandidateResponse<SupplierCandidateRow[]>> {
  const auth = await resolveAuth(deps, cookieHeader, secret, isAuthorized);
  if (!auth) {
    return { success: false, error: 'Unauthorized: Valid curator session required.' };
  }

  try {
    const rows = await deps.runQuery(
      `SELECT id, candidate_type, supplier_id, supplier_name, program_id, subsystem_name,
              source_story_id, source_domains, mention_count, source_count, confidence,
              status, first_seen_at, last_seen_at
       FROM supplier_candidates WHERE status = 'pending'
       ORDER BY confidence DESC, mention_count DESC;`,
      []
    );
    return { success: true, data: rows as unknown as SupplierCandidateRow[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Database error' };
  }
}

export interface SupplierCandidateReviewRequest {
  id: string;
  action: 'approve' | 'reject';
}

/** Approves (promotes into program_suppliers) or rejects one pending candidate. */
export async function handleReviewSupplierCandidate(
  body: SupplierCandidateReviewRequest,
  cookieHeader: string | null,
  deps: CuratorSupplierCandidateDependencies,
  secret: string | undefined,
  curatorEmail: string = 'curator@institutional.internal'
): Promise<CuratorSupplierCandidateResponse<{ id: string; status: string }>> {
  const auth = await resolveAuth(deps, cookieHeader, secret, undefined);
  if (!auth) {
    return { success: false, error: 'Unauthorized: Valid curator session required.' };
  }

  if (!body.id || (body.action !== 'approve' && body.action !== 'reject')) {
    return { success: false, error: 'Invalid request: id and a valid action (approve/reject) are required.' };
  }

  const mutate = deps.runMutation || deps.runQuery;
  const cleanId = body.id.trim().slice(0, 300);
  const cleanEmail = curatorEmail.trim().slice(0, 120);

  try {
    const rows = await deps.runQuery(
      'SELECT * FROM supplier_candidates WHERE id = ? AND status = ? LIMIT 1;',
      [cleanId, 'pending']
    );
    const candidate = rows[0] as unknown as SupplierCandidateRow | undefined;
    if (!candidate) {
      return { success: false, error: `No pending candidate found with id "${cleanId}".` };
    }

    const now = new Date().toISOString();

    if (body.action === 'approve') {
      const supplierRows = await deps.runQuery('SELECT tier FROM suppliers WHERE id = ? LIMIT 1;', [candidate.supplier_id]);
      const supplierTier = (supplierRows[0] as { tier?: string } | undefined)?.tier;
      if (!supplierTier) {
        return { success: false, error: `Supplier "${candidate.supplier_id}" not found in the live suppliers table.` };
      }
      await mutate(
        `INSERT INTO program_suppliers (program_id, subsystem_name, supplier_id, tier, indigenisation_status, promoted_at)
         VALUES (?, ?, ?, ?, 'in_house', ?)
         ON CONFLICT(program_id, subsystem_name, supplier_id) DO NOTHING;`,
        [candidate.program_id, candidate.subsystem_name, candidate.supplier_id, supplierTier, now]
      );
    }

    const newStatus = body.action === 'approve' ? 'approved' : 'rejected';
    await mutate(
      `UPDATE supplier_candidates SET status = ?, reviewed_at = ?, reviewed_by = ? WHERE id = ?;`,
      [newStatus, now, cleanEmail, cleanId]
    );

    return { success: true, data: { id: cleanId, status: newStatus } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Database error' };
  }
}
