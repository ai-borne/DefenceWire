/**
 * Supplier Filter Pills, Search Bar & Sort Control (Phase 2.4)
 * Secondary controls rendered after the coverage strip: Tier, Capability
 * and Corridor filter selects, an instant debounced search box, and the
 * linked-program-count / alphabetical sort toggle.
 * Hard limit: <= 300 LOC.
 */

import { STRINGS } from '../../resources/strings.js';
import {
  CapabilityDomain,
  DefenceCorridor,
  SupplierTier
} from '../../types/suppliers.js';
import { SuppliersViewModel, SupplierSortMode } from '../../viewmodels/SuppliersViewModel.js';

const TIER_OPTIONS: readonly { id: SupplierTier | 'all'; label: string }[] = [
  { id: 'all', label: STRINGS.suppliers.filterAllTiers },
  { id: 'dpsu', label: STRINGS.suppliers.tierDpsu },
  { id: 'private_prime', label: STRINGS.suppliers.tierPrivatePrime },
  { id: 'tier2_msme', label: STRINGS.suppliers.tierTier2Msme },
  { id: 'deep_tech_startup', label: STRINGS.suppliers.tierDeepTechStartup }
] as const;

const CAPABILITY_DOMAINS: readonly CapabilityDomain[] = [
  'Precision Machining',
  'Composite Airframes',
  'Seeker Optics & EO/IR',
  'Energetic Materials',
  'Counter-UAS',
  'Radar & RF',
  'Naval & Undersea',
  'Propulsion'
] as const;

const CORRIDORS: readonly DefenceCorridor[] = [
  'Tamil Nadu',
  'Uttar Pradesh',
  'Bengaluru',
  'Hyderabad',
  'Pune'
] as const;

function buildSelect<T extends string>(
  ariaLabel: string,
  options: readonly { id: T | 'all'; label: string }[],
  activeId: T | 'all',
  onChange: (id: T | 'all') => void
): HTMLSelectElement {
  const select = document.createElement('select');
  select.className = 'dw-supplier-filter-select';
  select.setAttribute('aria-label', ariaLabel);

  options.forEach((opt) => {
    const option = document.createElement('option');
    option.value = opt.id;
    option.textContent = opt.label;
    option.selected = activeId === opt.id;
    select.appendChild(option);
  });

  select.addEventListener('change', () => onChange(select.value as T | 'all'));
  return select;
}

export function renderSupplierFilterPillsView(suppliersVm: SuppliersViewModel): HTMLElement {
  const bar = document.createElement('div');
  bar.className = 'dw-supplier-controls-bar';

  // Search
  const searchWrap = document.createElement('div');
  searchWrap.className = 'dw-supplier-search-wrap';
  const searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.className = 'dw-supplier-search-input';
  searchInput.placeholder = STRINGS.suppliers.searchPlaceholder;
  searchInput.value = suppliersVm.getSearchInput();
  searchInput.setAttribute('aria-label', STRINGS.suppliers.searchPlaceholder);
  searchInput.addEventListener('input', () => {
    suppliersVm.setSearchQuery(searchInput.value);
  });
  searchWrap.appendChild(searchInput);
  bar.appendChild(searchWrap);

  // Tier filter
  bar.appendChild(
    buildSelect(STRINGS.suppliers.tierFilterAriaLabel, TIER_OPTIONS, suppliersVm.getActiveTier(), (id) =>
      suppliersVm.setActiveTier(id)
    )
  );

  // Capability filter
  const capabilityOptions = [
    { id: 'all' as const, label: STRINGS.suppliers.filterAllCapabilities },
    ...CAPABILITY_DOMAINS.map((d) => ({ id: d, label: d }))
  ];
  bar.appendChild(
    buildSelect(
      STRINGS.suppliers.capabilityFilterAriaLabel,
      capabilityOptions,
      suppliersVm.getActiveCapability(),
      (id) => suppliersVm.setActiveCapability(id)
    )
  );

  // Corridor filter
  const corridorOptions = [
    { id: 'all' as const, label: STRINGS.suppliers.filterAllCorridors },
    ...CORRIDORS.map((c) => ({ id: c, label: c }))
  ];
  bar.appendChild(
    buildSelect(STRINGS.suppliers.corridorFilterAriaLabel, corridorOptions, suppliersVm.getActiveCorridor(), (id) =>
      suppliersVm.setActiveCorridor(id)
    )
  );

  // Sort control
  const sortOptions: readonly { id: SupplierSortMode; label: string }[] = [
    { id: 'linked_desc', label: STRINGS.suppliers.sortLinkedDesc },
    { id: 'alphabetical', label: STRINGS.suppliers.sortAlphabetical }
  ];
  const sortSelect = document.createElement('select');
  sortSelect.className = 'dw-supplier-sort-select';
  sortSelect.setAttribute('aria-label', STRINGS.suppliers.sortSelectAriaLabel);
  sortOptions.forEach((opt) => {
    const option = document.createElement('option');
    option.value = opt.id;
    option.textContent = opt.label;
    option.selected = suppliersVm.getSortMode() === opt.id;
    sortSelect.appendChild(option);
  });
  sortSelect.addEventListener('change', () => {
    suppliersVm.setSortMode(sortSelect.value as SupplierSortMode);
  });
  bar.appendChild(sortSelect);

  return bar;
}
