/**
 * Unit Tests for Suppliers Explorer View & Supplier Detail Modal (Phase 2.4)
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SuppliersViewModel } from '../../src/viewmodels/SuppliersViewModel.js';
import { renderSuppliersExplorerView } from '../../src/components/suppliers/SuppliersExplorerView.js';
import { openSupplierDetailModal } from '../../src/components/suppliers/SupplierDetailModal.js';
import { ALL_SUPPLIERS, getSupplierBySlug } from '../../src/data/suppliers/seedSuppliers.js';
import { getProgramCoverageStats, getLinkedProgramCount } from '../../src/data/suppliers/programSupplierMapper.js';
import { STRINGS } from '../../src/resources/strings.js';

describe('Unit: SuppliersExplorerView Component', () => {
  let vm: SuppliersViewModel;

  beforeEach(() => {
    document.body.innerHTML = '';
    vm = new SuppliersViewModel();
  });

  it('should render featured link before coverage strip before card grid (DOM order)', () => {
    const el = renderSuppliersExplorerView(vm);
    const featured = el.querySelector('.dw-supplier-featured-link');
    const strip = el.querySelector('.dw-supplier-coverage-strip');
    const grid = el.querySelector('.dw-supplier-grid');

    expect(featured).not.toBeNull();
    expect(strip).not.toBeNull();
    expect(grid).not.toBeNull();

    const position = (a: Node, b: Node) => a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING;
    expect(position(featured!, strip!)).toBeTruthy();
    expect(position(strip!, grid!)).toBeTruthy();
  });

  it('should render a non-zero "X of 43 programs mapped" coverage count', () => {
    const el = renderSuppliersExplorerView(vm);
    const summary = el.querySelector('.dw-supplier-coverage-summary');
    expect(summary).not.toBeNull();

    const stats = getProgramCoverageStats();
    expect(stats.totalPrograms).toBe(43);
    expect(stats.mappedProgramCount).toBeGreaterThan(0);
    expect(summary!.textContent).toContain(String(stats.mappedProgramCount));
    expect(summary!.textContent).toContain(String(stats.totalPrograms));
  });

  it('should display linked-program count and >=1 program name on every rendered card', () => {
    const el = renderSuppliersExplorerView(vm);
    const cards = el.querySelectorAll('.dw-supplier-card');
    expect(cards.length).toBe(ALL_SUPPLIERS.length);

    cards.forEach((card) => {
      const supplierId = card.getAttribute('data-supplier-id')!;
      const linkedCount = getLinkedProgramCount(supplierId);
      const linkedRow = card.querySelector('.dw-supplier-card-linked');
      expect(linkedRow).not.toBeNull();
      expect(linkedRow!.textContent).toContain(String(linkedCount));
      expect(linkedRow!.textContent).toContain(STRINGS.suppliers.linkedProgramsPrefix);
      // Must show at least one program name (non-empty text after the count segment)
      expect(linkedRow!.textContent!.split('·')[1]?.trim().length).toBeGreaterThan(0);
    });
  });

  it('should default-sort the card grid by linked-program count descending, not alphabetical', () => {
    const el = renderSuppliersExplorerView(vm);
    expect(vm.getSortMode()).toBe('linked_desc');

    const cards = Array.from(el.querySelectorAll('.dw-supplier-card'));
    const counts = cards.map((c) => getLinkedProgramCount(c.getAttribute('data-supplier-id')!));
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i - 1]).toBeGreaterThanOrEqual(counts[i]!);
    }

    // Sanity: this ordering must differ from pure alphabetical for the seed set.
    const names = cards.map((c) => c.querySelector('.dw-supplier-card-title')!.textContent);
    const alphabetical = [...names].sort((a, b) => a!.localeCompare(b!));
    expect(names).not.toEqual(alphabetical);
  });

  it('should update filters and search when controls are interacted with', () => {
    const el = renderSuppliersExplorerView(vm);
    const tierSelect = el.querySelector('.dw-supplier-filter-select') as HTMLSelectElement;
    tierSelect.value = 'dpsu';
    tierSelect.dispatchEvent(new Event('change'));
    expect(vm.getActiveTier()).toBe('dpsu');

    const searchInput = el.querySelector('.dw-supplier-search-input') as HTMLInputElement;
    searchInput.value = 'bharat';
    searchInput.dispatchEvent(new Event('input'));
    expect(vm.getSearchInput()).toBe('bharat');
  });
});

describe('Unit: SupplierDetailModal Component', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should render a non-empty Linked Programs tab for every seeded supplier', () => {
    ALL_SUPPLIERS.forEach((supplier) => {
      const modal = openSupplierDetailModal(supplier);
      const linkedPanel = modal.querySelector('#dw-supplier-tabpanel-linked');
      expect(linkedPanel, `supplier "${supplier.id}" missing linked panel`).not.toBeNull();
      expect(
        linkedPanel!.querySelectorAll('.dw-supplier-linked-card').length,
        `supplier "${supplier.id}" has an empty Linked Programs tab`
      ).toBeGreaterThan(0);
      expect(linkedPanel!.textContent).not.toContain(STRINGS.suppliers.linkedProgramsEmpty);
      modal.remove();
    });
  });

  it('should render full accessible tabbed dossier for a supplier', () => {
    const supplier = getSupplierBySlug('mtar-technologies');
    expect(supplier).toBeDefined();

    const modal = openSupplierDetailModal(supplier!);
    expect(document.getElementById('dw-supplier-modal')).not.toBeNull();
    expect(modal.querySelector('.dw-supplier-modal-title')?.textContent).toBe(supplier!.name);

    const tabList = modal.querySelector('[role="tablist"]');
    expect(tabList).not.toBeNull();
    const tabs = modal.querySelectorAll('[role="tab"]');
    expect(tabs.length).toBe(5);
    expect(tabs[0]!.getAttribute('aria-selected')).toBe('true');

    const capabilitiesTab = Array.from(tabs).find((t) => t.id === 'dw-supplier-tab-capabilities') as HTMLButtonElement;
    capabilitiesTab.click();
    expect(capabilitiesTab.getAttribute('aria-selected')).toBe('true');
    expect((modal.querySelector('#dw-supplier-tabpanel-capabilities') as HTMLElement)?.hidden).toBe(false);
    expect((modal.querySelector('#dw-supplier-tabpanel-overview') as HTMLElement)?.hidden).toBe(true);

    const closeBtn = modal.querySelector('.dw-modal-close-btn') as HTMLButtonElement;
    closeBtn.click();
  });
});
