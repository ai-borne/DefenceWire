/**
 * Header Component for DefenceWire.in
 * Displays institutional branding, compact live IST clock, expandable search, sync trigger, and theme toggle.
 * Hard limit: <= 300 LOC.
 */

import { STRINGS } from '../resources/strings.js';
import { sanitizePlainText } from '../utils/security.js';
import { formatLiveIST } from '../utils/dateUtils.js';
import { ThemeViewModel } from '../viewmodels/ThemeViewModel.js';
import { NewsViewModel } from '../viewmodels/NewsViewModel.js';
import { EditorViewModel } from '../viewmodels/EditorViewModel.js';
import { FeedSyncService, defaultFeedSyncService } from '../services/feedSyncService.js';

export function renderHeader(
  themeVm: ThemeViewModel,
  newsVm: NewsViewModel,
  editorVm?: EditorViewModel,
  feedSyncService: FeedSyncService = defaultFeedSyncService
): HTMLElement {
  const header = document.createElement('header');
  header.className = 'dw-header';

  const inner = document.createElement('div');
  inner.className = 'dw-header-inner';

  // 1. Brand & Live Clock Section
  const brandRow = document.createElement('div');
  brandRow.className = 'dw-brand-row';

  const brandLink = document.createElement('a');
  brandLink.className = 'dw-brand-title';
  brandLink.href = '#';
  brandLink.setAttribute('aria-label', STRINGS.app.name);
  brandLink.onclick = (e) => {
    e.preventDefault();
    newsVm.setActiveCategory('all');
    newsVm.setSearchQuery('');
  };

  const nameParts = STRINGS.app.name.split('.');
  const prefix = nameParts[0] || 'DefenceWire';
  const suffix = nameParts[1] ? `.${nameParts[1]}` : '';

  const accentSpan = document.createElement('span');
  accentSpan.className = 'dw-brand-accent';
  accentSpan.textContent = prefix.substring(0, 7); // "Defence"
  const restBrandSpan = document.createElement('span');
  restBrandSpan.textContent = prefix.substring(7) + suffix; // "Wire.in"
  brandLink.appendChild(accentSpan);
  brandLink.appendChild(restBrandSpan);

  // Compact Live IST Clock (with pulsing green dot)
  const clockContainer = document.createElement('div');
  clockContainer.className = 'dw-live-clock';
  clockContainer.setAttribute('aria-label', STRINGS.app.liveUpdateLabel);

  const dot = document.createElement('span');
  dot.className = 'dw-live-dot';
  dot.setAttribute('aria-hidden', 'true');

  const timeText = document.createElement('span');
  timeText.id = 'dw-header-ist-clock';
  timeText.className = 'dw-clock-text';
  timeText.textContent = formatLiveIST();

  clockContainer.appendChild(dot);
  clockContainer.appendChild(timeText);

  // Institutional Badge with stealth 5-click curator trigger
  const badge = document.createElement('span');
  badge.className = 'dw-inst-badge';
  badge.textContent = sanitizePlainText(STRINGS.app.institutionalBadge);

  if (editorVm) {
    let clickCount = 0;
    let lastClickTime = 0;
    const handleCuratorTrigger = () => {
      const now = Date.now();
      clickCount = now - lastClickTime < 2500 ? clickCount + 1 : 1;
      lastClickTime = now;
      if (clickCount >= 5) {
        clickCount = 0;
        editorVm.toggleOpen();
      }
    };
    badge.addEventListener('click', handleCuratorTrigger);
    brandLink.addEventListener('click', (e) => {
      if (e.detail >= 5) handleCuratorTrigger();
    });
  }

  brandRow.appendChild(brandLink);
  brandRow.appendChild(clockContainer);
  brandRow.appendChild(badge);

  // 2. Action Controls Group
  const controls = document.createElement('div');
  controls.className = 'dw-header-controls';

  // Mobile Search Toggle Button
  const searchToggleBtn = document.createElement('button');
  searchToggleBtn.className = 'dw-search-toggle-btn';
  searchToggleBtn.type = 'button';
  searchToggleBtn.setAttribute('aria-label', STRINGS.search.toggleSearchAria);
  searchToggleBtn.title = STRINGS.search.expandSearchTooltip;
  searchToggleBtn.innerHTML = '<span class="dw-search-icon" aria-hidden="true">🔍</span>';

  // Search Box Container (Desktop inline, Mobile expandable overlay)
  const searchBox = document.createElement('div');
  searchBox.className = 'dw-search-box';

  const searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.className = 'dw-search-input';
  searchInput.placeholder = STRINGS.search.placeholder;
  searchInput.setAttribute('aria-label', STRINGS.search.ariaLabel);
  searchInput.value = newsVm.getSearchQuery();

  searchInput.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    newsVm.setSearchQuery(target.value);
    searchToggleBtn.classList.toggle('has-query', Boolean(target.value.trim()));
  });

  const searchCloseBtn = document.createElement('button');
  searchCloseBtn.className = 'dw-search-close-btn';
  searchCloseBtn.type = 'button';
  searchCloseBtn.setAttribute('aria-label', STRINGS.search.closeSearchAria);
  searchCloseBtn.title = STRINGS.search.closeSearchAria;
  searchCloseBtn.textContent = '✕';

  const openSearch = () => {
    header.classList.add('is-search-expanded');
    searchBox.classList.add('is-open');
    searchInput.focus();
  };

  const closeSearch = () => {
    header.classList.remove('is-search-expanded');
    searchBox.classList.remove('is-open');
    searchToggleBtn.focus();
  };

  searchToggleBtn.addEventListener('click', () => {
    if (searchBox.classList.contains('is-open')) closeSearch();
    else openSearch();
  });
  searchCloseBtn.addEventListener('click', closeSearch);
  searchInput.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape') closeSearch();
  });

  searchBox.appendChild(searchInput);
  searchBox.appendChild(searchCloseBtn);

  // Live Feed Sync Button & Status Indicator
  const syncBtn = document.createElement('button');
  syncBtn.className = 'dw-sync-btn';
  syncBtn.type = 'button';
  syncBtn.setAttribute('aria-label', STRINGS.sync.ariaSyncNow);
  syncBtn.title = STRINGS.sync.idleTooltip;

  const syncIcon = document.createElement('span');
  syncIcon.className = 'dw-sync-icon';
  syncIcon.setAttribute('aria-hidden', 'true');
  syncIcon.textContent = '↻';

  const syncLabel = document.createElement('span');
  syncLabel.className = 'dw-sync-label';
  syncLabel.textContent = STRINGS.sync.buttonLabel;

  syncBtn.appendChild(syncIcon);
  syncBtn.appendChild(syncLabel);

  let resetTimer: ReturnType<typeof setTimeout> | null = null;
  const setSyncState = (cls: string, label: string, tip: string, disabled = false, timeout = 0) => {
    if (resetTimer) {
      clearTimeout(resetTimer);
      resetTimer = null;
    }
    syncBtn.classList.remove('is-syncing', 'is-updated', 'is-error');
    if (cls) syncBtn.classList.add(cls);
    syncBtn.disabled = disabled;
    syncBtn.title = tip;
    syncLabel.textContent = label;
    if (timeout > 0) {
      resetTimer = setTimeout(() => {
        setSyncState('', STRINGS.sync.buttonLabel, STRINGS.sync.idleTooltip, false);
      }, timeout);
    }
  };

  feedSyncService.onSyncStateChange((status) => {
    switch (status) {
      case 'checking':
        setSyncState('is-syncing', STRINGS.sync.checkingLabel, STRINGS.sync.checkingTooltip, true);
        break;
      case 'syncing':
        setSyncState('is-syncing', STRINGS.sync.syncingLabel, STRINGS.sync.syncingTooltip, true);
        break;
      case 'updated':
        setSyncState('is-updated', STRINGS.sync.updatedLabel, STRINGS.sync.updatedTooltip, false, 2500);
        break;
      case 'error':
        setSyncState('is-error', STRINGS.sync.errorLabel, STRINGS.sync.errorTooltip, false, 4000);
        break;
      case 'idle':
      default:
        setSyncState('', STRINGS.sync.buttonLabel, STRINGS.sync.idleTooltip, false);
        break;
    }
  });

  syncBtn.addEventListener('click', () => {
    void feedSyncService.syncNow(true);
  });

  // Theme Toggle Button
  const themeBtn = document.createElement('button');
  themeBtn.className = 'dw-theme-btn';
  themeBtn.type = 'button';
  themeBtn.setAttribute('aria-label', STRINGS.theme.toggleThemeAria);

  const themeIcon = document.createElement('span');
  themeIcon.className = 'dw-theme-icon';
  themeIcon.setAttribute('aria-hidden', 'true');

  const themeLabel = document.createElement('span');
  themeLabel.className = 'dw-theme-label';

  themeBtn.appendChild(themeIcon);
  themeBtn.appendChild(themeLabel);

  const updateThemeButtonText = () => {
    const current = themeVm.getTheme();
    const isLight = current === 'light';
    const isDark = current === 'dark';
    themeIcon.textContent = isLight ? STRINGS.theme.iconLight : isDark ? STRINGS.theme.iconDark : STRINGS.theme.iconSystem;
    const modeName = isLight ? STRINGS.theme.light : isDark ? STRINGS.theme.dark : STRINGS.theme.system;
    themeLabel.textContent = ` ${modeName}`;
    themeBtn.title = `${STRINGS.theme.toggleThemeAria} (${modeName})`;
  };

  updateThemeButtonText();
  themeVm.subscribe(updateThemeButtonText);
  themeBtn.addEventListener('click', () => themeVm.toggleTheme());

  controls.appendChild(searchToggleBtn);
  controls.appendChild(searchBox);
  controls.appendChild(syncBtn);
  controls.appendChild(themeBtn);

  inner.appendChild(brandRow);
  inner.appendChild(controls);
  header.appendChild(inner);

  // Update clock every second safely
  if (typeof window !== 'undefined') {
    const timerId = window.setInterval(() => {
      const clockEl = header.querySelector('#dw-header-ist-clock');
      if (clockEl) clockEl.textContent = formatLiveIST();
      else window.clearInterval(timerId);
    }, 1000);
  }

  return header;
}
