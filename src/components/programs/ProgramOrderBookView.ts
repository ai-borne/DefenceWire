/**
 * Program Order Book & Delivery Tracker View Component for DefenceWire.in
 * Visual progress bar, contracted batches & operational deployment schedules.
 * Hard limit: <= 300 LOC.
 */

import { StrategicProgram, ProgramOrderBook, OrderBatch } from '../../types/programs.js';
import { STRINGS } from '../../resources/strings.js';
import { sanitizePlainText } from '../../utils/security.js';
import { getOrderBookByProgramId } from '../../data/programOrderBooks.js';

function getStatusBadge(status?: string): { text: string; className: string } {
  switch (status) {
    case 'delivered':
      return { text: `✓ ${STRINGS.programs.orderBookDelivered}`, className: 'dw-batch-badge--delivered' };
    case 'in_production':
      return { text: `⚙️ ${STRINGS.programs.orderBookInProduction}`, className: 'dw-batch-badge--production' };
    case 'sanctioned':
      return { text: `📋 ${STRINGS.programs.stageSanctioned}`, className: 'dw-batch-badge--sanctioned' };
    default:
      return { text: `⏳ ${STRINGS.programs.orderBookPending}`, className: 'dw-batch-badge--pending' };
  }
}

function renderBatchCard(batch: OrderBatch): HTMLElement {
  const card = document.createElement('div');
  card.className = 'dw-orderbook-batch-card';

  const badgeInfo = getStatusBadge(batch.status);

  const head = document.createElement('div');
  head.className = 'dw-orderbook-batch-head';
  head.innerHTML = `
    <strong class="dw-orderbook-batch-title">${sanitizePlainText(batch.batchName)}</strong>
    <span class="dw-orderbook-batch-badge ${badgeInfo.className}">${badgeInfo.text}</span>
  `;
  card.appendChild(head);

  const metaList = document.createElement('div');
  metaList.className = 'dw-orderbook-batch-meta';

  const unitsText = `${batch.units} ${STRINGS.programs.orderBookUnitsSuffix}`;
  const valText = batch.contractValueCrores ? `₹${batch.contractValueCrores.toLocaleString()} ${STRINGS.programs.croresSuffix}` : null;
  const facilityText = batch.manufacturingFacility ? `🏭 ${batch.manufacturingFacility}` : null;
  const schedText = batch.deliverySchedule ? `📅 ${batch.deliverySchedule}` : null;

  const items = [unitsText, valText, facilityText, schedText].filter(Boolean);
  metaList.textContent = sanitizePlainText(items.join(' • '));
  card.appendChild(metaList);

  if (batch.recipientBasesOrSquadrons && batch.recipientBasesOrSquadrons.length > 0) {
    const recRow = document.createElement('div');
    recRow.className = 'dw-orderbook-recipients';
    recRow.innerHTML = `<span class="dw-rec-label">📍 ${STRINGS.programs.orderBookRecipients}:</span> <span class="dw-rec-val">${sanitizePlainText(batch.recipientBasesOrSquadrons.join(', '))}</span>`;
    card.appendChild(recRow);
  }

  return card;
}

