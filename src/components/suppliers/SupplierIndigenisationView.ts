/**
 * Supplier Dossier — SRIJAN Indigenisation & iDEX Challenge Records Tab
 * (Phase 2.4).
 * Hard limit: <= 300 LOC.
 */

import { STRINGS } from '../../resources/strings.js';
import { sanitizePlainText } from '../../utils/security.js';
import { SupplierProfile } from '../../types/suppliers.js';

export function renderSupplierIndigenisationView(supplier: SupplierProfile): HTMLElement {
  const panel = document.createElement('div');
  panel.className = 'dw-supplier-tabpanel';

  const badgeRow = document.createElement('div');
  badgeRow.className = 'dw-supplier-indigenisation-badges';
  let hasBadge = false;

  if (supplier.srijanId) {
    hasBadge = true;
    const badge = document.createElement('span');
    badge.className = 'dw-supplier-indigenisation-badge dw-supplier-srijan-badge';
    badge.textContent = `${STRINGS.suppliers.indigenisationSrijanBadge}: ${sanitizePlainText(supplier.srijanId)}`;
    badgeRow.appendChild(badge);
  }

  if (supplier.idexWinner) {
    hasBadge = true;
    const badge = document.createElement('span');
    badge.className = 'dw-supplier-indigenisation-badge dw-supplier-idex-badge';
    badge.textContent = STRINGS.suppliers.indigenisationIdexBadge;
    badgeRow.appendChild(badge);
  }

  const srijanLinks = supplier.linkedPrograms.filter((l) => l.indigenisationStatus === 'srijan_listed');
  const idexLinks = supplier.linkedPrograms.filter((l) => l.indigenisationStatus === 'idex_winner');

  if (!hasBadge && srijanLinks.length === 0 && idexLinks.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'dw-snippet';
    empty.textContent = STRINGS.suppliers.indigenisationEmpty;
    panel.appendChild(empty);
    return panel;
  }

  if (hasBadge) panel.appendChild(badgeRow);

  [...srijanLinks, ...idexLinks].forEach((link) => {
    const item = document.createElement('div');
    item.className = 'dw-supplier-indigenisation-item';
    item.textContent = sanitizePlainText(`${link.subsystemName} (${link.programId})`);
    panel.appendChild(item);
  });

  return panel;
}
