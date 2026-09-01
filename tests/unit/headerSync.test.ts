/**
 * Unit Tests for Header Component Sync Trigger & Status Indicator (Phase 3)
 * Tests tactile manual sync trigger, aria accessibility, state transitions, and DOM rendering.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHeader } from '../../src/components/Header.js';
import { ThemeViewModel } from '../../src/viewmodels/ThemeViewModel.js';
import { NewsViewModel } from '../../src/viewmodels/NewsViewModel.js';
import { FeedSyncService, SyncStatus } from '../../src/services/feedSyncService.js';
import { STRINGS } from '../../src/resources/strings.js';

describe('Header Component - Sync Indicator & Manual Trigger', () => {
  let themeVm: ThemeViewModel;
  let newsVm: NewsViewModel;
  let feedSyncService: FeedSyncService;

  beforeEach(() => {
    vi.useFakeTimers();
    themeVm = new ThemeViewModel();
    newsVm = new NewsViewModel();
    feedSyncService = new FeedSyncService({ cooldownMs: 0 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('renders sync trigger button with proper accessible attributes and SSOT strings', () => {
    const header = renderHeader(themeVm, newsVm, undefined, feedSyncService);
    const syncBtn = header.querySelector('.dw-sync-btn') as HTMLButtonElement | null;

    expect(syncBtn).not.toBeNull();
    expect(syncBtn?.getAttribute('type')).toBe('button');
    expect(syncBtn?.getAttribute('aria-label')).toBe(STRINGS.sync.ariaSyncNow);
    expect(syncBtn?.title).toBe(STRINGS.sync.idleTooltip);

    const icon = syncBtn?.querySelector('.dw-sync-icon');
    expect(icon).not.toBeNull();
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
    expect(icon?.textContent).toBe('↻');

    const label = syncBtn?.querySelector('.dw-sync-label');
    expect(label).not.toBeNull();
    expect(label?.textContent).toBe(STRINGS.sync.buttonLabel);
  });

  it('triggers manual sync on button click', async () => {
    const syncNowSpy = vi.spyOn(feedSyncService, 'syncNow').mockResolvedValue(true);

    const header = renderHeader(themeVm, newsVm, undefined, feedSyncService);
    const syncBtn = header.querySelector('.dw-sync-btn') as HTMLButtonElement;

    syncBtn.click();

    expect(syncNowSpy).toHaveBeenCalledTimes(1);
    expect(syncNowSpy).toHaveBeenCalledWith(true);
  });

  it('updates button state to syncing/checking with spinner and disables button', () => {
    const header = renderHeader(themeVm, newsVm, undefined, feedSyncService);
    const syncBtn = header.querySelector('.dw-sync-btn') as HTMLButtonElement;
    const syncLabel = header.querySelector('.dw-sync-label') as HTMLSpanElement;

    // Simulate state change to checking
    // @ts-expect-error accessing private method for test trigger
    feedSyncService.setStatus('checking' as SyncStatus);

    expect(syncBtn.classList.contains('is-syncing')).toBe(true);
    expect(syncBtn.disabled).toBe(true);
    expect(syncLabel.textContent).toBe(STRINGS.sync.checkingLabel);
    expect(syncBtn.title).toBe(STRINGS.sync.checkingTooltip);

    // Simulate state change to syncing
    // @ts-expect-error accessing private method for test trigger
    feedSyncService.setStatus('syncing' as SyncStatus);

    expect(syncBtn.classList.contains('is-syncing')).toBe(true);
    expect(syncBtn.disabled).toBe(true);
    expect(syncLabel.textContent).toBe(STRINGS.sync.syncingLabel);
    expect(syncBtn.title).toBe(STRINGS.sync.syncingTooltip);
  });

  it('updates button state to updated, re-enables button, and resets to idle after timeout', () => {
    const header = renderHeader(themeVm, newsVm, undefined, feedSyncService);
    const syncBtn = header.querySelector('.dw-sync-btn') as HTMLButtonElement;
    const syncLabel = header.querySelector('.dw-sync-label') as HTMLSpanElement;

    // @ts-expect-error accessing private method for test trigger
    feedSyncService.setStatus('updated' as SyncStatus);

    expect(syncBtn.classList.contains('is-syncing')).toBe(false);
    expect(syncBtn.classList.contains('is-updated')).toBe(true);
    expect(syncBtn.disabled).toBe(false);
    expect(syncLabel.textContent).toBe(STRINGS.sync.updatedLabel);
    expect(syncBtn.title).toBe(STRINGS.sync.updatedTooltip);

    // Fast-forward timeout to verify reset to idle
    vi.advanceTimersByTime(3000);

    expect(syncBtn.classList.contains('is-updated')).toBe(false);
    expect(syncLabel.textContent).toBe(STRINGS.sync.buttonLabel);
    expect(syncBtn.title).toBe(STRINGS.sync.idleTooltip);
  });

  it('updates button state to error, displays error tooltip, and resets after timeout', () => {
    const header = renderHeader(themeVm, newsVm, undefined, feedSyncService);
    const syncBtn = header.querySelector('.dw-sync-btn') as HTMLButtonElement;
    const syncLabel = header.querySelector('.dw-sync-label') as HTMLSpanElement;

    // @ts-expect-error accessing private method for test trigger
    feedSyncService.setStatus('error' as SyncStatus, 'Network Error');

    expect(syncBtn.classList.contains('is-syncing')).toBe(false);
    expect(syncBtn.classList.contains('is-error')).toBe(true);
    expect(syncBtn.disabled).toBe(false);
    expect(syncLabel.textContent).toBe(STRINGS.sync.errorLabel);
    expect(syncBtn.title).toBe(STRINGS.sync.errorTooltip);

    // Fast-forward timeout to verify reset to idle
    vi.advanceTimersByTime(4500);

    expect(syncBtn.classList.contains('is-error')).toBe(false);
    expect(syncLabel.textContent).toBe(STRINGS.sync.buttonLabel);
    expect(syncBtn.title).toBe(STRINGS.sync.idleTooltip);
  });

  it('positions sync button inside controls container alongside live clock', () => {
    const header = renderHeader(themeVm, newsVm, undefined, feedSyncService);
    const controls = header.querySelector('.dw-header-controls');
    const clock = controls?.querySelector('.dw-live-clock');
    const syncBtn = controls?.querySelector('.dw-sync-btn');
    const searchBox = controls?.querySelector('.dw-search-box');
    const themeBtn = controls?.querySelector('.dw-theme-btn');

    expect(controls).not.toBeNull();
    expect(clock).not.toBeNull();
    expect(syncBtn).not.toBeNull();
    expect(searchBox).not.toBeNull();
    expect(themeBtn).not.toBeNull();

    // Verify ordering: clock -> syncBtn -> searchBox -> themeBtn
    const children = Array.from(controls?.children || []);
    expect(children.indexOf(clock!)).toBe(0);
    expect(children.indexOf(syncBtn!)).toBe(1);
    expect(children.indexOf(searchBox!)).toBe(2);
    expect(children.indexOf(themeBtn!)).toBe(3);
  });
});
