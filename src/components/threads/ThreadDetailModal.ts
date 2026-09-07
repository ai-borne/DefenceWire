/**
 * Story Thread Detail Modal Component (Phase 4)
 * Modal popup displaying a thread's chronological milestone branch.
 * Accessible from story cluster cards or the Knowledge Graph inspector.
 * Hard limit: <= 300 LOC.
 */

import { fetchThreadDetail } from '../../services/threadService.js';
import { openModal, closeModal } from '../../utils/modalManager.js';
import { sanitizePlainText } from '../../utils/security.js';
import { formatDateOnly } from '../../utils/dateUtils.js';
import threadStrings from '../../resources/threadStrings.js';
import { renderThreadTimelineCard } from './ThreadTimelineCard.js';

export function openThreadDetailModal(threadId: string): void {
  const backdrop = document.createElement('div');
  backdrop.className = 'dw-modal-backdrop dw-thread-modal-backdrop';

  const modal = document.createElement('div');
  modal.className = 'dw-modal dw-thread-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', threadStrings.timelineHeading);

  // Close Button
  const closeBtn = document.createElement('button');
  closeBtn.className = 'dw-modal-close-btn';
  closeBtn.type = 'button';
  closeBtn.setAttribute('aria-label', threadStrings.modalCloseAria);
  closeBtn.textContent = '✕';
  closeBtn.addEventListener('click', () => {
    closeModal(backdrop);
  });
  modal.appendChild(closeBtn);

  // Modal Content Container
  const content = document.createElement('div');
  content.className = 'dw-thread-modal-content';

  const loadingEl = document.createElement('div');
  loadingEl.className = 'dw-thread-empty';
  loadingEl.textContent = threadStrings.loadingThreads;
  content.appendChild(loadingEl);

  modal.appendChild(content);
  backdrop.appendChild(modal);

  openModal(backdrop, {
    closeOnBackdrop: true,
    closeOnEscape: true,
    trapFocus: true,
    initialFocus: closeBtn
  });

  void fetchThreadDetail(threadId).then((result) => {
    content.innerHTML = '';

    if (result.error || !result.thread) {
      const errorP = document.createElement('p');
      errorP.className = 'dw-snippet';
      errorP.textContent = result.error || threadStrings.errorLoadingThreads;
      content.appendChild(errorP);
      return;
    }

    const { thread, events } = result;

    // Header
    const header = document.createElement('div');
    header.className = 'dw-thread-detail-header';

    const title = document.createElement('h3');
    title.className = 'dw-thread-detail-title';
    title.textContent = sanitizePlainText(thread.title);

    const meta = document.createElement('div');
    meta.className = 'dw-thread-detail-meta';

    const entityPill = document.createElement('span');
    entityPill.className = 'dw-thread-entity-badge';
    entityPill.textContent = sanitizePlainText(thread.canonicalEntity);

    const statusPill = document.createElement('span');
    statusPill.className = `dw-thread-status-badge dw-status-${thread.status}`;
    statusPill.textContent = thread.status.toUpperCase();

    const dates = document.createElement('span');
    dates.className = 'dw-thread-detail-dates';
    dates.textContent = `${threadStrings.firstReported}: ${formatDateOnly(thread.firstEventAt)} • ${threadStrings.latestUpdate}: ${formatDateOnly(thread.lastEventAt)}`;

    meta.appendChild(entityPill);
    meta.appendChild(statusPill);
    meta.appendChild(dates);

    header.appendChild(title);
    header.appendChild(meta);

    if (thread.summary) {
      const summary = document.createElement('p');
      summary.className = 'dw-thread-detail-summary';
      summary.textContent = sanitizePlainText(thread.summary);
      header.appendChild(summary);
    }

    content.appendChild(header);

    // Timeline Branch
    const timelineBranch = document.createElement('div');
    timelineBranch.className = 'dw-timeline-branch';

    if (events.length === 0) {
      const emptyEvents = document.createElement('p');
      emptyEvents.className = 'dw-snippet';
      emptyEvents.textContent = threadStrings.emptyThreadsDescription;
      timelineBranch.appendChild(emptyEvents);
    } else {
      events.forEach((event, idx) => {
        const isLatest = idx === events.length - 1;
        const card = renderThreadTimelineCard(event, { isLatest });
        timelineBranch.appendChild(card);
      });
    }

    content.appendChild(timelineBranch);
  });
}
