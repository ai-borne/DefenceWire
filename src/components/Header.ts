/**
 * Header Component for DefenceWire.in
 * Displays institutional branding, live IST clock, search bar, and theme toggle.
 * Hard limit: <= 300 LOC.
 */

import { STRINGS } from '../resources/strings.js';
import { sanitizePlainText } from '../utils/security.js';
import { formatLiveIST } from '../utils/dateUtils.js';
import { ThemeViewModel } from '../viewmodels/ThemeViewModel.js';
import { NewsViewModel } from '../viewmodels/NewsViewModel.js';
import { EditorViewModel } from '../viewmodels/EditorViewModel.js';
import { FeedSyncService, defaultFeedSyncService, SyncStatus } from '../services/feedSyncService.js';

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

  // 1. Brand Row
  const brandRow = document.createElement('div');
  brandRow.className = 'dw-brand-row';

  const brandLink = document.createElement('a');
  brandLink.className = 'dw-brand-title';
  brandLink.href = '#';
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

  const badge = document.createElement('span');
  badge.className = 'dw-inst-badge';
  badge.textContent = sanitizePlainText(STRINGS.app.institutionalBadge);

  // Stealth 5-click rapid trigger for authorized human curators
  if (editorVm) {
    let clickCount = 0;
    let lastClickTime = 0;
    badge.addEventListener('click', () => {
      const now = Date.now();
      if (now - lastClickTime < 2500) {
        clickCount++;
      } else {
        clickCount = 1;
      }
      lastClickTime = now;
      if (clickCount >= 5) {
        clickCount = 0;
        editorVm.toggleOpen();
      }
    });
  }

  brandRow.appendChild(brandLink);
  brandRow.appendChild(badge);

  // 2. Controls Row
  const controls = document.createElement('div');
  controls.className = 'dw-header-controls';

  // Live IST Clock
  const clockContainer = document.createElement('div');
  clockContainer.className = 'dw-live-clock';
  clockContainer.setAttribute('aria-label', STRINGS.app.liveUpdateLabel);

  const dot = document.createElement('span');
  dot.className = 'dw-live-dot';

  const timeText = document.createElement('span');
  timeText.id = 'dw-header-ist-clock';
  timeText.textContent = formatLiveIST();

  clockContainer.appendChild(dot);
  clockContainer.appendChild(timeText);

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

  const updateSyncUI = (status: SyncStatus) => {
    if (resetTimer) {
      clearTimeout(resetTimer);
      resetTimer = null;
    }

    syncBtn.classList.remove('is-syncing', 'is-updated', 'is-error');

    switch (status) {
      case 'checking':
        syncBtn.classList.add('is-syncing');
        syncBtn.disabled = true;
        syncBtn.title = STRINGS.sync.checkingTooltip;
        syncLabel.textContent = STRINGS.sync.checkingLabel;
        break;
      case 'syncing':
        syncBtn.classList.add('is-syncing');
        syncBtn.disabled = true;
        syncBtn.title = STRINGS.sync.syncingTooltip;
        syncLabel.textContent = STRINGS.sync.syncingLabel;
        break;
      case 'updated':
        syncBtn.classList.add('is-updated');
        syncBtn.disabled = false;
        syncBtn.title = STRINGS.sync.updatedTooltip;
        syncLabel.textContent = STRINGS.sync.updatedLabel;
        resetTimer = setTimeout(() => {
          syncBtn.classList.remove('is-updated');
          syncBtn.title = STRINGS.sync.idleTooltip;
          syncLabel.textContent = STRINGS.sync.buttonLabel;
        }, 2500);
        break;
      case 'error':
        syncBtn.classList.add('is-error');
        syncBtn.disabled = false;
        syncBtn.title = STRINGS.sync.errorTooltip;
        syncLabel.textContent = STRINGS.sync.errorLabel;
        resetTimer = setTimeout(() => {
          syncBtn.classList.remove('is-error');
          syncBtn.title = STRINGS.sync.idleTooltip;
          syncLabel.textContent = STRINGS.sync.buttonLabel;
        }, 4000);
        break;
      case 'idle':
      default:
        syncBtn.disabled = false;
        syncBtn.title = STRINGS.sync.idleTooltip;
        syncLabel.textContent = STRINGS.sync.buttonLabel;
        break;
    }
  };

  feedSyncService.onSyncStateChange((status) => {
    updateSyncUI(status);
  });

  syncBtn.addEventListener('click', () => {
    void feedSyncService.syncNow(true);
  });

  // Search Box
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
  });

  searchBox.appendChild(searchInput);

  // Theme Toggle Button
  const themeBtn = document.createElement('button');
  themeBtn.className = 'dw-theme-btn';
  themeBtn.type = 'button';
  themeBtn.setAttribute('aria-label', STRINGS.theme.toggleThemeAria);

  const updateThemeButtonText = () => {
    const current = themeVm.getTheme();
    if (current === 'light') {
      themeBtn.textContent = `☀️ ${STRINGS.theme.light}`;
    } else if (current === 'dark') {
      themeBtn.textContent = `🌙 ${STRINGS.theme.dark}`;
    } else {
      themeBtn.textContent = `⚙️ ${STRINGS.theme.system}`;
    }
  };

  updateThemeButtonText();
  themeVm.subscribe(() => {
    updateThemeButtonText();
  });

  themeBtn.addEventListener('click', () => {
    themeVm.toggleTheme();
  });

  controls.appendChild(clockContainer);
  controls.appendChild(syncBtn);
  controls.appendChild(searchBox);
  controls.appendChild(themeBtn);

  inner.appendChild(brandRow);
  inner.appendChild(controls);
  header.appendChild(inner);


  // Update clock every second safely
  if (typeof window !== 'undefined') {
    const timerId = window.setInterval(() => {
      const clockEl = document.getElementById('dw-header-ist-clock');
      if (clockEl) {
        clockEl.textContent = formatLiveIST();
      } else {
        window.clearInterval(timerId);
      }
    }, 1000);
  }

  return header;
}
