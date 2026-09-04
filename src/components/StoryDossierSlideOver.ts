/**
 * Slide-Over Story Dossier Component for DefenceWire.in
 * High-density mobile slide-over screen rendering consolidated cluster intelligence:
 * Related coverage, discussion quotes, entity chips, share actions, and summary takeaways.
 * Integrates with accessible reference-counted modalManager for Esc key, backdrop tap, and iOS touch scroll locking.
 * Hard limit: <= 300 LOC.
 */

import { StoryCluster } from '../types/news.js';
import { STRINGS } from '../resources/strings.js';
import { sanitizePlainText, getSafeLinkAttributes } from '../utils/security.js';
import { cleanStorySnippet, cleanSourceName } from '../utils/snippetCleaner.js';
import { formatTimeAgo } from '../utils/dateUtils.js';
import { renderSourceAttribution } from '../utils/sourceAttribution.js';
import { openModal, closeModal as dismissModal } from '../utils/modalManager.js';
import { openEntityDossierModal } from './EntityDossierModal.js';
import { renderSSBDrawer } from './SSBDrawer.js';
import { pushStoryUrl, copyStoryLink } from '../services/permalinkService.js';

export interface StoryDossierOptions {
  onClose?: () => void;
  isLead?: boolean;
}

function appendActions(parent: HTMLElement, cluster: StoryCluster): void {
  const actionsGroup = document.createElement('div');
  actionsGroup.className = 'dw-dossier-actions';

  const permalinkBtn = document.createElement('button');
  permalinkBtn.className = 'dw-permalink-btn';
  permalinkBtn.type = 'button';
  permalinkBtn.setAttribute('aria-label', STRINGS.story.shareAriaLabel);
  permalinkBtn.setAttribute('title', STRINGS.story.permalinkTooltip);

  const iconSpan = document.createElement('span');
  iconSpan.className = 'dw-btn-icon';
  iconSpan.textContent = STRINGS.story.permalinkIcon;

  const labelSpan = document.createElement('span');
  labelSpan.className = 'dw-btn-label';
  labelSpan.textContent = STRINGS.story.shareBtnText;
  permalinkBtn.append(iconSpan, labelSpan);

  permalinkBtn.addEventListener('click', () => {
    pushStoryUrl(cluster);
    copyStoryLink(cluster.id).then((copied) => {
      iconSpan.textContent = copied ? STRINGS.story.permalinkCopiedIcon : STRINGS.story.permalinkIcon;
      labelSpan.textContent = copied ? STRINGS.story.shareBtnCopiedText : STRINGS.story.shareBtnText;
      permalinkBtn.setAttribute('title', copied ? STRINGS.story.permalinkCopiedTooltip : STRINGS.story.permalinkTooltip);
      if (copied) {
        permalinkBtn.classList.add('dw-permalink-btn--copied');
        setTimeout(() => {
          iconSpan.textContent = STRINGS.story.permalinkIcon;
          labelSpan.textContent = STRINGS.story.shareBtnText;
          permalinkBtn.setAttribute('title', STRINGS.story.permalinkTooltip);
          permalinkBtn.classList.remove('dw-permalink-btn--copied');
        }, 2000);
      }
    });
  });

  actionsGroup.appendChild(permalinkBtn);
  parent.appendChild(actionsGroup);
}

