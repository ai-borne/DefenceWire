/**
 * Entity Dossier Modal Component for DefenceWire.in
 * Displays comprehensive military platform/system dossier, development timeline,
 * and historical story clusters from Cloudflare D1.
 * Hard limit: <= 300 LOC.
 */

import { sanitizePlainText, getSafeLinkAttributes } from '../utils/security.js';
import { formatTimeAgo } from '../utils/dateUtils.js';
import { STRINGS } from '../resources/strings.js';
import { StoryCluster } from '../types/news.js';

export interface EntityDossierData {
  entity: {
    id: string;
    name: string;
    category: string;
    sourceCount: number;
    mentionCount: number;
    isPromoted: boolean;
    firstSeenAt: string;
    lastSeenAt: string;
  } | null;
  relatedStories: StoryCluster[];
  error?: string;
}

export function slugify(name: string): string {
  return (name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function createMetricCell(label: string, value: string, valClass?: string): HTMLElement {
  const cell = document.createElement('div');
  cell.className = 'dw-metric-cell';

  const labelSpan = document.createElement('span');
  labelSpan.className = 'dw-metric-label';
  labelSpan.textContent = label;

  const valSpan = document.createElement('span');
  valSpan.className = valClass ? `dw-metric-val ${valClass}` : 'dw-metric-val';
  valSpan.textContent = value;

  cell.appendChild(labelSpan);
  cell.appendChild(valSpan);
  return cell;
}

export function openEntityDossierModal(
  entityName: string,
  fetchFn: typeof fetch = globalThis.fetch
): HTMLElement {
  const existingModal = document.getElementById('dw-entity-modal');
  if (existingModal) {
    existingModal.remove();
  }

  const backdrop = document.createElement('div');
  backdrop.id = 'dw-entity-modal';
  backdrop.className = 'dw-modal-backdrop';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.setAttribute('aria-label', `Dossier: ${entityName}`);

  const modal = document.createElement('div');
  modal.className = 'dw-modal-content';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'dw-modal-close-btn';
  closeBtn.type = 'button';
  closeBtn.textContent = '×';
  closeBtn.setAttribute('aria-label', STRINGS.dossier.closeAriaLabel);

  const closeModal = () => {
    backdrop.classList.add('dw-modal-closing');
    setTimeout(() => backdrop.remove(), 150);
  };

  closeBtn.addEventListener('click', closeModal);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal();
  });

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', handleKeyDown);
    }
  };
  document.addEventListener('keydown', handleKeyDown);

  const header = document.createElement('div');
  header.className = 'dw-modal-header';

  const title = document.createElement('h3');
  title.className = 'dw-modal-title';
  title.textContent = `${STRINGS.dossier.modalTitlePrefix}${entityName}`;

  header.appendChild(title);
  header.appendChild(closeBtn);
  modal.appendChild(header);

  const body = document.createElement('div');
  body.className = 'dw-modal-body';

  const loadingEl = document.createElement('div');
  loadingEl.className = 'dw-modal-loading';
  loadingEl.textContent = STRINGS.dossier.loading;
  body.appendChild(loadingEl);

  modal.appendChild(body);
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  const slug = slugify(entityName);

  fetchFn(`/api/entity/${encodeURIComponent(slug)}`)
    .then(async (res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as EntityDossierData;
    })
    .then((data) => {
      body.textContent = '';

      if (data.error && !data.entity && (!data.relatedStories || data.relatedStories.length === 0)) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'dw-modal-empty';
        emptyDiv.appendChild(document.createTextNode(STRINGS.dossier.noRecordsPrefix));
        const strong = document.createElement('strong');
        strong.textContent = entityName;
        emptyDiv.appendChild(strong);
        emptyDiv.appendChild(document.createTextNode('.'));
        body.appendChild(emptyDiv);
        return;
      }

      // Metrics Grid
      const metricsGrid = document.createElement('div');
      metricsGrid.className = 'dw-dossier-metrics';

      const catBadge = createMetricCell(
        STRINGS.dossier.domainLabel,
        (data.entity?.category || STRINGS.dossier.defaultCategory).toUpperCase(),
        'dw-cat-tag'
      );

      // Deduplicate stories in memory by ID & synthesized headline
      const uniqueStories: StoryCluster[] = [];
      const seenIds = new Set<string>();
      const seenTitles = new Set<string>();

      if (data.relatedStories) {
        for (const s of data.relatedStories) {
          const normTitle = (s.synthesizedHeadline || '').trim().toLowerCase();
          if (!seenIds.has(s.id) && (!normTitle || !seenTitles.has(normTitle))) {
            seenIds.add(s.id);
            if (normTitle) seenTitles.add(normTitle);
            uniqueStories.push(s);
          }
        }
      }

      const sourcesCount = data.entity?.sourceCount || (uniqueStories.length > 0 ? 1 : 0);
      const mentionsCount = data.entity?.mentionCount || uniqueStories.length;

      const sourcesCell = createMetricCell(
        STRINGS.dossier.corroborationLabel,
        sourcesCount > 0 ? `${sourcesCount} ${STRINGS.dossier.sourcesSuffix}` : STRINGS.dossier.watch247
      );

      const mentionsCell = createMetricCell(
        STRINGS.dossier.wireMentionsLabel,
        mentionsCount > 0 ? `${mentionsCount}` : STRINGS.dossier.activeTracking
      );

      metricsGrid.appendChild(catBadge);
      metricsGrid.appendChild(sourcesCell);
      metricsGrid.appendChild(mentionsCell);
      body.appendChild(metricsGrid);

      // Related Stories Timeline
      const timelineHeader = document.createElement('h4');
      timelineHeader.className = 'dw-timeline-heading';
      timelineHeader.textContent = STRINGS.dossier.timelineHeading;
      body.appendChild(timelineHeader);

      if (uniqueStories.length > 0) {
        const list = document.createElement('ul');
        list.className = 'dw-dossier-story-list';

        for (const story of uniqueStories) {
          const li = document.createElement('li');
          li.className = 'dw-dossier-story-item';

          const link = document.createElement('a');
          const safeAttrs = getSafeLinkAttributes(story.primarySource.url);
          link.href = safeAttrs.href;
          link.target = safeAttrs.target;
          link.rel = safeAttrs.rel;
          link.textContent = sanitizePlainText(story.synthesizedHeadline);

          const meta = document.createElement('div');
          meta.className = 'dw-river-meta';
          meta.textContent = `${sanitizePlainText(story.primarySource.sourceName)} • ${formatTimeAgo(
            story.primarySource.publishedAt
          )}`;

          li.appendChild(link);
          li.appendChild(meta);
          list.appendChild(li);
        }
        body.appendChild(list);
      } else {
        const noStories = document.createElement('p');
        noStories.className = 'dw-dossier-no-stories';
        noStories.appendChild(document.createTextNode('🛡️ '));
        const strong = document.createElement('strong');
        strong.textContent = STRINGS.dossier.activeWatchTitle;
        noStories.appendChild(strong);
        noStories.appendChild(document.createTextNode(` ${STRINGS.dossier.activeWatchBody}`));
        body.appendChild(noStories);
      }
    })
    .catch(() => {
      body.textContent = '';

      const fallbackGrid = document.createElement('div');
      fallbackGrid.className = 'dw-dossier-metrics';
      fallbackGrid.appendChild(createMetricCell(STRINGS.dossier.platformLabel, entityName));
      fallbackGrid.appendChild(createMetricCell(STRINGS.dossier.monitoringLabel, STRINGS.dossier.liveWire247));
      fallbackGrid.appendChild(createMetricCell(STRINGS.dossier.statusLabel, STRINGS.dossier.activeTracking));
      body.appendChild(fallbackGrid);

      const fallbackWatch = document.createElement('p');
      fallbackWatch.className = 'dw-dossier-no-stories';
      fallbackWatch.appendChild(document.createTextNode('🛡️ '));
      const strong = document.createElement('strong');
      strong.textContent = STRINGS.dossier.activeWatchTitle;
      fallbackWatch.appendChild(strong);
      fallbackWatch.appendChild(document.createTextNode(` ${STRINGS.dossier.activeWatchFallbackBody}`));
      body.appendChild(fallbackWatch);
    });

  return backdrop;
}
