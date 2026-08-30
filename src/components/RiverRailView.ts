/**
 * River Rail Component for DefenceWire.in
 * Chronological real-time wire feed rail.
 * Hard limit: <= 300 LOC.
 */

import { STRINGS } from '../resources/strings.js';
import { sanitizePlainText, getSafeLinkAttributes } from '../utils/security.js';
import { formatTimeAgo } from '../utils/dateUtils.js';
import { NewsViewModel } from '../viewmodels/NewsViewModel.js';

export function renderRiverRail(newsVm: NewsViewModel, maxItems: number = 8): HTMLElement {
  const card = document.createElement('aside');
  card.className = 'dw-rail-card';
  card.setAttribute('aria-label', STRINGS.river.heading);

  const header = document.createElement('h3');
  header.className = 'dw-rail-header';
  header.textContent = `⚡ ${STRINGS.river.heading}`;
  card.appendChild(header);

  const items = newsVm.getFilteredRiverItems().slice(0, maxItems);

  if (items.length === 0) {
    const emptyP = document.createElement('p');
    emptyP.className = 'dw-river-meta';
    emptyP.textContent = STRINGS.search.noResults;
    card.appendChild(emptyP);
    return card;
  }

  const listContainer = document.createElement('div');

  for (const item of items) {
    const itemEl = document.createElement('div');
    itemEl.className = 'dw-river-item';

    const link = document.createElement('a');
    const safeAttrs = getSafeLinkAttributes(item.url);
    link.href = safeAttrs.href;
    link.target = safeAttrs.target;
    link.rel = safeAttrs.rel;
    link.textContent = sanitizePlainText(item.title);

    const meta = document.createElement('div');
    meta.className = 'dw-river-meta';
    meta.textContent = `${sanitizePlainText(item.sourceName)} • ${formatTimeAgo(item.publishedAt)}`;

    itemEl.appendChild(link);
    itemEl.appendChild(meta);
    listContainer.appendChild(itemEl);
  }

  card.appendChild(listContainer);
  return card;
}
