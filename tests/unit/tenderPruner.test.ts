/**
 * Unit Tests for Tender Lifecycle Pruner (MOAT3 Phase 2)
 * Status-transition logic (active -> closed -> hard-delete) against fixture
 * dates, plus the D1 orchestration wrapper against a mocked fetch.
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it, vi } from 'vitest';
import {
  computeCutoffIso,
  computeTenderLifecycleTransitions,
  DEFAULT_CLOSE_AFTER_DAYS,
  DEFAULT_DELETE_AFTER_DAYS,
  hasNoProgramLinkage,
  pruneStaleTenders,
  shouldHardDelete,
  shouldTransitionToClosed,
  TenderLifecycleRow
} from '../../crawler/tenderPruner.js';
import { D1RestConfig } from '../../crawler/archiveSync.js';

const NOW = new Date('2026-09-02T00:00:00Z');

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

describe('Tender Lifecycle Pruner', () => {
  describe('computeCutoffIso', () => {
    it('computes an ISO cutoff N days before now', () => {
      expect(computeCutoffIso(NOW, 30)).toBe(new Date(NOW.getTime() - 30 * 86400000).toISOString());
    });
  });

  describe('hasNoProgramLinkage', () => {
    it('treats null/empty/unparseable as no linkage', () => {
      expect(hasNoProgramLinkage(null)).toBe(true);
      expect(hasNoProgramLinkage('[]')).toBe(true);
      expect(hasNoProgramLinkage('not json')).toBe(true);
    });

    it('treats a non-empty JSON array as linked', () => {
      expect(hasNoProgramLinkage('["p75i"]')).toBe(false);
    });
  });

  describe('shouldTransitionToClosed', () => {
    it('closes an active tender whose closing_at passed more than 30 days ago', () => {
      const row: TenderLifecycleRow = { id: 't1', status: 'active', closingAt: daysAgo(31), lastSeenAt: daysAgo(31), programIds: null };
      expect(shouldTransitionToClosed(row, NOW)).toBe(true);
    });

    it('does not close an active tender still within the grace window', () => {
      const row: TenderLifecycleRow = { id: 't2', status: 'active', closingAt: daysAgo(10), lastSeenAt: daysAgo(10), programIds: null };
      expect(shouldTransitionToClosed(row, NOW)).toBe(false);
    });

    it('does not re-close an already-closed tender', () => {
      const row: TenderLifecycleRow = { id: 't3', status: 'closed', closingAt: daysAgo(100), lastSeenAt: daysAgo(100), programIds: null };
      expect(shouldTransitionToClosed(row, NOW)).toBe(false);
    });
  });

  describe('shouldHardDelete', () => {
    it('deletes a closed tender past the retention window with no linkage and no override', () => {
      const row: TenderLifecycleRow = { id: 't4', status: 'closed', closingAt: daysAgo(200), lastSeenAt: daysAgo(200), programIds: null };
      expect(shouldHardDelete(row, NOW, false)).toBe(true);
    });

    it('keeps a closed tender within the retention window', () => {
      const row: TenderLifecycleRow = { id: 't5', status: 'closed', closingAt: daysAgo(50), lastSeenAt: daysAgo(50), programIds: null };
      expect(shouldHardDelete(row, NOW, false)).toBe(false);
    });

    it('keeps a closed tender that has program linkage even past retention', () => {
      const row: TenderLifecycleRow = { id: 't6', status: 'closed', closingAt: daysAgo(200), lastSeenAt: daysAgo(200), programIds: '["p75i"]' };
      expect(shouldHardDelete(row, NOW, false)).toBe(false);
    });

    it('keeps a closed tender with a curator override even past retention', () => {
      const row: TenderLifecycleRow = { id: 't7', status: 'closed', closingAt: daysAgo(200), lastSeenAt: daysAgo(200), programIds: null };
      expect(shouldHardDelete(row, NOW, true)).toBe(false);
    });
  });

  describe('computeTenderLifecycleTransitions', () => {
    it('sorts a batch of fixture rows into close/delete buckets, respecting overrides', () => {
      const rows: TenderLifecycleRow[] = [
        { id: 'active-recent', status: 'active', closingAt: daysAgo(5), lastSeenAt: daysAgo(5), programIds: null },
        { id: 'active-stale', status: 'active', closingAt: daysAgo(45), lastSeenAt: daysAgo(45), programIds: null },
        { id: 'closed-fresh', status: 'closed', closingAt: daysAgo(60), lastSeenAt: daysAgo(60), programIds: null },
        { id: 'closed-stale-unlinked', status: 'closed', closingAt: daysAgo(200), lastSeenAt: daysAgo(200), programIds: null },
        { id: 'closed-stale-linked', status: 'closed', closingAt: daysAgo(200), lastSeenAt: daysAgo(200), programIds: '["p75i"]' },
        { id: 'closed-stale-overridden', status: 'closed', closingAt: daysAgo(200), lastSeenAt: daysAgo(200), programIds: null }
      ];
      const overrideIds = new Set(['closed-stale-overridden']);

      const { toClose, toDelete } = computeTenderLifecycleTransitions(rows, NOW, overrideIds);

      expect(toClose).toEqual(['active-stale']);
      expect(toDelete).toEqual(['closed-stale-unlinked']);
    });

    it('exposes the documented retention windows', () => {
      expect(DEFAULT_CLOSE_AFTER_DAYS).toBe(30);
      expect(DEFAULT_DELETE_AFTER_DAYS).toBe(180);
    });
  });

  describe('pruneStaleTenders (D1 orchestration)', () => {
    const config: D1RestConfig = { accountId: 'acc', databaseId: 'db', apiToken: 'tok' };

    it('no-ops when D1 is not configured', async () => {
      const fetchFn = vi.fn();
      const result = await pruneStaleTenders(null, { fetchFn: fetchFn as unknown as typeof fetch });
      expect(result).toEqual({ closeOk: false, deleteOk: false, failed: 0 });
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it('runs the close-stale and delete-stale sweeps and reports success', async () => {
      const fetchFn = vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => '{}' });
      const result = await pruneStaleTenders(config, { fetchFn: fetchFn as unknown as typeof fetch, now: () => NOW });
      expect(result).toEqual({ closeOk: true, deleteOk: true, failed: 0 });
      expect(fetchFn).toHaveBeenCalledTimes(2);
    });

    it('reports failures without throwing when D1 returns an error', async () => {
      const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 500, text: async () => 'error' });
      const result = await pruneStaleTenders(config, { fetchFn: fetchFn as unknown as typeof fetch, now: () => NOW });
      expect(result).toEqual({ closeOk: false, deleteOk: false, failed: 2 });
    });
  });
});