function appendRelatedCoverage(parent: HTMLElement, items: NonNullable<StoryCluster['relatedCoverage']>): void {
  if (items.length === 0) return;
  const section = document.createElement('section');
  section.className = 'dw-dossier-section dw-dossier-related';
  const heading = document.createElement('h3');
  heading.className = 'dw-dossier-section-title';
  heading.textContent = `${STRINGS.story.relatedCoverageHeading}:`;
  section.appendChild(heading);

  const ul = document.createElement('ul');
  ul.className = 'dw-dossier-related-list';
  for (const item of items) {
    const li = document.createElement('li');
    li.className = 'dw-dossier-related-item';
    const link = document.createElement('a');
    const safeAttrs = getSafeLinkAttributes(item.url);
    link.href = safeAttrs.href;
    link.target = safeAttrs.target;
    link.rel = safeAttrs.rel;
    link.textContent = sanitizePlainText(item.title);

    const meta = document.createElement('span');
    meta.className = 'dw-river-meta';
    meta.style.marginLeft = '6px';
    meta.textContent = `(${sanitizePlainText(cleanSourceName(item.sourceName))}, ${formatTimeAgo(item.publishedAt)})`;
    li.append(link, meta);
    ul.appendChild(li);
  }
  section.appendChild(ul);
  parent.appendChild(section);
}

function appendDiscussions(parent: HTMLElement, discussions: NonNullable<StoryCluster['discussions']>): void {
  if (discussions.length === 0) return;
  const section = document.createElement('section');
  section.className = 'dw-dossier-section dw-dossier-discussions';
  const heading = document.createElement('h3');
  heading.className = 'dw-dossier-section-title';
  heading.textContent = `${STRINGS.story.discussionHeading}:`;
  section.appendChild(heading);

  for (const disc of discussions) {
    const card = document.createElement('div');
    card.className = 'dw-dossier-quote-card';
    const quoteP = document.createElement('p');
    quoteP.className = 'dw-discussion-quote';
    quoteP.textContent = `“${sanitizePlainText(disc.quote)}”`;

    const metaDiv = document.createElement('div');
    metaDiv.className = 'dw-discussion-meta';
    const authorSpan = document.createElement('span');
    authorSpan.textContent = `— ${sanitizePlainText(disc.author)}, ${sanitizePlainText(disc.handleOrTitle)} `;
    metaDiv.appendChild(authorSpan);

    if (disc.sourcePlatform === 'X/Twitter' || disc.handleOrTitle.includes('@')) {
      const verifiedBadge = document.createElement('span');
      verifiedBadge.className = 'dw-verified-badge';
      verifiedBadge.textContent = `✓ ${STRINGS.story.officialSignalBadge}`;
      metaDiv.appendChild(verifiedBadge);
    }

    const platformEl = disc.url ? document.createElement('a') : document.createElement('span');
    platformEl.className = disc.url ? 'dw-discussion-link' : 'dw-discussion-platform';
    platformEl.textContent = `[${disc.sourcePlatform}]`;
    if (disc.url && platformEl instanceof HTMLAnchorElement) {
      const safeAttrs = getSafeLinkAttributes(disc.url);
      platformEl.href = safeAttrs.href;
      platformEl.target = safeAttrs.target;
      platformEl.rel = safeAttrs.rel;
    }
    metaDiv.appendChild(platformEl);
    card.append(quoteP, metaDiv);
    section.appendChild(card);
  }
  parent.appendChild(section);
}

function appendEntityChips(parent: HTMLElement, entities: string[]): void {
  if (entities.length === 0) return;
  const section = document.createElement('section');
  section.className = 'dw-dossier-section dw-dossier-entities';
  const entityBox = document.createElement('div');
  entityBox.className = 'dw-entity-chips';

  for (const ent of entities) {
    const chip = document.createElement('button');
    chip.className = 'dw-entity-chip';
    chip.type = 'button';
    chip.textContent = `#${sanitizePlainText(ent)}`;
    chip.title = `${STRINGS.dossier.modalAriaPrefix}${sanitizePlainText(ent)}`;
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      openEntityDossierModal(ent);
    });
    entityBox.appendChild(chip);
  }
  section.appendChild(entityBox);
  parent.appendChild(section);
}

