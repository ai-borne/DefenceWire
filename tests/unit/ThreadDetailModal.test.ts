/**
 * Unit Tests for ThreadDetailModal Component (Phase 4)
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { openThreadDetailModal } from '../../src/components/threads/ThreadDetailModal.js';
import * as threadService from '../../src/services/threadService.js';
import { resetModalStack } from '../../src/utils/modalManager.js';
import { StoryThread, StoryThreadEvent } from '../../src/types/threads.js';

const MOCK_THREAD: StoryThread = {
  id: 'pinaka-mbpl-arc',
  title: 'Pinaka Multi-Barrel Rocket Launcher Upgrade Program',
  canonicalEntity: 'Pinaka MBRL',
  category: 'strategic',
  status: 'active',
  eventCount: 1,
  firstEventAt: '2026-02-01T00:00:00Z',
  lastEventAt: '2026-02-01T00:00:00Z',
  summary: 'Guided Pinaka and Area Denial Munition induction into artillery regiments.',
  createdAt: '2026-02-01T00:00:00Z',
  updatedAt: '2026-02-01T00:00:00Z'
};

const MOCK_EVENTS: StoryThreadEvent[] = [
  {
    id: 'evt-pinaka-1',
    threadId: 'pinaka-mbpl-arc',
    clusterId: 'cluster-pinaka-1',
    sequenceCode: 'x1.1.1',
    sequenceIndex: 1,
    headline: 'Indian Army Places Follow-On Order for Guided Pinaka Regiments',
    deltaSummary: 'Contract signed for 6 additional regiments with 75km range capability.',
    primarySourceName: 'MoD Release',
    primarySourceUrl: 'https://mod.gov.in/pinaka-order',
    publishedAt: '2026-02-01T00:00:00Z',
    entities: ['Pinaka', 'DRDO', 'Indian Army'],
    createdAt: '2026-02-01T00:00:00Z'
  }
];

describe('ThreadDetailModal Component', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    resetModalStack();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    resetModalStack();
    vi.restoreAllMocks();
  });

  it('should open modal with backdrop and dialog role', async () => {
    vi.spyOn(threadService, 'fetchThreadDetail').mockResolvedValue({
      thread: MOCK_THREAD,
      events: MOCK_EVENTS
    });

    openThreadDetailModal('pinaka-mbpl-arc');

    const backdrop = document.querySelector('.dw-thread-modal-backdrop');
    expect(backdrop).not.toBeNull();

    const modal = backdrop?.querySelector('.dw-thread-modal');
    expect(modal).not.toBeNull();
    expect(modal?.getAttribute('role')).toBe('dialog');
    expect(modal?.getAttribute('aria-modal')).toBe('true');
  });

  it('should fetch and render thread details and timeline events', async () => {
    const fetchSpy = vi.spyOn(threadService, 'fetchThreadDetail').mockResolvedValue({
      thread: MOCK_THREAD,
      events: MOCK_EVENTS
    });

    openThreadDetailModal('pinaka-mbpl-arc');
    expect(fetchSpy).toHaveBeenCalledWith('pinaka-mbpl-arc');

    // Wait for promise resolution
    await new Promise((resolve) => setTimeout(resolve, 10));

    const title = document.querySelector('.dw-thread-detail-title');
    expect(title?.textContent).toBe(MOCK_THREAD.title);

    const entityBadge = document.querySelector('.dw-thread-entity-badge');
    expect(entityBadge?.textContent).toBe('Pinaka MBRL');

    const timelineCard = document.querySelector('.dw-timeline-card');
    expect(timelineCard).not.toBeNull();
    expect(timelineCard?.getAttribute('data-sequence-code')).toBe('x1.1.1');
  });

  it('should display compiling briefing state when thread has not yet accumulated milestones in D1', async () => {
    vi.spyOn(threadService, 'fetchThreadDetail').mockResolvedValue({
      thread: null,
      events: [],
      error: 'Thread not found in D1 archive'
    });

    openThreadDetailModal('su-57');
    await new Promise((resolve) => setTimeout(resolve, 10));

    const compilingState = document.querySelector('.dw-thread-compiling-state');
    expect(compilingState).not.toBeNull();
    expect(compilingState?.textContent).toContain('Compiling chronological intelligence arc for #Su-57...');
  });

  it('should display network error message when network request fails', async () => {
    vi.spyOn(threadService, 'fetchThreadDetail').mockResolvedValue({
      thread: null,
      events: [],
      error: 'Network error loading thread detail.'
    });

    openThreadDetailModal('su-57');
    await new Promise((resolve) => setTimeout(resolve, 10));

    const snippet = document.querySelector('.dw-snippet');
    expect(snippet?.textContent).toContain('Network error');
  });

  it('should display compiling briefing state in timeline when thread exists but has 0 events', async () => {
    vi.spyOn(threadService, 'fetchThreadDetail').mockResolvedValue({
      thread: {
        ...MOCK_THREAD,
        canonicalEntity: 'Su-57'
      },
      events: []
    });

    openThreadDetailModal('th_su-57');
    await new Promise((resolve) => setTimeout(resolve, 10));

    const compilingState = document.querySelector('.dw-thread-compiling-state');
    expect(compilingState).not.toBeNull();
    expect(compilingState?.textContent).toContain('Compiling chronological intelligence arc for #Su-57...');
  });

  it('should dismiss modal when close button is clicked', async () => {
    vi.spyOn(threadService, 'fetchThreadDetail').mockResolvedValue({
      thread: MOCK_THREAD,
      events: MOCK_EVENTS
    });

    openThreadDetailModal('pinaka-mbpl-arc');

    const closeBtn = document.querySelector<HTMLButtonElement>('.dw-modal-close-btn');
    expect(closeBtn).not.toBeNull();

    closeBtn?.click();

    // Give modalManager 150ms transition timeout
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(document.querySelector('.dw-thread-modal-backdrop')).toBeNull();
  });
});
