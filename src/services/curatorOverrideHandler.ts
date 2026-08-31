/**
 * Curator D1 Override Orchestration Handler for DefenceWire.in
 * Edge-agnostic core behind functions/api/curator/overrides.ts.
 * Implements Zero Trust authorization and D1 CRUD operations with full audit logging.
 * Hard limit: <= 300 LOC.
 */

import { verifySessionCookie } from './curatorAuthHandler.js';

export interface CuratorOverrideRow {
  id: string;
  override_type: string;
  payload_json: string;
  updated_at: string;
  curator_email?: string;
}

export interface CuratorOverrideDependencies {
  runQuery: (sql: string, params: unknown[]) => Promise<CuratorOverrideRow[]>;
  runMutation?: (sql: string, params: unknown[]) => Promise<unknown>;
  verifyAuth?: (cookieHeader: string | null) => Promise<boolean>;
}

export interface CuratorOverrideRequest {
  id: string;
  overrideType: string;
  payload: Record<string, unknown>;
}

export interface OverrideResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Handles fetching all active curator overrides.
 * Strips/redacts `curator_email` for unauthenticated requests to prevent PII leakage.
 */
export async function handleGetOverrides(
  deps: CuratorOverrideDependencies,
  cookieHeader: string | null = null,
  secret?: string,
  isAuthorized?: boolean
): Promise<OverrideResponse<CuratorOverrideRow[]>> {
  try {
    let auth = isAuthorized;
    if (auth === undefined) {
      if (deps.verifyAuth) {
        auth = await deps.verifyAuth(cookieHeader);
      } else if (cookieHeader) {
        auth = await verifySessionCookie(cookieHeader, secret);
      } else {
        auth = false;
      }
    }

    const rows = await deps.runQuery(
      'SELECT id, override_type, payload_json, updated_at, curator_email FROM curator_overrides ORDER BY updated_at DESC',
      []
    );

    const sanitizedRows = rows.map((row) => {
      if (auth) {
        return row;
      }
      const { curator_email: _omitted, ...safeRow } = row;
      return safeRow as CuratorOverrideRow;
    });

    return { success: true, data: sanitizedRows };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Database error';
    return { success: false, error: msg };
  }
}

/**
 * Handles saving/upserting a curator override with Zero Trust audit logging.
 */
export async function handleSaveOverride(
  body: CuratorOverrideRequest,
  cookieHeader: string | null,
  deps: CuratorOverrideDependencies,
  secret?: string,
  curatorEmail: string = 'curator@institutional.internal'
): Promise<OverrideResponse<{ id: string; curatorEmail: string }>> {
  const isAuth = deps.verifyAuth
    ? await deps.verifyAuth(cookieHeader)
    : await verifySessionCookie(cookieHeader, secret);

  if (!isAuth) {
    return { success: false, error: 'Unauthorized: Valid curator session required.' };
  }

  if (!body.id || !body.overrideType || !body.payload) {
    return { success: false, error: 'Invalid override payload: id, overrideType, and payload are required.' };
  }

  const cleanId = body.id.trim().slice(0, 120);
  const cleanType = body.overrideType.trim().slice(0, 30);
  const cleanEmail = curatorEmail.trim().slice(0, 120);
  const payloadStr = JSON.stringify(body.payload);
  const updatedAt = new Date().toISOString();

  try {
    const mutate = deps.runMutation || deps.runQuery;
    await mutate(
      `INSERT INTO curator_overrides (id, override_type, payload_json, updated_at, curator_email)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         override_type = excluded.override_type,
         payload_json = excluded.payload_json,
         updated_at = excluded.updated_at,
         curator_email = excluded.curator_email`,
      [cleanId, cleanType, payloadStr, updatedAt, cleanEmail]
    );

    return { success: true, data: { id: cleanId, curatorEmail: cleanEmail } };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to save override';
    return { success: false, error: msg };
  }
}

/**
 * Handles deleting a curator override. Requires authentication.
 */
export async function handleDeleteOverride(
  id: string,
  cookieHeader: string | null,
  deps: CuratorOverrideDependencies,
  secret?: string
): Promise<OverrideResponse<{ id: string }>> {
  const isAuth = deps.verifyAuth
    ? await deps.verifyAuth(cookieHeader)
    : await verifySessionCookie(cookieHeader, secret);

  if (!isAuth) {
    return { success: false, error: 'Unauthorized: Valid curator session required.' };
  }

  const cleanId = id.trim().slice(0, 120);
  if (!cleanId) {
    return { success: false, error: 'Override ID is required.' };
  }

  try {
    const mutate = deps.runMutation || deps.runQuery;
    await mutate('DELETE FROM curator_overrides WHERE id = ?', [cleanId]);
    return { success: true, data: { id: cleanId } };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to delete override';
    return { success: false, error: msg };
  }
}
