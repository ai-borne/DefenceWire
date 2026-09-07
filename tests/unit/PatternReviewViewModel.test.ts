/**
 * Unit Tests for PatternReviewViewModel (Phase 5)
 * Tests reactive ViewModel state transitions, filtering, and curator action handling.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, vi } from 'vitest';
import { PatternReviewViewModel } from '../../src/viewmodels/PatternReviewViewModel.js';
import { CuratorPatternService } from '../../src/services/curatorPatternService.js';
import { EmergentPattern } from '../../src/types/patterns.js';

function createMockPattern(id: string, status: 'draft' | 'approved' | 'rejected' = 'draft'): EmergentPattern {
  return {
    id,
    title: `Pattern ${id}`,
    synthesis: 'Observed movement signals cross-track readiness.',
    confidence: 0.85,
    nodeIds: ['node_1', 'node_2'],
    clusterIds: ['c-1', 'c-2'],
    status,
    createdAt: '2026-09-02T12:00:00Z',
    reviewedAt: null,
    reviewedBy: null
  };
}

describe('PatternReviewViewModel', () => {
  it('initializes with default draft filter and empty pattern list', () => {
    const mockService = {} as CuratorPatternService;
    const vm = new PatternReviewViewModel(mockService);

    expect(vm.getFilter()).toBe('draft');
    expect(vm.getPatterns()).toHaveLength(0);
    expect(vm.getIsLoading()).toBe(false);
    expect(vm.getErrorMessage()).toBeNull();
  });

  it('loads patterns successfully and notifies subscribers', async () => {
    const mockPatterns = [createMockPattern('pat-1'), createMockPattern('pat-2')];
    const mockService = {
      listPatterns: vi.fn().mockResolvedValue({ success: true, patterns: mockPatterns, total: 2 })
    } as unknown as CuratorPatternService;

    const vm = new PatternReviewViewModel(mockService);
    const listener = vi.fn();
    vm.subscribe(listener);

    await vm.loadPatterns();

    expect(vm.getPatterns()).toHaveLength(2);
    expect(vm.getIsLoading()).toBe(false);
    expect(listener).toHaveBeenCalled();
  });

  it('handles error response during loadPatterns', async () => {
    const mockService = {
      listPatterns: vi.fn().mockResolvedValue({ success: false, patterns: [], total: 0, error: 'D1 unavailable' })
    } as unknown as CuratorPatternService;

    const vm = new PatternReviewViewModel(mockService);
    await vm.loadPatterns();

    expect(vm.getErrorMessage()).toBe('D1 unavailable');
    expect(vm.getPatterns()).toHaveLength(0);
  });

  it('switches filter and reloads patterns', async () => {
    const mockService = {
      listPatterns: vi.fn().mockResolvedValue({ success: true, patterns: [], total: 0 })
    } as unknown as CuratorPatternService;

    const vm = new PatternReviewViewModel(mockService);
    await vm.setFilter('approved');

    expect(vm.getFilter()).toBe('approved');
    expect(mockService.listPatterns).toHaveBeenCalledWith(expect.objectContaining({ status: 'approved' }));
  });

  it('manages editing state lifecycle and saves updated synthesis', async () => {
    const pattern = createMockPattern('pat-1');
    const updatedPattern = {
      ...pattern,
      title: 'Edited Title',
      synthesis: 'Edited 2-sentence situational hypothesis.'
    };

    const mockService = {
      listPatterns: vi.fn().mockResolvedValue({ success: true, patterns: [pattern], total: 1 }),
      reviewPattern: vi.fn().mockResolvedValue({ success: true, pattern: updatedPattern })
    } as unknown as CuratorPatternService;

    const vm = new PatternReviewViewModel(mockService);
    await vm.loadPatterns();

    vm.startEditing(pattern);
    expect(vm.getEditingPatternId()).toBe('pat-1');
    expect(vm.getEditTitle()).toBe('Pattern pat-1');

    vm.setEditTitle('Edited Title');
    vm.setEditSynthesis('Edited 2-sentence situational hypothesis.');

    const saved = await vm.saveEdit('pat-1');
    expect(saved).toBe(true);
    expect(vm.getEditingPatternId()).toBeNull();
    expect(vm.getPatterns()[0]?.title).toBe('Edited Title');
    expect(mockService.reviewPattern).toHaveBeenCalledWith({
      id: 'pat-1',
      action: 'edit',
      title: 'Edited Title',
      synthesis: 'Edited 2-sentence situational hypothesis.'
    });
  });

  it('approves a pattern and removes it from draft view optimistically', async () => {
    const pattern = createMockPattern('pat-1', 'draft');
    const approved = { ...pattern, status: 'approved' as const };

    const mockService = {
      listPatterns: vi.fn().mockResolvedValue({ success: true, patterns: [pattern], total: 1 }),
      reviewPattern: vi.fn().mockResolvedValue({ success: true, pattern: approved })
    } as unknown as CuratorPatternService;

    const vm = new PatternReviewViewModel(mockService);
    await vm.loadPatterns();
    expect(vm.getPatterns()).toHaveLength(1);

    const success = await vm.approvePattern('pat-1');
    expect(success).toBe(true);
    // Filter is 'draft', so approved item should be excluded from active list
    expect(vm.getPatterns()).toHaveLength(0);
  });
});
