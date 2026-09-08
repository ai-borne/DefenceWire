/**
 * Story Cluster Component for DefenceWire.in
 * Techmeme-style synthesized headline, primary source, related coverage, discussions, and SSB drawer.
 * Right-edge action dock with brand crimson triangle expander and permalink button.
 * Hard limit: <= 300 LOC.
 */

import { StoryCluster } from '../types/news.js';
import { STRINGS } from '../resources/strings.js';
import { getSafeLinkAttributes } from '../utils/security.js';
import { cleanStorySnippet, cleanHeadline } from '../utils/snippetCleaner.js';
import { NewsViewModel } from '../viewmodels/NewsViewModel.js';
import { renderSSBDrawer } from './SSBDrawer.js';
import { renderStorySourcesDrawer } from './StorySourcesDrawer.js';
import { pushStoryUrl, copyStoryLink } from '../services/permalinkService.js';
import { renderSourceAttribution } from '../utils/sourceAttribution.js';
import { canonicalizeTag, cleanHashtag, isNoiseTag } from '../utils/hashtagUtils.js';

interface StoryBadgeInfo {
  label: string;
  target: string;
}

function resolveStoryBadge(cluster: StoryCluster): StoryBadgeInfo | null {
  const candidates = [
    cluster.primaryTag,
    cluster.hashtags?.[0],
    cluster.programTags?.[0],
    cluster.ssbIntel?.defenceTechTakeaway?.platformOrSystem
  ];

  for (const raw of candidates) {
    if (!raw || typeof raw !== 'string') continue;
    const trimmed = raw.trim();
    if (!trimmed || trimmed.length <= 1) continue;
    if (trimmed.toLowerCase() === 'strategic defence modernization') continue;
    if (isNoiseTag(trimmed)) continue;

    const isHashtag = trimmed.startsWith('#') || !/\s/.test(trimmed) || raw === cluster.primaryTag || (cluster.hashtags && cluster.hashtags.includes(raw));
    if (isHashtag) {
      const canonical = canonicalizeTag(trimmed) || cleanHashtag(trimmed) || trimmed.replace(/^#+/, '');
      if (!canonical || isNoiseTag(canonical)) continue;
      return {
        label: `#${canonical}`,
        target: canonical
      };
    }

    return {
      label: trimmed,
      target: trimmed
    };
  }

  return null;
}

export function renderStoryCluster(
  cluster: StoryCluster,
  newsVm: NewsViewModel,
  isLead: boolean = false
): HTMLElement {
  const article = document.createElement('article');
  article.className = `dw-cluster ${isLead ? 'dw-cluster--lead' : ''}`;
  article.id = `cluster-${cluster.id}`;

  // 1. Top Kicker Ribbon (Lead Story Tag and/or Contextual Story Thread Badge)
  const badgeInfo = resolveStoryBadge(cluster);
  if (isLead || badgeInfo) {
    const kickerRow = document.createElement('div');
    kickerRow.className = 'dw-cluster-kicker-row';

    if (isLead) {
      const leadTag = document.createElement('span');
      leadTag.className = 'dw-lead-tag';
      leadTag.textContent = `★ ${STRINGS.nav.all.toUpperCase()} / LEAD BRIEFING`;
      kickerRow.appendChild(leadTag);
    }

    if (badgeInfo) {
      const threadBadge = document.createElement('button');
      threadBadge.className = 'dw-story-thread-badge';
      threadBadge.type = 'button';
      threadBadge.setAttribute('aria-label', `${STRINGS.threads.tabTitle}: ${badgeInfo.label}`);
      threadBadge.textContent = `${STRINGS.threads.badgePrefix} ${badgeInfo.label}`;
      threadBadge.addEventListener('click', (e) => {
        e.stopPropagation();
        import('./threads/ThreadDetailModal.js').then(({ openThreadDetailModal }) => {
          openThreadDetailModal(badgeInfo.target);
        }).catch(() => {});
      });
      kickerRow.appendChild(threadBadge);
    }

    article.appendChild(kickerRow);
  }

  // 2. Synthesized Headline (Headline First Scannability)
  const headlineEl = document.createElement('h2');
  headlineEl.className = `dw-headline ${isLead ? 'dw-headline--lead' : ''}`;

  const headlineLink = document.createElement('a');
  const primaryAttrs = getSafeLinkAttributes(cluster.primarySource.url);
  headlineLink.href = primaryAttrs.href;
  headlineLink.target = primaryAttrs.target;
  headlineLink.rel = primaryAttrs.rel;
  headlineLink.textContent = cleanHeadline(cluster.synthesizedHeadline);

  headlineEl.appendChild(headlineLink);
  article.appendChild(headlineEl);

  // 3. Primary Snippet
  if (cluster.primarySource.snippet) {
    const snippetEl = document.createElement('p');
    snippetEl.className = 'dw-snippet';
    snippetEl.textContent = cleanStorySnippet(cluster.primarySource.snippet);
    article.appendChild(snippetEl);
  }

  // 4. Expandable Sources Drawer Container (Corroborating Coverage & Perspectives)
  const isSourcesOpen = newsVm.isSourcesExpanded(cluster.id);
  const hasCorroboration = (cluster.relatedCoverage && cluster.relatedCoverage.length > 0) ||
    (cluster.discussions && cluster.discussions.length > 0);

  if (isSourcesOpen && hasCorroboration) {
    const sourcesWrapper = document.createElement('div');
    sourcesWrapper.className = 'dw-sources-drawer-wrapper is-open';
    sourcesWrapper.appendChild(renderStorySourcesDrawer(cluster));
    article.appendChild(sourcesWrapper);
  }

  // 5. Unified Base Footer (Metadata Attribution + Action Bar)
  const footerEl = document.createElement('div');
  footerEl.className = 'dw-cluster-footer';

  // 5a. Left Cluster: [+X sources] Micro-Pill (if available) + [Flag] Source Attribution
  const footerLeftEl = document.createElement('div');
  footerLeftEl.className = 'dw-cluster-footer-left';

  const totalCorroboration = (cluster.relatedCoverage?.length || 0) + (cluster.discussions?.length ? 1 : 0);
  if (totalCorroboration > 0) {
    const sourcesBtn = document.createElement('button');
    sourcesBtn.className = `dw-sources-toggle-btn ${isSourcesOpen ? 'is-expanded' : ''}`;
    sourcesBtn.type = 'button';
    sourcesBtn.setAttribute('aria-expanded', isSourcesOpen ? 'true' : 'false');
    sourcesBtn.setAttribute('aria-controls', `sources-drawer-${cluster.id}`);
    const pillLabel = isSourcesOpen
      ? STRINGS.story.sourcesCollapse
      : `${STRINGS.story.sourcesTogglePrefix}${totalCorroboration} ${
          totalCorroboration === 1 ? STRINGS.story.sourcesSingular : STRINGS.story.sourcesToggleSuffix
        }`;
    sourcesBtn.setAttribute('aria-label', pillLabel);
    sourcesBtn.textContent = pillLabel;

    sourcesBtn.addEventListener('click', () => {
      newsVm.toggleSourcesDrawer(cluster.id);
    });

    footerLeftEl.appendChild(sourcesBtn);
  }

  // Consolidated Source & Geopolitical Attribution Line inside footer
  const attributionEl = renderSourceAttribution(cluster.primarySource);
  footerLeftEl.appendChild(attributionEl);
  footerEl.appendChild(footerLeftEl);

  // 5b. Right: Base Action Group (Permalink / Share + Summary Accordion Expander)
  const actionsGroup = document.createElement('div');
  actionsGroup.className = 'dw-cluster-actions';

  // Share / Permalink Button with subtle text and tooltip
  const permalinkBtn = document.createElement('button');
  permalinkBtn.className = 'dw-permalink-btn';
  permalinkBtn.type = 'button';
  permalinkBtn.setAttribute('aria-label', STRINGS.story.shareAriaLabel);
  permalinkBtn.setAttribute('title', STRINGS.story.permalinkTooltip);

  const permalinkIconSpan = document.createElement('span');
  permalinkIconSpan.className = 'dw-btn-icon';
  permalinkIconSpan.textContent = STRINGS.story.permalinkIcon;

  const permalinkTextSpan = document.createElement('span');
  permalinkTextSpan.className = 'dw-btn-label';
  permalinkTextSpan.textContent = STRINGS.story.shareBtnText;

  permalinkBtn.appendChild(permalinkIconSpan);
  permalinkBtn.appendChild(permalinkTextSpan);

  permalinkBtn.addEventListener('click', () => {
    pushStoryUrl(cluster);
    copyStoryLink(cluster.id).then((copied) => {
      permalinkIconSpan.textContent = copied ? STRINGS.story.permalinkCopiedIcon : STRINGS.story.permalinkIcon;
      permalinkTextSpan.textContent = copied ? STRINGS.story.shareBtnCopiedText : STRINGS.story.shareBtnText;
      permalinkBtn.setAttribute('title', copied ? STRINGS.story.permalinkCopiedTooltip : STRINGS.story.permalinkTooltip);
      if (copied) {
        permalinkBtn.classList.add('dw-permalink-btn--copied');
        setTimeout(() => {
          permalinkIconSpan.textContent = STRINGS.story.permalinkIcon;
          permalinkTextSpan.textContent = STRINGS.story.shareBtnText;
          permalinkBtn.setAttribute('title', STRINGS.story.permalinkTooltip);
          permalinkBtn.classList.remove('dw-permalink-btn--copied');
        }, 2000);
      }
    });
  });

  actionsGroup.appendChild(permalinkBtn);

  // Summary Expander Button with subtle text and tooltip
  let ssbDrawerEl: HTMLElement | null = null;
  if (cluster.ssbIntel) {
    const isExpanded = newsVm.isSSBExpanded(cluster.id);

    const toggleBtn = document.createElement('button');
    toggleBtn.className = `dw-ssb-toggle-btn ${isExpanded ? 'is-expanded' : ''}`;
    toggleBtn.type = 'button';
    toggleBtn.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
    toggleBtn.setAttribute('aria-controls', `ssb-drawer-${cluster.id}`);
    toggleBtn.setAttribute('aria-label', isExpanded ? STRINGS.summary.collapseAriaLabel : STRINGS.story.expandSummaryAriaLabel);
    toggleBtn.setAttribute('title', isExpanded ? STRINGS.summary.collapseDrawerBtn : STRINGS.summary.drawerTitle);

    const toggleIconSpan = document.createElement('span');
    toggleIconSpan.className = 'dw-btn-icon';
    toggleIconSpan.textContent = isExpanded ? '▲' : '▼';

    const toggleTextSpan = document.createElement('span');
    toggleTextSpan.className = 'dw-btn-label';
    toggleTextSpan.textContent = isExpanded ? STRINGS.summary.summaryCollapseText : STRINGS.summary.summaryToggleText;

    toggleBtn.appendChild(toggleIconSpan);
    toggleBtn.appendChild(toggleTextSpan);

    toggleBtn.addEventListener('click', () => {
      newsVm.toggleSSBDrawer(cluster.id);
    });

    actionsGroup.appendChild(toggleBtn);

    if (isExpanded) {
      const showSSBInsight = newsVm.getActiveCategory() === 'ssb';
      ssbDrawerEl = renderSSBDrawer(cluster.ssbIntel, cluster.id, showSSBInsight);
      ssbDrawerEl.id = `ssb-drawer-${cluster.id}`;
    }
  }

  footerEl.appendChild(actionsGroup);
  article.appendChild(footerEl);

  // 7. Expandable SSB Intelligence Drawer Container
  if (ssbDrawerEl) {
    const drawerWrapper = document.createElement('div');
    drawerWrapper.className = 'dw-ssb-drawer-wrapper is-open';
    drawerWrapper.appendChild(ssbDrawerEl);
    article.appendChild(drawerWrapper);
  }

  return article;
}
