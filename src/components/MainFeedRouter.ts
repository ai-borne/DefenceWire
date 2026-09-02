/**
 * Main Feed Router for DefenceWire.in
 * Renders the mainFeed subtree for the active nav tab (River, Archive, or
 * the default Story Clusters view). Extracted from main.ts so the app's
 * composition root stays a thin bootstrapper as new tabs are added.
 * Hard limit: <= 300 LOC.
 */

import { SourceTier } from '../types/source.js';
import { STRINGS } from '../resources/strings.js';
import { sanitizePlainText, getSafeLinkAttributes } from '../utils/security.js';
import { cleanStorySnippet } from '../utils/snippetCleaner.js';
import { formatTimeAgo } from '../utils/dateUtils.js';
import { NewsViewModel } from '../viewmodels/NewsViewModel.js';
import { ArchiveViewModel } from '../viewmodels/ArchiveViewModel.js';
import { ProgramsViewModel } from '../viewmodels/ProgramsViewModel.js';
import { renderStoryCluster } from './StoryClusterView.js';
import { renderArchiveView } from './ArchiveView.js';
import { renderProgramsExplorerView } from './ProgramsExplorerView.js';

function renderSearchInfoBanner(mainFeed: HTMLElement, searchQuery: string): void {
  const searchInfo = document.createElement('div');
  searchInfo.style.cssText = 'margin-bottom:16px;font-size:0.82rem;color:var(--dw-text-secondary);font-weight:600;';
  searchInfo.textContent = `🔍 Results for "${searchQuery}"`;
  mainFeed.appendChild(searchInfo);
}

function renderRiverView(mainFeed: HTMLElement, newsVm: NewsViewModel): void {
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

function renderStoryClustersView(mainFeed: HTMLElement, newsVm: NewsViewModel, searchQuery: string): void {
  const { leadStory, regularClusters, totalMatchingStories } = newsVm.getFilteredClusters();

  if (totalMatchingStories === 0) {
    const empty = document.createElement('div');
    empty.className = 'dw-cluster';
    const p = document.createElement('p');
    p.className = 'dw-snippet';
    p.textContent = searchQuery ? STRINGS.search.noResults : STRINGS.errors.emptyCluster;
    empty.appendChild(p);
    mainFeed.appendChild(empty);
    return;
  }

  if (leadStory) {
    mainFeed.appendChild(renderStoryCluster(leadStory, newsVm, true));
  }
  for (const cluster of regularClusters) {
    mainFeed.appendChild(renderStoryCluster(cluster, newsVm, false));
  }
}

export function renderMainFeedContent(
  mainFeed: HTMLElement,
  activeCat: string,
  newsVm: NewsViewModel,
  archiveVm: ArchiveViewModel,
  programsVm?: ProgramsViewModel
): void {
  const searchQuery = newsVm.getSearchQuery();

  if (searchQuery && activeCat !== 'archive' && activeCat !== 'programs') {
    renderSearchInfoBanner(mainFeed, searchQuery);
  }

  if (activeCat === 'river') {
    renderRiverView(mainFeed, newsVm);
  } else if (activeCat === 'archive') {
    mainFeed.appendChild(renderArchiveView(archiveVm, newsVm));
  } else if (activeCat === 'programs') {
    const vm = programsVm ?? new ProgramsViewModel(newsVm);
    mainFeed.appendChild(renderProgramsExplorerView(vm));
  } else {
    renderStoryClustersView(mainFeed, newsVm, searchQuery);
  }
}