export function renderProgramOrderBookView(program: StrategicProgram): HTMLElement {
  const container = document.createElement('div');
  container.className = 'dw-program-orderbook-view';

  const heading = document.createElement('h3');
  heading.className = 'dw-timeline-heading';
  heading.textContent = STRINGS.programs.orderBookHeading;
  container.appendChild(heading);

  const orderBook: ProgramOrderBook | undefined = program.orderBook ?? getOrderBookByProgramId(program.id);

  if (!orderBook) {
    const empty = document.createElement('div');
    empty.className = 'dw-orderbook-empty';
    empty.innerHTML = `🛡️ <strong>${STRINGS.programs.activeWatch}:</strong> ${STRINGS.programs.orderBookEmpty}`;
    container.appendChild(empty);
    return container;
  }

  // 1. KPI Deck
  const totalVal = orderBook.batches.reduce((sum, b) => sum + (b.contractValueCrores ?? 0), 0);
  const kpiGrid = document.createElement('div');
  kpiGrid.className = 'dw-program-metrics-grid dw-orderbook-kpis';

  const sBlock = document.createElement('div');
  sBlock.className = 'dw-program-metric';
  sBlock.innerHTML = `<span class="dw-program-metric-label">${STRINGS.programs.orderBookSanctioned}</span><span class="dw-program-metric-value">${orderBook.sanctionedUnits}</span>`;
  kpiGrid.appendChild(sBlock);

  const dBlock = document.createElement('div');
  dBlock.className = 'dw-program-metric';
  dBlock.innerHTML = `<span class="dw-program-metric-label">${STRINGS.programs.orderBookDelivered}</span><span class="dw-program-metric-value dw-metric--green">${orderBook.deliveredUnits}</span>`;
  kpiGrid.appendChild(dBlock);

  const pBlock = document.createElement('div');
  pBlock.className = 'dw-program-metric';
  pBlock.innerHTML = `<span class="dw-program-metric-label">${STRINGS.programs.orderBookPending}</span><span class="dw-program-metric-value dw-metric--orange">${orderBook.pendingUnits}</span>`;
  kpiGrid.appendChild(pBlock);

  const vBlock = document.createElement('div');
  vBlock.className = 'dw-program-metric';
  vBlock.innerHTML = `<span class="dw-program-metric-label">${STRINGS.programs.orderBookContractValue}</span><span class="dw-program-metric-value">₹${totalVal.toLocaleString()} ${STRINGS.programs.croresSuffix}</span>`;
  kpiGrid.appendChild(vBlock);

  container.appendChild(kpiGrid);

  // 2. Visual Progress Bar
  const pct = orderBook.sanctionedUnits > 0 ? Math.min(100, Math.round((orderBook.deliveredUnits / orderBook.sanctionedUnits) * 100)) : 0;
  const progWrap = document.createElement('div');
  progWrap.className = 'dw-orderbook-progress-wrap';

  const progLabel = document.createElement('div');
  progLabel.className = 'dw-orderbook-progress-header';
  progLabel.innerHTML = `
    <span class="dw-prog-label">${STRINGS.programs.orderBookProgressLabel}</span>
    <span class="dw-prog-val">${orderBook.deliveredUnits} / ${orderBook.sanctionedUnits} (${pct}%)</span>
  `;
  progWrap.appendChild(progLabel);

  const track = document.createElement('div');
  track.className = 'dw-orderbook-progress-track';
  track.setAttribute('role', 'progressbar');
  track.setAttribute('aria-valuenow', String(orderBook.deliveredUnits));
  track.setAttribute('aria-valuemin', '0');
  track.setAttribute('aria-valuemax', String(orderBook.sanctionedUnits));
  track.setAttribute('aria-label', STRINGS.programs.orderBookProgressLabel);

  const fill = document.createElement('div');
  fill.className = 'dw-orderbook-progress-fill';
  fill.style.width = `${pct}%`;
  track.appendChild(fill);
  progWrap.appendChild(track);
  container.appendChild(progWrap);

  // 3. Milestone Callout
  if (orderBook.latestDeliveryMilestone) {
    const mileBox = document.createElement('div');
    mileBox.className = 'dw-orderbook-milestone-box';
    mileBox.innerHTML = `🚀 <strong>Latest Milestone:</strong> ${sanitizePlainText(orderBook.latestDeliveryMilestone)}`;
    container.appendChild(mileBox);
  }

  // 4. Batch Cards List
  if (orderBook.batches.length > 0) {
    const batchList = document.createElement('div');
    batchList.className = 'dw-orderbook-batch-list';
    for (const batch of orderBook.batches) {
      batchList.appendChild(renderBatchCard(batch));
    }
    container.appendChild(batchList);
  }

  return container;
}
