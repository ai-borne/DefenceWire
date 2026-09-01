/**
 * Unit Tests for Header Component (Phase 3 & Mobile Single-Row Streamlining)
 * Tests tactile manual sync trigger, expandable search, live IST clock, theme toggle, and accessibility.
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHeader } from '../../src/components/Header.js';
import { ThemeViewModel } from '../../src/viewmodels/ThemeViewModel.js';
import { NewsViewModel } from '../../src/viewmodels/NewsViewModel.js';
import { EditorViewModel } from '../../src/viewmodels/EditorViewModel.js';
import { FeedSyncService, SyncStatus } from '../../src/services/feedSyncService.js';
import { STRINGS } from '../../src/resources/strings.js';

describe('Header Component - Streamlined Single-Row Controls & Sync', () => {
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

  it('renders branding and compact live IST clock with pulsing green dot', () => {
    const header = renderHeader(themeVm, newsVm, undefined, feedSyncService);
    const brandTitle = header.querySelector('.dw-brand-title') as HTMLAnchorElement | null;
    const clock = header.querySelector('.dw-live-clock');
    const dot = clock?.querySelector('.dw-live-dot');
    const clockText = clock?.querySelector('#dw-header-ist-clock');

    expect(brandTitle).not.toBeNull();
    expect(brandTitle?.textContent).toContain('Defence');
    expect(brandTitle?.textContent).toContain('Wire.in');
    expect(clock).not.toBeNull();
    expect(dot).not.toBeNull();
    expect(clockText?.textContent).toMatch(/\d{2}\s[A-Za-z]{3}\s\d{4},\s\d{2}:\d{2}\sIST/);
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

  it('renders expandable search controls and synchronizes search queries with NewsViewModel', () => {
    const header = renderHeader(themeVm, newsVm, undefined, feedSyncService);
    const toggleBtn = header.querySelector('.dw-search-toggle-btn') as HTMLButtonElement;
    const searchBox = header.querySelector('.dw-search-box') as HTMLDivElement;
    const searchInput = header.querySelector('.dw-search-input') as HTMLInputElement;
    const closeBtn = header.querySelector('.dw-search-close-btn') as HTMLButtonElement;

    expect(toggleBtn).not.toBeNull();
    expect(searchBox).not.toBeNull();
    expect(searchInput).not.toBeNull();
    expect(closeBtn).not.toBeNull();

    // Toggle search open
    toggleBtn.click();
    expect(header.classList.contains('is-search-expanded')).toBe(true);
    expect(searchBox.classList.contains('is-open')).toBe(true);

    // Input query
    searchInput.value = 'Tejas';
    searchInput.dispatchEvent(new Event('input'));
    expect(newsVm.getSearchQuery()).toBe('Tejas');
    expect(toggleBtn.classList.contains('has-query')).toBe(true);

    // Close via close button
    closeBtn.click();
    expect(header.classList.contains('is-search-expanded')).toBe(false);
    expect(searchBox.classList.contains('is-open')).toBe(false);

    // Reopen and close via Escape key
    toggleBtn.click();
    expect(header.classList.contains('is-search-expanded')).toBe(true);
    searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(header.classList.contains('is-search-expanded')).toBe(false);
  });

  it('renders theme toggle button with correct theme icons and cycles mode', () => {
    const header = renderHeader(themeVm, newsVm, undefined, feedSyncService);
    const themeBtn = header.querySelector('.dw-theme-btn') as HTMLButtonElement;
    const themeIcon = themeBtn.querySelector('.dw-theme-icon') as HTMLSpanElement;

    expect(themeBtn).not.toBeNull();
    expect(themeIcon.textContent).toBe(STRINGS.theme.iconSystem);

    // Toggle to Light
    themeBtn.click();
    expect(themeVm.getTheme()).toBe('light');
    expect(themeIcon.textContent).toBe(STRINGS.theme.iconLight);

    // Toggle to Dark
    themeBtn.click();
    expect(themeVm.getTheme()).toBe('dark');
    expect(themeIcon.textContent).toBe(STRINGS.theme.iconDark);
  });

  it('triggers stealth curator desk toggle on rapid 5-click on badge', () => {
    const editorVm = new EditorViewModel(newsVm);
    const toggleSpy = vi.spyOn(editorVm, 'toggleOpen');

    const header = renderHeader(themeVm, newsVm, editorVm, feedSyncService);
    const badge = header.querySelector('.dw-inst-badge') as HTMLSpanElement;

    for (let i = 0; i < 5; i++) {
      badge.click();
    }

    expect(toggleSpy).toHaveBeenCalledTimes(1);
  });
});
