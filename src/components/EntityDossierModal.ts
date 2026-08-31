/**
 * Entity Dossier Modal Component for DefenceWire.in
 * Displays comprehensive military platform/system dossier, development timeline,
 * and historical story clusters from Cloudflare D1.
 * Hard limit: <= 300 LOC.
 */

import { sanitizePlainText, getSafeLinkAttributes } from '../utils/security.js';
import { formatTimeAgo } from '../utils/dateUtils.js';
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
  closeBtn.innerHTML = '&times;';
  closeBtn.setAttribute('aria-label', 'Close Dossier');

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
  title.textContent = `🛡️ Sovereign Dossier: ${entityName}`;

  header.appendChild(title);
  header.appendChild(closeBtn);
  modal.appendChild(header);

  const body = document.createElement('div');
  body.className = 'dw-modal-body';
  body.innerHTML = '<div class="dw-modal-loading">Querying D1 intelligence archive...</div>';
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
      body.innerHTML = '';

      if (data.error && !data.entity && (!data.relatedStories || data.relatedStories.length === 0)) {
        body.innerHTML = `<div class="dw-modal-empty">No historical dossier records found for <strong>${sanitizePlainText(
          entityName
        )}</strong>.</div>`;
        return;
      }

      // Metrics Grid
      const metricsGrid = document.createElement('div');
      metricsGrid.className = 'dw-dossier-metrics';

      const catBadge = document.createElement('div');
      catBadge.className = 'dw-metric-cell';
      catBadge.innerHTML = `<span class="dw-metric-label">DOMAIN</span><span class="dw-metric-val dw-cat-tag">${sanitizePlainText(
        (data.entity?.category || 'Strategic').toUpperCase()
      )}</span>`;

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

      const sourcesCell = document.createElement('div');
      sourcesCell.className = 'dw-metric-cell';
      sourcesCell.innerHTML = `<span class="dw-metric-label">CORROBORATION</span><span class="dw-metric-val">${
        sourcesCount > 0 ? `${sourcesCount} Sources` : '24/7 Watch'
      }</span>`;

      const mentionsCell = document.createElement('div');
      mentionsCell.className = 'dw-metric-cell';
      mentionsCell.innerHTML = `<span class="dw-metric-label">WIRE MENTIONS</span><span class="dw-metric-val">${
        mentionsCount > 0 ? mentionsCount : 'Active Tracking'
      }</span>`;

      metricsGrid.appendChild(catBadge);
      metricsGrid.appendChild(sourcesCell);
      metricsGrid.appendChild(mentionsCell);
      body.appendChild(metricsGrid);

      // Related Stories Timeline
      const timelineHeader = document.createElement('h4');
      timelineHeader.className = 'dw-timeline-heading';
      timelineHeader.textContent = 'Development Timeline & Corroborated Coverage:';
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
        noStories.innerHTML =
          '🛡️ <strong>Active Intelligence Watch:</strong> Real-time monitoring is active across 50+ official defence feeds. Historical milestones, tests, contracts, and deployments will automatically index here as coverage develops.';
        body.appendChild(noStories);
      }
    })
    .catch(() => {
      body.innerHTML = `
        <div class="dw-dossier-metrics">
          <div class="dw-metric-cell"><span class="dw-metric-label">PLATFORM</span><span class="dw-metric-val">${sanitizePlainText(
            entityName
          )}</span></div>
          <div class="dw-metric-cell"><span class="dw-metric-label">MONITORING</span><span class="dw-metric-val">24/7 Live Wire</span></div>
          <div class="dw-metric-cell"><span class="dw-metric-label">STATUS</span><span class="dw-metric-val">Active Tracking</span></div>
        </div>
        <p class="dw-dossier-no-stories">
          🛡️ <strong>Active Intelligence Watch:</strong> This sovereign platform is tracked across 50+ official military feeds. Development milestones, trials, and procurement updates will automatically aggregate here as stories develop.
        </p>
      `;
    });


  return backdrop;
}
