/**
 * Tender Lifecycle Pruner (MOAT3 Phase 2)
 * Transitions active tenders past their closing date to 'closed' (kept as
 * historical record, not deleted — same "archive don't delete" philosophy as
 * archived_stories), and hard-deletes tenders closed for longer than the
 * retention window with no program linkage and no curator override. Runs
 * every ingest cycle so the `tenders` table's D1 read/write footprint stays
 * flat over time instead of growing unbounded.
 * The bulk transition/delete runs as direct SQL (buildCloseStaleTendersStatement
 * / buildDeleteStaleClosedTendersStatement) rather than a fetch-then-filter
 * round trip, so the maintenance pass itself is never an unbounded table scan.
 * Hard limit: <= 300 LOC.
 */

import { D1RestConfig, executeD1Query } from './archiveSync.js';
import { buildCloseStaleTendersStatement, buildDeleteStaleClosedTendersStatement } from '../src/archive/d1QueryBuilder.js';

export const DEFAULT_CLOSE_AFTER_DAYS = 30;
export const DEFAULT_DELETE_AFTER_DAYS = 180;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface TenderLifecycleRow {
  id: string;
  status: 'active' | 'closed' | 'cancelled';
  closingAt: string;
  lastSeenAt: string;
  programIds: string | null;
}

export function computeCutoffIso(now: Date, days: number): string {
  return new Date(now.getTime() - days * DAY_MS).toISOString();
}

/** True when program_ids is absent, unparseable, or an empty JSON array. */
export function hasNoProgramLinkage(programIds: string | null | undefined): boolean {
  if (!programIds) return true;
  try {
    const parsed = JSON.parse(programIds);
    return !Array.isArray(parsed) || parsed.length === 0;
  } catch {
    return true;
  }
}

/** An active tender whose closing_at passed more than closeAfterDays ago transitions to 'closed'. */
export function shouldTransitionToClosed(
  row: TenderLifecycleRow,
  now: Date,
  closeAfterDays: number = DEFAULT_CLOSE_AFTER_DAYS
): boolean {
  if (row.status !== 'active' || !row.closingAt) return false;
  const closingTime = new Date(row.closingAt).getTime();
  if (Number.isNaN(closingTime)) return false;
  return closingTime < now.getTime() - closeAfterDays * DAY_MS;
}

/** A closed tender past the retention window, with no program linkage and no curator override, is hard-deleted. */
export function shouldHardDelete(
  row: TenderLifecycleRow,
  now: Date,
  hasOverride: boolean,
  deleteAfterDays: number = DEFAULT_DELETE_AFTER_DAYS
): boolean {
  if (row.status !== 'closed' || hasOverride) return false;
  if (!hasNoProgramLinkage(row.programIds)) return false;
  const lastSeenTime = new Date(row.lastSeenAt).getTime();
  if (Number.isNaN(lastSeenTime)) return false;
  return lastSeenTime < now.getTime() - deleteAfterDays * DAY_MS;
}

/** Pure fixture-testable projection of the two lifecycle rules above over a batch of rows. */
export function computeTenderLifecycleTransitions(
  rows: TenderLifecycleRow[],
  now: Date,
  overrideIds: Set<string> = new Set()
): { toClose: string[]; toDelete: string[] } {
  const toClose: string[] = [];
  const toDelete: string[] = [];
  for (const row of rows) {
    if (shouldTransitionToClosed(row, now)) {
      toClose.push(row.id);
      continue;
    }
    if (shouldHardDelete(row, now, overrideIds.has(row.id))) {
      toDelete.push(row.id);
    }
  }
  return { toClose, toDelete };
}

export interface TenderPruneResult {
  closeOk: boolean;
  deleteOk: boolean;
  failed: number;
}

export async function pruneStaleTenders(
  config: D1RestConfig | null,
  deps: { fetchFn?: typeof fetch; now?: () => Date } = {}
): Promise<TenderPruneResult> {
  if (!config) return { closeOk: false, deleteOk: false, failed: 0 };

  const fetchFn = deps.fetchFn ?? globalThis.fetch;
  const now = (deps.now ?? (() => new Date()))();
  const closeCutoff = computeCutoffIso(now, DEFAULT_CLOSE_AFTER_DAYS);
  const deleteCutoff = computeCutoffIso(now, DEFAULT_DELETE_AFTER_DAYS);

  let closeOk = false;
  let deleteOk = false;
  let failed = 0;

  try {
    const result = await executeD1Query(buildCloseStaleTendersStatement(closeCutoff), config, fetchFn);
    closeOk = result.ok;
    if (!result.ok) {
      failed++;
      console.error(`[TENDER PRUNER] close-stale sweep failed: HTTP ${result.status}`);
    }
  } catch (err) {
    failed++;
    console.error('[TENDER PRUNER] close-stale sweep error:', err);
  }

  try {
    const result = await executeD1Query(buildDeleteStaleClosedTendersStatement(deleteCutoff), config, fetchFn);
    deleteOk = result.ok;
    if (!result.ok) {
      failed++;
      console.error(`[TENDER PRUNER] delete-stale sweep failed: HTTP ${result.status}`);
    }
  } catch (err) {
    failed++;
    console.error('[TENDER PRUNER] delete-stale sweep error:', err);
  }

  return { closeOk, deleteOk, failed };
}
