/**
 * Unit Tests for SuppliersViewModel (Phase 2.3)
 * Hard limit: <= 300 LOC.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SuppliersViewModel } from '../../src/viewmodels/SuppliersViewModel.js';
import { ALL_SUPPLIERS } from '../../src/data/suppliers/seedSuppliers.js';
import { getLinkedProgramCount } from '../../src/data/suppliers/programSupplierMapper.js';

describe('SuppliersViewModel (Phase 2.3)', () => {
  let vm: SuppliersViewModel;

  beforeEach(() => {
    vi.useFakeTimers();
    vm = new SuppliersViewModel();
  });

  afterEach(() => {
    vm.destroy();
    vi.useRealTimers();
  });

  it('defaults to unfiltered, linked-program-count-descending sort', () => {
    const filtered = vm.getFilteredSuppliers();
    expect(filtered).toHaveLength(ALL_SUPPLIERS.length);
    for (let i = 1; i < filtered.length; i++) {
      expect(getLinkedProgramCount(filtered[i - 1]!.id)).toBeGreaterThanOrEqual(
        getLinkedProgramCount(filtered[i]!.id)
      );
    }
  });

  it('filters by tier and is a no-op setter when the same tier is set again', () => {
    const target = ALL_SUPPLIERS.find((s) => s.tier === 'dpsu');
    expect(target).toBeTruthy();

    const listener = vi.fn();
    vm.subscribe(listener);
    vm.setActiveTier('dpsu');
    expect(listener).toHaveBeenCalledTimes(1);

    vm.setActiveTier('dpsu');
    expect(listener).toHaveBeenCalledTimes(1);

    const filtered = vm.getFilteredSuppliers();
    expect(filtered.every((s) => s.tier === 'dpsu')).toBe(true);
  });

  it('filters by capability domain', () => {
    const target = ALL_SUPPLIERS.find((s) => s.capabilities.length > 0);
    const domain = target!.capabilities[0]!.capabilityDomain;

    vm.setActiveCapability(domain);
    const filtered = vm.getFilteredSuppliers();
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((s) => s.capabilities.some((c) => c.capabilityDomain === domain))).toBe(true);
  });

  it('filters by certification', () => {
    const withCert = ALL_SUPPLIERS.find((s) => s.capabilities.some((c) => c.certifications.length > 0));
    if (!withCert) return;
    const cert = withCert.capabilities.find((c) => c.certifications.length > 0)!.certifications[0]!;

    vm.setActiveCertification(cert);
    const filtered = vm.getFilteredSuppliers();
    expect(filtered.every((s) => s.capabilities.some((c) => c.certifications.includes(cert)))).toBe(true);
  });

  it('debounces search input: filtering only reflects the query after the debounce delay', () => {
    const listener = vi.fn();
    vm.subscribe(listener);

    const target = ALL_SUPPLIERS[0]!;
    vm.setSearchQuery(target.name);

    expect(vm.getSearchInput()).toBe(target.name);
    expect(vm.getSearchQuery()).toBe('');
    expect(listener).not.toHaveBeenCalled();

    vi.advanceTimersByTime(250);

    expect(vm.getSearchQuery()).toBe(target.name);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(vm.getFilteredSuppliers().some((s) => s.id === target.id)).toBe(true);
  });

  it('resets the debounce timer on rapid successive keystrokes rather than firing once per keystroke', () => {
    const listener = vi.fn();
    vm.subscribe(listener);

    vm.setSearchQuery('a');
    vi.advanceTimersByTime(100);
    vm.setSearchQuery('as');
    vi.advanceTimersByTime(100);
    vm.setSearchQuery('ast');
    vi.advanceTimersByTime(250);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(vm.getSearchQuery()).toBe('ast');
  });

  it('switches sort mode to alphabetical on request', () => {
    vm.setSortMode('alphabetical');
    const filtered = vm.getFilteredSuppliers();
    for (let i = 1; i < filtered.length; i++) {
      expect(filtered[i - 1]!.name.localeCompare(filtered[i]!.name)).toBeLessThanOrEqual(0);
    }
  });

  it('resetFilters clears all active filters and search state', () => {
    vm.setActiveTier('dpsu');
    vm.setActiveCapability(ALL_SUPPLIERS[0]!.capabilities[0]!.capabilityDomain);
    vm.setSearchQuery('foo');
    vi.advanceTimersByTime(250);

    vm.resetFilters();

    expect(vm.getActiveTier()).toBe('all');
    expect(vm.getActiveCapability()).toBe('all');
    expect(vm.getSearchQuery()).toBe('');
    expect(vm.getFilteredSuppliers()).toHaveLength(ALL_SUPPLIERS.length);
  });

  it('selectSupplierBySlug caches and selects a supplier by slug, returning false for unknown slugs', () => {
    const target = ALL_SUPPLIERS[0]!;
    expect(vm.selectSupplierBySlug(target.slug)).toBe(true);
    expect(vm.getSelectedSupplier()?.id).toBe(target.id);

    expect(vm.selectSupplierBySlug('nonexistent-slug-xyz')).toBe(false);
  });

  it('setSelectedSupplier is a no-op when reselecting the same supplier', () => {
    const target = ALL_SUPPLIERS[0]!;
    const listener = vi.fn();
    vm.setSelectedSupplier(target);
    vm.subscribe(listener);

    vm.setSelectedSupplier(target);
    expect(listener).not.toHaveBeenCalled();
  });

  it('getSuppliersForProgram delegates to the program-supplier mapper', () => {
    const supplierWithLink = ALL_SUPPLIERS[0]!;
    const programId = supplierWithLink.linkedPrograms[0]!.programId;
    const linked = vm.getSuppliersForProgram(programId);
    expect(linked.some((s) => s.id === supplierWithLink.id)).toBe(true);
  });

  it('unsubscribe stops further notifications', () => {
    const listener = vi.fn();
    const unsubscribe = vm.subscribe(listener);
    unsubscribe();

    vm.setActiveTier('dpsu');
    expect(listener).not.toHaveBeenCalled();
  });

  it('destroy cancels any pending debounced search and clears listeners', () => {
    const listener = vi.fn();
    vm.subscribe(listener);
    vm.setSearchQuery('pending query');

    vm.destroy();
    vi.advanceTimersByTime(500);

    expect(listener).not.toHaveBeenCalled();
  });
});
