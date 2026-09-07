/**
 * River View Component for DefenceWire.in
 * Renders the real-time chronologically-ordered raw intelligence wire feed.
 * Hard limit: <= 300 LOC.
 */

import { SourceTier } from '../types/source.js';
import { STRINGS } from '../resources/strings.js';
import { sanitizePlainText, getSafeLinkAttributes } from '../utils/security.js';
import { cleanStorySnippet } from '../utils/snippetCleaner.js';
import { formatTimeAgo } from '../utils/dateUtils.js';
import { NewsViewModel } from '../viewmodels/NewsViewModel.js';

export function renderRiverView(mainFeed: HTMLElement, newsVm: NewsViewModel): void {
  const riverTitle = document.createElement('h2');
  riverTitle.className = 'dw-headline--lead';
  riverTitle.style.marginBottom = '12px';
  riverTitle.textContent = `⚡ ${STRINGS.river.heading}`;

  const riverSub = document.createElement('p');
  riverSub.className = 'dw-snippet';
  riverSub.textContent = STRINGS.river.subheading;

  mainFeed.appendChild(riverTitle);
  mainFeed.appendChild(riverSub);

  const items = newsVm.getFilteredRiverItems();
  if (items.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'dw-snippet';
    empty.textContent = STRINGS.search.noResults;
    mainFeed.appendChild(empty);
    return;
  }

  const fullRiverList = document.createElement('div');
  fullRiverList.style.marginTop = '16px';

  for (const item of items) {
    const row = document.createElement('div');
    row.className = 'dw-river-item';
    row.style.padding = '10px 0';

    const link = document.createElement('a');
    const safeAttrs = getSafeLinkAttributes(item.url);
    link.href = safeAttrs.href;
    link.target = safeAttrs.target;
    link.rel = safeAttrs.rel;
    link.style.fontWeight = '600';
    link.textContent = sanitizePlainText(item.title);

    const meta = document.createElement('div');
    meta.className = 'dw-river-meta';

    const sourceSpan = document.createElement('span');
    sourceSpan.textContent = sanitizePlainText(item.sourceName);
    meta.appendChild(sourceSpan);

    if (item.tier === SourceTier.TIER_1_SOCIAL) {
      const badge = document.createElement('span');
      badge.className = 'dw-tier-badge dw-tier-TIER_1_SOCIAL';
      badge.style.marginLeft = '4px';
      badge.style.marginRight = '4px';
      badge.textContent = STRINGS.story.officialSignalBadge;
      meta.appendChild(badge);
    }

    const timeSpan = document.createElement('span');
    timeSpan.textContent = ` • ${formatTimeAgo(item.publishedAt)}`;
    meta.appendChild(timeSpan);

    row.appendChild(link);
    if (item.snippet) {
      const snip = document.createElement('p');
      snip.className = 'dw-snippet';
      snip.style.margin = '4px 0';
      snip.textContent = cleanStorySnippet(item.snippet);
      row.appendChild(snip);
    }
    row.appendChild(meta);
    fullRiverList.appendChild(row);
  }
  mainFeed.appendChild(fullRiverList);
}
