/**
 * Supplier Card Grid (Phase 2.4)
 * Responsive card grid rendered third/last in the Ecosystem Explorer. Each
 * card leads with linked program names/count; tier, location and capability
 * tags are secondary badges. Default sort (linked-program-count descending)
 * is driven by SuppliersViewModel.getFilteredSuppliers().
 * Hard limit: <= 300 LOC.
 */

import { STRINGS } from '../../resources/strings.js';
import { sanitizePlainText } from '../../utils/security.js';
import { SupplierProfile } from '../../types/suppliers.js';
import { SuppliersViewModel } from '../../viewmodels/SuppliersViewModel.js';
import { getLinkedProgramCount, getSuppliersForProgram } from '../../data/suppliers/programSupplierMapper.js';
import { getProgramById } from '../../data/strategicPrograms.js';

const TIER_LABELS: Record<string, string> = {
  dpsu: STRINGS.suppliers.tierDpsu,
  private_prime: STRINGS.suppliers.tierPrivatePrime,
  tier2_msme: STRINGS.suppliers.tierTier2Msme,
  deep_tech_startup: STRINGS.suppliers.tierDeepTechStartup
};

function getLinkedProgramNames(supplier: SupplierProfile): string[] {
  const ids = [...new Set(supplier.linkedPrograms.map((l) => l.programId))];
  return ids.map((id) => getProgramById(id)?.name ?? id).filter(Boolean);
}

export interface SupplierCardOptions {
  onSelect: (supplier: SupplierProfile) => void;
}

function renderCard(supplier: SupplierProfile, options: SupplierCardOptions): HTMLElement {
  const card = document.createElement('article');
  card.className = 'dw-supplier-card';
  card.setAttribute('data-supplier-id', supplier.id);
  card.setAttribute('data-tier', supplier.tier);

  const linkedCount = getLinkedProgramCount(supplier.id);
  const programIds = getLinkedProgramNames(supplier);

  const linkedRow = document.createElement('div');
  linkedRow.className = 'dw-supplier-card-linked';
  linkedRow.textContent = `${STRINGS.suppliers.linkedProgramsPrefix} ${linkedCount} ${
    STRINGS.suppliers.linkedProgramsSuffix
  } · ${programIds.slice(0, 3).map(sanitizePlainText).join(', ')}`;
  card.appendChild(linkedRow);

  const title = document.createElement('h3');
  title.className = 'dw-supplier-card-title';
  title.textContent = sanitizePlainText(supplier.name);
  card.appendChild(title);

  const badgeRow = document.createElement('div');
  badgeRow.className = 'dw-supplier-card-badges';
  const tierBadge = document.createElement('span');
  tierBadge.className = `dw-supplier-tier-badge dw-supplier-tier--${supplier.tier}`;
  tierBadge.textContent = TIER_LABELS[supplier.tier] ?? supplier.tier;
  badgeRow.appendChild(tierBadge);

  const locationBadge = document.createElement('span');
  locationBadge.className = 'dw-supplier-location-badge';
  locationBadge.textContent = sanitizePlainText(`${supplier.hqCity}, ${supplier.hqState}`);
  badgeRow.appendChild(locationBadge);

  supplier.capabilities.forEach((cap) => {
    const capBadge = document.createElement('span');
    capBadge.className = 'dw-supplier-capability-badge';
    capBadge.textContent = sanitizePlainText(cap.capabilityDomain);
    badgeRow.appendChild(capBadge);
  });
  card.appendChild(badgeRow);

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'dw-supplier-card-cta';
  btn.setAttribute('aria-label', `${STRINGS.suppliers.cardAriaLabel} ${supplier.name}`);
  btn.textContent = supplier.name;
  btn.addEventListener('click', () => options.onSelect(supplier));
  card.appendChild(btn);

  return card;
}

export function renderSupplierCardGridView(
  suppliersVm: SuppliersViewModel,
  options: SupplierCardOptions
): HTMLElement {
  const grid = document.createElement('div');
  grid.className = 'dw-supplier-grid';

  const suppliers = suppliersVm.getFilteredSuppliers();

  if (suppliers.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'dw-cluster dw-supplier-empty';
    const p = document.createElement('p');
    p.className = 'dw-snippet';
    p.textContent = STRINGS.suppliers.noResults;
    empty.appendChild(p);
    grid.appendChild(empty);
    return grid;
  }

  suppliers.forEach((supplier) => {
    grid.appendChild(renderCard(supplier, options));
  });

  return grid;
}

// Re-exported so tests can assert on program-linkage without duplicating the
// mapper import path.
export { getSuppliersForProgram };
