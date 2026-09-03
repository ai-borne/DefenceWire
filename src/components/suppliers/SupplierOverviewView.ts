/**
 * Supplier Dossier — Overview & Manufacturing Facilities Tab (Phase 2.4)
 * Hard limit: <= 300 LOC.
 */

import { STRINGS } from '../../resources/strings.js';
import { sanitizePlainText, getSafeLinkAttributes } from '../../utils/security.js';
import { SupplierProfile } from '../../types/suppliers.js';

export function renderSupplierOverviewView(supplier: SupplierProfile): HTMLElement {
  const panel = document.createElement('div');
  panel.className = 'dw-supplier-tabpanel';

  const metaGrid = document.createElement('div');
  metaGrid.className = 'dw-supplier-meta-grid';
  metaGrid.innerHTML = `
    <div class="dw-supplier-meta-item"><span class="dw-supplier-meta-label">${STRINGS.suppliers.overviewHqLabel}</span><span class="dw-supplier-meta-value">${sanitizePlainText(`${supplier.hqCity}, ${supplier.hqState}`)}</span></div>
    ${
      supplier.corridor
        ? `<div class="dw-supplier-meta-item"><span class="dw-supplier-meta-label">${STRINGS.suppliers.overviewCorridorLabel}</span><span class="dw-supplier-meta-value">${sanitizePlainText(supplier.corridor)}</span></div>`
        : ''
    }
    <div class="dw-supplier-meta-item"><span class="dw-supplier-meta-label">${STRINGS.suppliers.overviewListedLabel}</span><span class="dw-supplier-meta-value">${supplier.isListed ? '✓' : '—'}</span></div>
    ${
      supplier.stockSymbol
        ? `<div class="dw-supplier-meta-item"><span class="dw-supplier-meta-label">${STRINGS.suppliers.overviewStockLabel}</span><span class="dw-supplier-meta-value">${sanitizePlainText(supplier.stockSymbol)}</span></div>`
        : ''
    }
  `;
  panel.appendChild(metaGrid);

  const summary = document.createElement('p');
  summary.className = 'dw-supplier-modal-summary';
  summary.textContent = sanitizePlainText(supplier.description);
  panel.appendChild(summary);

  if (supplier.website) {
    const safe = getSafeLinkAttributes(supplier.website);
    const link = document.createElement('a');
    link.className = 'dw-supplier-website-link';
    link.href = safe.href;
    link.target = safe.target;
    link.rel = safe.rel;
    link.textContent = `${STRINGS.suppliers.overviewWebsiteLabel} ↗`;
    panel.appendChild(link);
  }

  const facilitiesH = document.createElement('h3');
  facilitiesH.className = 'dw-timeline-heading';
  facilitiesH.textContent = STRINGS.suppliers.overviewFacilitiesHeading;
  panel.appendChild(facilitiesH);

  // No structured facilities dataset exists yet (Phase 2.2 seed schema
  // captures only HQ city/state/corridor) — render the established
  // empty-state pattern rather than fabricating facility records.
  const facilitiesEmpty = document.createElement('p');
  facilitiesEmpty.className = 'dw-snippet';
  facilitiesEmpty.textContent = STRINGS.suppliers.overviewFacilitiesEmpty;
  panel.appendChild(facilitiesEmpty);

  return panel;
}
