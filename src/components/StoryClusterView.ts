/**
 * Story Cluster Component for DefenceWire.in
 * Techmeme-style synthesized headline, primary source, related coverage, discussions, and SSB drawer.
 * Hard limit: <= 300 LOC.
 */

import { StoryCluster } from '../types/news.js';
import { SourceTier } from '../types/source.js';
import { STRINGS } from '../resources/strings.js';
import { sanitizePlainText, getSafeLinkAttributes } from '../utils/security.js';
import { formatTimeAgo } from '../utils/dateUtils.js';
import { NewsViewModel } from '../viewmodels/NewsViewModel.js';
import { renderSSBDrawer } from './SSBDrawer.js';
import { pushStoryUrl, copyStoryLink } from '../services/permalinkService.js';
import { openEntityDossierModal } from './EntityDossierModal.js';


export function renderStoryCluster(
  cluster: StoryCluster,
  newsVm: NewsViewModel,
  isLead: boolean = false
): HTMLElement {
  const article = document.createElement('article');
  article.className = `dw-cluster ${isLead ? 'dw-cluster--lead' : ''}`;
  article.id = `cluster-${cluster.id}`;

  // 1. Lead story tag
  if (isLead) {
    const leadTag = document.createElement('span');
    leadTag.className = 'dw-lead-tag';
    leadTag.textContent = `★ ${STRINGS.nav.all.toUpperCase()} / LEAD BRIEFING`;
    article.appendChild(leadTag);
  }

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
  article.appendChild(headlineEl);

  // 3. Primary Source Meta Line
  const metaLine = document.createElement('div');
  metaLine.className = 'dw-source-line';

  const viaSpan = document.createElement('span');
  viaSpan.textContent = `${STRINGS.story.primarySourcePrefix} `;

  const sourceNameEl = document.createElement('span');
  sourceNameEl.className = 'dw-source-name';
  sourceNameEl.textContent = sanitizePlainText(cluster.primarySource.sourceName);

  // Tier Badge
  const tierBadge = document.createElement('span');
  tierBadge.className = `dw-tier-badge dw-tier-${cluster.primarySource.tier}`;
  tierBadge.title = STRINGS.story.sourceTierTooltip;

  if (cluster.primarySource.tier === SourceTier.TIER_1_OFFICIAL) {
    tierBadge.textContent = STRINGS.tiers.tier1;
  } else if (cluster.primarySource.tier === SourceTier.TIER_2_NATIONAL) {
    tierBadge.textContent = STRINGS.tiers.tier2;
  } else if (cluster.primarySource.tier === SourceTier.TIER_3_SPECIALIZED) {
    tierBadge.textContent = STRINGS.tiers.tier3;
  } else {
    tierBadge.textContent = STRINGS.tiers.tier4;
  }

  // Relative Time
  const timeSpan = document.createElement('span');
  timeSpan.className = 'dw-river-meta';
  timeSpan.textContent = `• ${formatTimeAgo(cluster.primarySource.publishedAt)}`;

  metaLine.appendChild(viaSpan);
  metaLine.appendChild(sourceNameEl);
  metaLine.appendChild(tierBadge);
  metaLine.appendChild(timeSpan);

  // Clickable Entity Chips for Techmeme-grade intelligence
  if (cluster.entities && cluster.entities.length > 0) {
    const entityBox = document.createElement('span');
    entityBox.className = 'dw-entity-chips';
    for (const ent of cluster.entities.slice(0, 3)) {
      const chip = document.createElement('button');
      chip.className = 'dw-entity-chip';
      chip.type = 'button';
      chip.textContent = `#${sanitizePlainText(ent)}`;
      chip.title = `View sovereign intelligence dossier for ${sanitizePlainText(ent)}`;
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        openEntityDossierModal(ent);
      });
      entityBox.appendChild(chip);
    }
    metaLine.appendChild(entityBox);
  }

  article.appendChild(metaLine);


  // 4. Primary Snippet
  if (cluster.primarySource.snippet) {
    const snippetEl = document.createElement('p');
    snippetEl.className = 'dw-snippet';
    snippetEl.textContent = sanitizePlainText(cluster.primarySource.snippet);
    article.appendChild(snippetEl);
  }

  // 5. Related Coverage Sub-list
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
      itemMeta.textContent = `(${sanitizePlainText(item.sourceName)}, ${formatTimeAgo(item.publishedAt)})`;

      li.appendChild(link);
      li.appendChild(itemMeta);
      relatedUl.appendChild(li);
    }

    relatedBox.appendChild(relatedUl);
    article.appendChild(relatedBox);
  }

  // 6. Discussion Quotes
  if (cluster.discussions && cluster.discussions.length > 0) {
    const discBox = document.createElement('div');
    discBox.className = 'dw-discussions';

    for (const disc of cluster.discussions) {
      const quoteP = document.createElement('p');
      quoteP.className = 'dw-discussion-quote';
      quoteP.textContent = `“${sanitizePlainText(disc.quote)}”`;

      const metaP = document.createElement('div');
      metaP.className = 'dw-discussion-meta';
      metaP.textContent = `— ${sanitizePlainText(disc.author)}, ${sanitizePlainText(disc.handleOrTitle)} [${disc.sourcePlatform}]`;

      discBox.appendChild(quoteP);
      discBox.appendChild(metaP);
    }

    article.appendChild(discBox);
  }

  // 6b. Permalink Button
  const permalinkBtn = document.createElement('button');
  permalinkBtn.className = 'dw-permalink-btn';
  permalinkBtn.type = 'button';
  permalinkBtn.setAttribute('aria-label', STRINGS.story.shareAriaLabel);
  permalinkBtn.textContent = '🔗 Permalink';

  permalinkBtn.addEventListener('click', () => {
    pushStoryUrl(cluster);
    copyStoryLink(cluster.id).then((copied) => {
      permalinkBtn.textContent = copied ? '✓ Link copied' : '🔗 Permalink';
      if (copied) {
        setTimeout(() => {
          permalinkBtn.textContent = '🔗 Permalink';
        }, 2000);
      }
    });
  });

  article.appendChild(permalinkBtn);

  // 7. SSB Intelligence Drawer Trigger
  if (cluster.ssbIntel) {
    const isExpanded = newsVm.isSSBExpanded(cluster.id);

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'dw-ssb-toggle-btn';
    toggleBtn.type = 'button';
    toggleBtn.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
    toggleBtn.setAttribute('aria-controls', `ssb-drawer-${cluster.id}`);
    toggleBtn.setAttribute('aria-label', STRINGS.story.expandSummaryAriaLabel);
    toggleBtn.textContent = isExpanded
      ? `▲ ${STRINGS.summary.drawerTitle} (${STRINGS.summary.collapseSuffix})`
      : `📄 ${STRINGS.summary.drawerTitle}`;

    toggleBtn.addEventListener('click', () => {
      newsVm.toggleSSBDrawer(cluster.id);
    });

    article.appendChild(toggleBtn);

    if (isExpanded) {
      const showSSBInsight = newsVm.getActiveCategory() === 'ssb';
      const ssbDrawerEl = renderSSBDrawer(cluster.ssbIntel, cluster.id, showSSBInsight);
      ssbDrawerEl.id = `ssb-drawer-${cluster.id}`;
      article.appendChild(ssbDrawerEl);
    }
  }

  return article;
}
