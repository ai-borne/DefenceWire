/**
 * Curator Emergent Pattern Handler for DefenceWire.in (Phase 5)
 * Edge-agnostic core logic behind functions/api/curator/patterns.ts.
 * Enforces Zero Trust / passcode authentication, SQL parameterization,
 * and status transitions for emergent hypotheses.
 * Hard limit: <= 300 LOC.
 */

import { verifySessionCookie } from './curatorAuthHandler.js';
import {
  EmergentPattern,
  EmergentPatternRow,
  PatternQueryOptions,
  PatternReviewRequest,
  patternRowToEmergentPattern
} from '../types/patterns.js';
import {
  buildListPatternsStatement,
  buildGetPatternByIdStatement,
  buildReviewPatternStatement
} from './curatorPatternQueryBuilder.js';

export interface CuratorPatternDependencies {
  runQuery: (sql: string, params: unknown[]) => Promise<Record<string, unknown>[]>;
  runMutation?: (sql: string, params: unknown[]) => Promise<unknown>;
  verifyAuth?: (cookieHeader: string | null) => Promise<boolean>;
}

export interface CuratorPatternResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

async function resolveAuth(
  deps: CuratorPatternDependencies,
  cookieHeader: string | null,
  secret: string | undefined,
  isAuthorized: boolean | undefined
): Promise<boolean> {
  if (isAuthorized !== undefined) return isAuthorized;
  if (deps.verifyAuth) return deps.verifyAuth(cookieHeader);
  if (!cookieHeader) return false;
  return verifySessionCookie(cookieHeader, secret);
}

/**
 * Lists emergent pattern candidates filtered by status.
 * Curator-only endpoint.
 */
export async function handleListPatterns(
  deps: CuratorPatternDependencies,
  options: PatternQueryOptions = {},
  cookieHeader: string | null = null,
  secret?: string,
  isAuthorized?: boolean
): Promise<CuratorPatternResponse<EmergentPattern[]>> {
  const auth = await resolveAuth(deps, cookieHeader, secret, isAuthorized);
  if (!auth) {
    return { success: false, error: 'Unauthorized: Valid curator session required.' };
  }

  try {
    const stmt = buildListPatternsStatement(options);
    const rows = (await deps.runQuery(stmt.sql, stmt.params)) as unknown as EmergentPatternRow[];
    const patterns = rows.map(patternRowToEmergentPattern);
    return { success: true, data: patterns };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Database error' };
  }
}

/**
 * Approves, rejects, or edits an emergent pattern hypothesis.
 */
export async function handleReviewPattern(
  body: PatternReviewRequest,
  deps: CuratorPatternDependencies,
  cookieHeader: string | null = null,
  secret?: string,
  isAuthorized?: boolean,
  curatorEmail: string = 'curator@institutional.internal'
): Promise<CuratorPatternResponse<EmergentPattern>> {
  const auth = await resolveAuth(deps, cookieHeader, secret, isAuthorized);
  if (!auth) {
    return { success: false, error: 'Unauthorized: Valid curator session required.' };
  }

  if (!body.id || !['approve', 'reject', 'edit'].includes(body.action)) {
    return { success: false, error: 'Invalid request: id and valid action are required.' };
  }

  try {
    const checkStmt = buildGetPatternByIdStatement(body.id);
    const existing = (await deps.runQuery(checkStmt.sql, checkStmt.params)) as unknown as EmergentPatternRow[];
    if (!existing || existing.length === 0) {
      return { success: false, error: `Pattern candidate '${body.id}' not found.` };
    }

    const updateStmt = buildReviewPatternStatement(body, curatorEmail);
    if (deps.runMutation) {
      await deps.runMutation(updateStmt.sql, updateStmt.params);
    } else {
      await deps.runQuery(updateStmt.sql, updateStmt.params);
    }

    const updatedRows = (await deps.runQuery(checkStmt.sql, checkStmt.params)) as unknown as EmergentPatternRow[];
    const updatedRow = updatedRows[0];
    if (!updatedRow) {
      return { success: false, error: 'Failed to retrieve updated pattern.' };
    }

    return {
      success: true,
      data: patternRowToEmergentPattern(updatedRow)
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Database error' };
  }
}
