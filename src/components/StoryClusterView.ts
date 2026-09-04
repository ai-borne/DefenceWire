/**
 * Story Cluster Component for DefenceWire.in
 * Techmeme-style synthesized headline, primary source, related coverage, discussions, and SSB drawer.
 * Right-edge action dock with brand crimson triangle expander and permalink button.
 * Hard limit: <= 300 LOC.
 */

import { StoryCluster } from '../types/news.js';
import { STRINGS } from '../resources/strings.js';
import { sanitizePlainText, getSafeLinkAttributes } from '../utils/security.js';
import { cleanStorySnippet, cleanSourceName } from '../utils/snippetCleaner.js';
import { formatTimeAgo } from '../utils/dateUtils.js';
import { NewsViewModel } from '../viewmodels/NewsViewModel.js';
import { renderSSBDrawer } from './SSBDrawer.js';
import { pushStoryUrl, copyStoryLink } from '../services/permalinkService.js';
import { renderSourceAttribution } from '../utils/sourceAttribution.js';

export function renderStoryCluster(
  cluster: StoryCluster,
  newsVm: NewsViewModel,
  isLead: boolean = false
): HTMLElement {
  const article = document.createElement('article');
  article.className = `dw-cluster ${isLead ? 'dw-cluster--lead' : ''} dw-cluster-card`;
  article.id = `cluster-${cluster.id}`;

  const inner = document.createElement('div');
  inner.className = 'dw-cluster-inner';

  const content = document.createElement('div');
  content.className = 'dw-cluster-content';

  // 1. Lead story tag
  if (isLead) {
    const leadTag = document.createElement('span');
    leadTag.className = 'dw-lead-tag';
    leadTag.textContent = `★ ${STRINGS.nav.all.toUpperCase()} / LEAD BRIEFING`;
    content.appendChild(leadTag);
  }

  // 1b. Consolidated Source & Geopolitical Attribution Line (Flag + Source/Badge + Time)
  const attributionEl = renderSourceAttribution(cluster.primarySource);
  content.appendChild(attributionEl);

  // 2. Synthesized Headline
  const headlineEl = document.createElement('h2');
  headlineEl.className = `dw-headline ${isLead ? 'dw-headline--lead' : ''}`;

  const headlineLink = document.createElement('a');
  const primaryAttrs = getSafeLinkAttributes(cluster.primarySource.url);
  headlineLink.href = primaryAttrs.href;
  headlineLink.target = primaryAttrs.target;
  headlineLink.rel = primaryAttrs.rel;
  headlineLink.textContent = sanitizePlainText(cluster.synthesizedHeadline);

  headlineEl.appendChild(headlineLink);
  content.appendChild(headlineEl);

  // 3. Primary Snippet
  if (cluster.primarySource.snippet) {
    const snippetEl = document.createElement('p');
    snippetEl.className = 'dw-snippet';
    snippetEl.textContent = cleanStorySnippet(cluster.primarySource.snippet);
    content.appendChild(snippetEl);
  }

  // 4. Related Coverage Sub-list
  if (cluster.relatedCoverage && cluster.relatedCoverage.length > 0) {
    const relatedBox = document.createElement('div');
    relatedBox.className = 'dw-related-box';

    const relatedHeading = document.createElement('div');
    relatedHeading.className = 'dw-related-heading';
    relatedHeading.textContent = `${STRINGS.story.relatedCoverageHeading}:`;
    relatedBox.appendChild(relatedHeading);

    const relatedUl = document.createElement('ul');
    relatedUl.className = 'dw-related-list';

    for (const item of cluster.relatedCoverage) {
      const li = document.createElement('li');
      li.className = 'dw-related-item';

      const link = document.createElement('a');
      const safeAttrs = getSafeLinkAttributes(item.url);
      link.href = safeAttrs.href;
      link.target = safeAttrs.target;
      link.rel = safeAttrs.rel;
      link.textContent = sanitizePlainText(item.title);

      const itemMeta = document.createElement('span');
      itemMeta.className = 'dw-river-meta';
      itemMeta.style.marginLeft = '6px';
      itemMeta.textContent = `(${sanitizePlainText(cleanSourceName(item.sourceName))}, ${formatTimeAgo(item.publishedAt)})`;

      li.appendChild(link);
      li.appendChild(itemMeta);
      relatedUl.appendChild(li);
    }

    relatedBox.appendChild(relatedUl);
    content.appendChild(relatedBox);
  }

  // 5. Discussion Quotes
  if (cluster.discussions && cluster.discussions.length > 0) {
    const discBox = document.createElement('div');
    discBox.className = 'dw-discussions';

    for (const disc of cluster.discussions) {
      const quoteP = document.createElement('p');
      quoteP.className = 'dw-discussion-quote';
      quoteP.textContent = `“${sanitizePlainText(disc.quote)}”`;

      const metaP = document.createElement('div');
      metaP.className = 'dw-discussion-meta';

      const authorSpan = document.createElement('span');
      authorSpan.textContent = `— ${sanitizePlainText(disc.author)}, ${sanitizePlainText(disc.handleOrTitle)} `;
      metaP.appendChild(authorSpan);

      if (disc.sourcePlatform === 'X/Twitter' || disc.handleOrTitle.includes('@')) {
        const verifiedBadge = document.createElement('span');
        verifiedBadge.className = 'dw-verified-badge';
        verifiedBadge.textContent = `✓ ${STRINGS.story.officialSignalBadge}`;
        metaP.appendChild(verifiedBadge);
      }

      if (disc.url) {
        const discLink = document.createElement('a');
        const safeAttrs = getSafeLinkAttributes(disc.url);
        discLink.href = safeAttrs.href;
        discLink.target = safeAttrs.target;
        discLink.rel = safeAttrs.rel;
        discLink.className = 'dw-discussion-link';
        discLink.textContent = `[${disc.sourcePlatform}]`;
        metaP.appendChild(discLink);
      } else {
        const platformSpan = document.createElement('span');
        platformSpan.className = 'dw-discussion-platform';
        platformSpan.textContent = `[${disc.sourcePlatform}]`;
        metaP.appendChild(platformSpan);
      }

      discBox.appendChild(quoteP);
      discBox.appendChild(metaP);
    }

    content.appendChild(discBox);
  }

  // 6. Inline Base Footer (Metadata on Left + Action Buttons on Right)
  const footerEl = document.createElement('div');
  footerEl.className = 'dw-cluster-footer';

  // 6a. Clickable Entity Chips for Techmeme-grade intelligence
  if (cluster.entities && cluster.entities.length > 0) {
    const entityBox = document.createElement('div');
    entityBox.className = 'dw-entity-chips';
    for (const ent of cluster.entities.slice(0, 3)) {
      const chip = document.createElement('button');
      chip.className = 'dw-entity-chip';
      chip.type = 'button';
      chip.textContent = `#${sanitizePlainText(ent)}`;
      chip.title = `View sovereign intelligence dossier for ${sanitizePlainText(ent)}`;
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        import('./EntityDossierModal.js').then(({ openEntityDossierModal }) => {
          openEntityDossierModal(ent);
        });
      });
      entityBox.appendChild(chip);
    }
    footerEl.appendChild(entityBox);
  }

  // 6b. Base Action Group (Permalink / Share + Summary Accordion Expander)
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
  permalinkBtn.append(permalinkIconSpan, permalinkTextSpan);

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
    toggleBtn.append(toggleIconSpan, toggleTextSpan);

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
  content.appendChild(footerEl);

  // 6c. Dedicated Mobile Chevron Gutter (›)
  const chevronBtn = document.createElement('button');
  chevronBtn.className = 'dw-cluster-chevron-gutter';
  chevronBtn.type = 'button';
  chevronBtn.setAttribute('aria-label', STRINGS.story.openDossierAriaLabel);
  chevronBtn.setAttribute('title', STRINGS.story.openDossierAriaLabel);

  const chevronIcon = document.createElement('span');
  chevronIcon.className = 'dw-chevron-icon';
  chevronIcon.setAttribute('aria-hidden', 'true');
  chevronIcon.textContent = '›';
  chevronBtn.appendChild(chevronIcon);

  chevronBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    newsVm.openStoryDossier(cluster.id);
    import('./StoryDossierSlideOver.js').then(({ openStoryDossierSlideOver }) => {
      openStoryDossierSlideOver(cluster, {
        isLead,
        onClose: () => {
          newsVm.closeStoryDossier();
        }
      });
    });
  });

  inner.appendChild(content);
  inner.appendChild(chevronBtn);
  article.appendChild(inner);

  // 7. Expandable SSB Intelligence Drawer Container
  if (ssbDrawerEl) {
    const drawerWrapper = document.createElement('div');
    drawerWrapper.className = 'dw-ssb-drawer-wrapper is-open';
    drawerWrapper.appendChild(ssbDrawerEl);
    article.appendChild(drawerWrapper);
  }

  return article;
}
