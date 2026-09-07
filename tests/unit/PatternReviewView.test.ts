/**
 * Unit Tests for PatternReviewView and PatternCard Component Rendering (Phase 5)
 * Tests DOM rendering, filter switching, action clicks, and empty states.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, vi } from 'vitest';
import { renderPatternReviewView } from '../../src/components/editor/PatternReviewView.js';
import { PatternReviewViewModel } from '../../src/viewmodels/PatternReviewViewModel.js';
import { PATTERN_STRINGS } from '../../src/resources/patternStrings.js';
import { EmergentPattern } from '../../src/types/patterns.js';

function createMockPattern(): EmergentPattern {
  return {
    id: 'pat_delhi_air_defence',
    title: 'NCR Air Defence & Counter-UAS Convergence',
    synthesis: 'Multi-axis drone threats and L-70 gun deployment in Delhi NCR.',
    confidence: 0.88,
    nodeIds: ['node_delhi', 'node_l-70-guns'],
    clusterIds: ['c-1', 'c-2'],
    status: 'draft',
    createdAt: '2026-09-02T12:00:00Z',
    reviewedAt: null,
    reviewedBy: null
  };
}

describe('PatternReviewView Component', () => {
  it('renders heading, refresh button, and 4 filter tabs', () => {
    const vm = {
      getFilter: () => 'draft',
      getErrorMessage: () => null,
      getIsLoading: () => false,
      getPatterns: () => [],
      loadPatterns: vi.fn(),
      setFilter: vi.fn()
    } as unknown as PatternReviewViewModel;

    const el = renderPatternReviewView(vm);

    expect(el.textContent).toContain(PATTERN_STRINGS.heading);
    expect(el.textContent).toContain(PATTERN_STRINGS.refreshBtn);
    expect(el.textContent).toContain(PATTERN_STRINGS.emptyTitle);

    const filterTabs = el.querySelectorAll('.dw-editor-filter-tab');
    expect(filterTabs.length).toBe(4);
  });

  it('renders pattern cards with confidence badge, hypothesis, and action buttons', () => {
    const pattern = createMockPattern();
    const vm = {
      getFilter: () => 'draft',
      getErrorMessage: () => null,
      getIsLoading: () => false,
      getPatterns: () => [pattern],
      getEditingPatternId: () => null,
      approvePattern: vi.fn(),
      rejectPattern: vi.fn(),
      startEditing: vi.fn(),
      loadPatterns: vi.fn(),
      setFilter: vi.fn()
    } as unknown as PatternReviewViewModel;

    const el = renderPatternReviewView(vm);

    expect(el.textContent).toContain(pattern.title);
    expect(el.textContent).toContain('88% Confidence');
    expect(el.textContent).toContain(pattern.synthesis);
    expect(el.textContent).toContain(PATTERN_STRINGS.btnApprove);
    expect(el.textContent).toContain(PATTERN_STRINGS.btnEdit);
    expect(el.textContent).toContain(PATTERN_STRINGS.btnReject);
  });

  it('triggers approve, edit, and reject when action buttons are clicked', () => {
    const pattern = createMockPattern();
    const approveFn = vi.fn();
    const rejectFn = vi.fn();
    const editFn = vi.fn();

    const vm = {
      getFilter: () => 'draft',
      getErrorMessage: () => null,
      getIsLoading: () => false,
      getPatterns: () => [pattern],
      getEditingPatternId: () => null,
      approvePattern: approveFn,
      rejectPattern: rejectFn,
      startEditing: editFn,
      loadPatterns: vi.fn(),
      setFilter: vi.fn()
    } as unknown as PatternReviewViewModel;

    const el = renderPatternReviewView(vm);
    const cardButtons = Array.from(el.querySelectorAll('.dw-editor-card button')) as HTMLButtonElement[];

    const approveBtn = cardButtons.find((b) => b.textContent?.includes(PATTERN_STRINGS.btnApprove));
    approveBtn?.click();
    expect(approveFn).toHaveBeenCalledWith(pattern.id);

    const editBtn = cardButtons.find((b) => b.textContent?.includes(PATTERN_STRINGS.btnEdit));
    editBtn?.click();
    expect(editFn).toHaveBeenCalledWith(pattern);

    const rejectBtn = cardButtons.find((b) => b.textContent?.includes(PATTERN_STRINGS.btnReject));
    rejectBtn?.click();
    expect(rejectFn).toHaveBeenCalledWith(pattern.id);
  });

  it('renders editing controls when currently editing this pattern', () => {
    const pattern = createMockPattern();
    const saveEditFn = vi.fn();
    const cancelEditFn = vi.fn();

    const vm = {
      getFilter: () => 'draft',
      getErrorMessage: () => null,
      getIsLoading: () => false,
      getPatterns: () => [pattern],
      getEditingPatternId: () => pattern.id,
      getEditTitle: () => 'Existing Title',
      getEditSynthesis: () => 'Existing Synthesis',
      setEditTitle: vi.fn(),
      setEditSynthesis: vi.fn(),
      saveEdit: saveEditFn,
      cancelEditing: cancelEditFn,
      loadPatterns: vi.fn(),
      setFilter: vi.fn()
    } as unknown as PatternReviewViewModel;

    const el = renderPatternReviewView(vm);

    expect(el.querySelector('input.dw-editor-input')).not.toBeNull();
    expect(el.querySelector('textarea.dw-editor-textarea')).not.toBeNull();
    expect(el.textContent).toContain(PATTERN_STRINGS.btnSave);
    expect(el.textContent).toContain(PATTERN_STRINGS.btnCancel);

    const buttons = Array.from(el.querySelectorAll('button')) as HTMLButtonElement[];
    const saveBtn = buttons.find((b) => b.textContent?.includes(PATTERN_STRINGS.btnSave));
    saveBtn?.click();
    expect(saveEditFn).toHaveBeenCalledWith(pattern.id);
  });
});