export function renderStoryDossierPanel(
  cluster: StoryCluster,
  onClose: () => void,
  isLead: boolean = false
): HTMLElement {
  const panel = document.createElement('div');
  panel.className = 'dw-story-dossier-panel';
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-label', STRINGS.story.dossierTitle);

  const header = document.createElement('header');
  header.className = 'dw-dossier-header';
  const backBtn = document.createElement('button');
  backBtn.className = 'dw-dossier-back-btn';
  backBtn.type = 'button';
  backBtn.setAttribute('aria-label', STRINGS.story.dossierBackBtn);
  backBtn.textContent = STRINGS.story.dossierBackBtn;
  backBtn.addEventListener('click', onClose);
  header.appendChild(backBtn);
  panel.appendChild(header);

  const body = document.createElement('div');
  body.className = 'dw-dossier-body';

  if (isLead) {
    const leadTag = document.createElement('span');
    leadTag.className = 'dw-lead-tag';
    leadTag.textContent = `★ ${STRINGS.nav.all.toUpperCase()} / LEAD BRIEFING`;
    body.appendChild(leadTag);
  }

  body.appendChild(renderSourceAttribution(cluster.primarySource));

  const headlineEl = document.createElement('h2');
  headlineEl.className = 'dw-dossier-headline';
  const headlineLink = document.createElement('a');
  const primaryAttrs = getSafeLinkAttributes(cluster.primarySource.url);
  headlineLink.href = primaryAttrs.href;
  headlineLink.target = primaryAttrs.target;
  headlineLink.rel = primaryAttrs.rel;
  headlineLink.textContent = sanitizePlainText(cluster.synthesizedHeadline);
  headlineEl.appendChild(headlineLink);
  body.appendChild(headlineEl);

  if (cluster.primarySource.snippet) {
    const snippetEl = document.createElement('p');
    snippetEl.className = 'dw-dossier-snippet';
    snippetEl.textContent = cleanStorySnippet(cluster.primarySource.snippet);
    body.appendChild(snippetEl);
  }

  appendActions(body, cluster);

  if (cluster.relatedCoverage && cluster.relatedCoverage.length > 0) {
    appendRelatedCoverage(body, cluster.relatedCoverage);
  }
  if (cluster.discussions && cluster.discussions.length > 0) {
    appendDiscussions(body, cluster.discussions);
  }
  if (cluster.entities && cluster.entities.length > 0) {
    appendEntityChips(body, cluster.entities);
  }
  if (cluster.ssbIntel) {
    const summarySection = document.createElement('section');
    summarySection.className = 'dw-dossier-section dw-dossier-summary';
    summarySection.appendChild(renderSSBDrawer(cluster.ssbIntel, cluster.id, false));
    body.appendChild(summarySection);
  }

  panel.appendChild(body);
  return panel;
}

export function closeStoryDossierSlideOver(backdrop?: HTMLElement): void {
  const target = backdrop || (typeof document !== 'undefined' ? document.getElementById('dw-story-dossier-overlay') : null);
  if (target) dismissModal(target);
}

export function openStoryDossierSlideOver(
  cluster: StoryCluster,
  options: StoryDossierOptions = {}
): HTMLElement {
  if (typeof document !== 'undefined') {
    const existing = document.getElementById('dw-story-dossier-overlay');
    if (existing) {
      dismissModal(existing);
      existing.remove();
    }
  }

  const backdrop = document.createElement('div');
  backdrop.id = 'dw-story-dossier-overlay';
  backdrop.className = 'dw-modal-backdrop dw-story-dossier-overlay';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.setAttribute('aria-label', STRINGS.story.dossierTitle);

  const panel = renderStoryDossierPanel(cluster, () => dismissModal(backdrop), options.isLead);
  panel.classList.add('is-open');
  backdrop.appendChild(panel);

  const backBtn = panel.querySelector<HTMLElement>('.dw-dossier-back-btn');
  openModal(backdrop, {
    onClose: options.onClose,
    closeOnBackdrop: true,
    closeOnEscape: true,
    initialFocus: backBtn,
    trapFocus: true,
  });

  return backdrop;
}
