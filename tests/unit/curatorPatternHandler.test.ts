/**
 * Unit Tests for Curator Pattern Handler (Phase 5)
 * Tests pattern listing, approval promotion, rejection, editing,
 * authentication gating, and SQL parameterization.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  handleListPatterns,
  handleReviewPattern
} from '../../src/services/curatorPatternHandler.js';
import { EmergentPatternRow } from '../../src/types/patterns.js';

function createMockPatternRow(overrides: Partial<EmergentPatternRow> = {}): EmergentPatternRow {
  return {
    id: 'pat_delhi_air_defence',
    title: 'NCR Air Defence & Counter-UAS Convergence',
    synthesis:
      'Multi-axis activity observed across Delhi involving L-70 guns and Red Fort perimeter security within a 72-hour operational window. Signals point to activation of a layered counter-drone security grid ahead of National Day celebrations.',
    confidence: 0.85,
    node_ids_json: JSON.stringify(['node_delhi', 'node_l-70-guns', 'node_red-fort']),
    cluster_ids_json: JSON.stringify(['c-1', 'c-2', 'c-3']),
    status: 'draft',
    created_at: '2026-09-02T12:00:00Z',
    reviewed_at: null,
    reviewed_by: null,
    ...overrides
  };
}

describe('Curator Pattern Handler', () => {
  describe('handleListPatterns', () => {
    it('returns 401 when unauthenticated', async () => {
      const mockDb = { runQuery: vi.fn() };
      const res = await handleListPatterns(mockDb, {}, null, 'secret', false);

      expect(res.success).toBe(false);
      expect(res.error).toContain('Unauthorized');
      expect(mockDb.runQuery).not.toHaveBeenCalled();
    });

    it('lists pattern candidates filtered by status when authorized', async () => {
      const row = createMockPatternRow();
      const mockDb = {
        runQuery: vi.fn().mockResolvedValue([row])
      };

      const res = await handleListPatterns(
        mockDb,
        { status: 'draft', limit: 20 },
        null,
        'secret',
        true
      );

      expect(res.success).toBe(true);
      expect(res.data?.length).toBe(1);
      const pattern = res.data?.[0];
      expect(pattern?.id).toBe('pat_delhi_air_defence');
      expect(pattern?.status).toBe('draft');
      expect(pattern?.nodeIds).toEqual(['node_delhi', 'node_l-70-guns', 'node_red-fort']);
      expect(mockDb.runQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE status = ?'),
        ['draft', 20, 0]
      );
    });

    it('handles database exceptions gracefully', async () => {
      const mockDb = {
        runQuery: vi.fn().mockRejectedValue(new Error('D1 connection timeout'))
      };

      const res = await handleListPatterns(mockDb, {}, null, 'secret', true);
      expect(res.success).toBe(false);
      expect(res.error).toBe('D1 connection timeout');
    });
  });

  describe('handleReviewPattern', () => {
    it('returns 401 when unauthenticated', async () => {
      const mockDb = { runQuery: vi.fn() };
      const res = await handleReviewPattern(
        { id: 'pat_1', action: 'approve' },
        mockDb,
        null,
        'secret',
        false
      );

      expect(res.success).toBe(false);
      expect(res.error).toContain('Unauthorized');
    });

    it('rejects invalid actions with validation error', async () => {
      const mockDb = { runQuery: vi.fn() };
      const res = await handleReviewPattern(
        { id: 'pat_1', action: 'invalid' as any },
        mockDb,
        null,
        'secret',
        true
      );

      expect(res.success).toBe(false);
      expect(res.error).toContain('Invalid request');
    });

    it('returns error when pattern ID does not exist', async () => {
      const mockDb = {
        runQuery: vi.fn().mockResolvedValue([])
      };

      const res = await handleReviewPattern(
        { id: 'pat_nonexistent', action: 'approve' },
        mockDb,
        null,
        'secret',
        true
      );

      expect(res.success).toBe(false);
      expect(res.error).toContain("Pattern candidate 'pat_nonexistent' not found");
    });

    it('successfully approves and promotes pattern candidate to live D1 status', async () => {
      const initialRow = createMockPatternRow({ status: 'draft' });
      const approvedRow = createMockPatternRow({
        status: 'approved',
        reviewed_at: '2026-09-03T10:00:00Z',
        reviewed_by: 'lead.analyst@defencewire.in'
      });

      const mockDb = {
        runQuery: vi
          .fn()
          .mockResolvedValueOnce([initialRow]) // check existing
          .mockResolvedValueOnce([approvedRow]), // retrieve updated
        runMutation: vi.fn().mockResolvedValue({ success: true })
      };

      const res = await handleReviewPattern(
        { id: 'pat_delhi_air_defence', action: 'approve' },
        mockDb,
        null,
        'secret',
        true,
        'lead.analyst@defencewire.in'
      );

      expect(res.success).toBe(true);
      expect(res.data?.status).toBe('approved');
      expect(res.data?.reviewedBy).toBe('lead.analyst@defencewire.in');
      expect(mockDb.runMutation).toHaveBeenCalledWith(
        expect.stringContaining("SET reviewed_at = ?, reviewed_by = ?, status = 'approved'"),
        expect.arrayContaining(['lead.analyst@defencewire.in', 'pat_delhi_air_defence'])
      );
    });

    it('successfully rejects a pattern candidate', async () => {
      const initialRow = createMockPatternRow({ status: 'draft' });
      const rejectedRow = createMockPatternRow({
        status: 'rejected',
        reviewed_at: '2026-09-03T10:00:00Z',
        reviewed_by: 'lead.analyst@defencewire.in'
      });

      const mockDb = {
        runQuery: vi
          .fn()
          .mockResolvedValueOnce([initialRow])
          .mockResolvedValueOnce([rejectedRow]),
        runMutation: vi.fn().mockResolvedValue({ success: true })
      };

      const res = await handleReviewPattern(
        { id: 'pat_delhi_air_defence', action: 'reject' },
        mockDb,
        null,
        'secret',
        true,
        'lead.analyst@defencewire.in'
      );

      expect(res.success).toBe(true);
      expect(res.data?.status).toBe('rejected');
    });

    it('updates title and edited situational hypothesis synthesis', async () => {
      const initialRow = createMockPatternRow({ status: 'draft' });
      const updatedRow = createMockPatternRow({
        title: 'Custom Curated Title',
        synthesis: 'Curator customized hypothesis assessment.',
        status: 'draft',
        reviewed_at: '2026-09-03T10:00:00Z',
        reviewed_by: 'lead.analyst@defencewire.in'
      });

      const mockDb = {
        runQuery: vi
          .fn()
          .mockResolvedValueOnce([initialRow])
          .mockResolvedValueOnce([updatedRow]),
        runMutation: vi.fn().mockResolvedValue({ success: true })
      };

      const res = await handleReviewPattern(
        {
          id: 'pat_delhi_air_defence',
          action: 'edit',
          title: 'Custom Curated Title',
          synthesis: 'Curator customized hypothesis assessment.'
        },
        mockDb,
        null,
        'secret',
        true,
        'lead.analyst@defencewire.in'
      );

      expect(res.success).toBe(true);
      expect(res.data?.title).toBe('Custom Curated Title');
      expect(res.data?.synthesis).toBe('Curator customized hypothesis assessment.');
    });
  });
});
