/**
 * Story Thread Timeline Card Component (Phase 4)
 * Renders an individual event milestone in the git-commit-style chronological branch.
 * Displays sequence code (x1.1.1), publish date, primary source, headline,
 * key delta summary, and extracted entities.
 * Hard limit: <= 300 LOC.
 */

import { StoryThreadEvent } from '../../types/threads.js';
import threadStrings from '../../resources/threadStrings.js';
import { sanitizePlainText, getSafeLinkAttributes } from '../../utils/security.js';
import { cleanHeadline } from '../../utils/snippetCleaner.js';
import { formatDateOnly } from '../../utils/dateUtils.js';

export interface ThreadTimelineCardOptions {
  isLatest?: boolean;
  onSelectEntity?: (entity: string) => void;
}

export function renderThreadTimelineCard(
  event: StoryThreadEvent,
  options: ThreadTimelineCardOptions = {}
): HTMLElement {
  const card = document.createElement('article');
  card.className = `dw-timeline-card ${options.isLatest ? 'is-latest' : ''}`;
  card.id = `event-${event.id}`;
  card.setAttribute('data-sequence-code', event.sequenceCode);
  card.setAttribute('data-event-id', event.id);

  // 1. Commit Stem Connector Dot
  const stemDot = document.createElement('div');
  stemDot.className = 'dw-timeline-stem-dot';
  stemDot.setAttribute('aria-hidden', 'true');
  card.appendChild(stemDot);

  // 2. Card Header: Sequence Badge, Date, and Primary Source Pill
  const header = document.createElement('div');
  header.className = 'dw-timeline-card-header';

  const metaLeft = document.createElement('div');
  metaLeft.className = 'dw-timeline-meta-left';

  // Git-style sequence code badge (e.g. x1.1.1)
  const seqBadge = document.createElement('span');
  seqBadge.className = 'dw-timeline-seq-badge';
  seqBadge.setAttribute('aria-label', `${threadStrings.sequenceMilestonePrefix} ${event.sequenceCode}`);
  seqBadge.textContent = event.sequenceCode;
  metaLeft.appendChild(seqBadge);

  // Timestamp
  const dateEl = document.createElement('time');
  dateEl.className = 'dw-timeline-date';
  dateEl.dateTime = event.publishedAt;
  dateEl.textContent = formatDateOnly(event.publishedAt);
  metaLeft.appendChild(dateEl);

  header.appendChild(metaLeft);

  // Primary Source Pill
  if (event.primarySourceName) {
    const sourceEl = document.createElement('div');
    sourceEl.className = 'dw-timeline-source-wrapper';

    if (event.primarySourceUrl) {
      const sourceLink = document.createElement('a');
      const safeAttrs = getSafeLinkAttributes(event.primarySourceUrl);
      sourceLink.href = safeAttrs.href;
      sourceLink.target = safeAttrs.target;
      sourceLink.rel = safeAttrs.rel;
      sourceLink.className = 'dw-timeline-source-pill';
      sourceLink.textContent = `${threadStrings.sourceLabel}: ${sanitizePlainText(event.primarySourceName)}`;
      sourceLink.title = `${threadStrings.sourceLabel}: ${sanitizePlainText(event.primarySourceName)}`;
      sourceEl.appendChild(sourceLink);
    } else {
      const sourceSpan = document.createElement('span');
      sourceSpan.className = 'dw-timeline-source-pill';
      sourceSpan.textContent = `${threadStrings.sourceLabel}: ${sanitizePlainText(event.primarySourceName)}`;
      sourceEl.appendChild(sourceSpan);
    }

    header.appendChild(sourceEl);
  }

  card.appendChild(header);

  // 3. Headline
  const headlineEl = document.createElement('h3');
  headlineEl.className = 'dw-timeline-headline';

  if (event.primarySourceUrl) {
    const headlineLink = document.createElement('a');
    const safeAttrs = getSafeLinkAttributes(event.primarySourceUrl);
    headlineLink.href = safeAttrs.href;
    headlineLink.target = safeAttrs.target;
    headlineLink.rel = safeAttrs.rel;
    headlineLink.textContent = cleanHeadline(event.headline);
    headlineEl.appendChild(headlineLink);
  } else {
    headlineEl.textContent = cleanHeadline(event.headline);
  }

  card.appendChild(headlineEl);

  // 4. Synthesized Key Delta Box
  if (event.deltaSummary) {
    const deltaBox = document.createElement('div');
    deltaBox.className = 'dw-timeline-delta-box';

    const deltaLabel = document.createElement('span');
    deltaLabel.className = 'dw-timeline-delta-label';
    deltaLabel.textContent = threadStrings.deltaLabel;

    const deltaText = document.createElement('p');
    deltaText.className = 'dw-timeline-delta-text';
    deltaText.textContent = sanitizePlainText(event.deltaSummary);

    deltaBox.appendChild(deltaLabel);
    deltaBox.appendChild(deltaText);
    card.appendChild(deltaBox);
  }

  // 5. Entities List
  if (event.entities && event.entities.length > 0) {
    const entitiesContainer = document.createElement('div');
    entitiesContainer.className = 'dw-timeline-entities';
    entitiesContainer.setAttribute('aria-label', threadStrings.entitiesLabel);

    event.entities.forEach((entity) => {
      const clean = sanitizePlainText(entity.trim());
      if (!clean) return;

      const tag = document.createElement('button');
      tag.className = 'dw-timeline-entity-tag';
      tag.type = 'button';
      tag.textContent = clean;

      if (options.onSelectEntity) {
        tag.addEventListener('click', (e) => {
          e.stopPropagation();
          options.onSelectEntity?.(clean);
        });
      }

      entitiesContainer.appendChild(tag);
    });

    if (entitiesContainer.childElementCount > 0) {
      card.appendChild(entitiesContainer);
    }
  }

  return card;
}
