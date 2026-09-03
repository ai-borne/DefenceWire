/**
 * Suppliers ViewModel for DefenceWire.in
 * Drives the /suppliers Ecosystem Explorer: tier/capability/corridor/certification
 * filtering, debounced search, linked-program-count sort, and selected-supplier state.
 * Follows the ProgramsViewModel convention: private filter state, Set<Listener>
 * pub/sub, no-op short-circuiting setters, destroy() teardown.
 * Hard limit: <= 300 LOC.
 */

import {
  DefenceCertification,
  DefenceCorridor,
  CapabilityDomain,
  SupplierProfile,
  SupplierTier
} from '../types/suppliers.js';
import { ALL_SUPPLIERS, getSupplierBySlug } from '../data/suppliers/seedSuppliers.js';
import { getLinkedProgramCount, getSuppliersForProgram } from '../data/suppliers/programSupplierMapper.js';
import { SearchDebouncer } from './supplierSearchDebouncer.js';

export type SuppliersStateListener = () => void;
export type SupplierSortMode = 'linked_desc' | 'alphabetical';

export class SuppliersViewModel {
  private activeTier: SupplierTier | 'all' = 'all';
  private activeCapability: CapabilityDomain | 'all' = 'all';
  private activeCorridor: DefenceCorridor | 'all' = 'all';
  private activeCertification: DefenceCertification | 'all' = 'all';
  private searchInput: string = '';
  private searchQuery: string = '';
  private sortMode: SupplierSortMode = 'linked_desc';
  private selectedSupplier: SupplierProfile | null = null;
  private listeners: Set<SuppliersStateListener> = new Set();
  private readonly searchDebouncer: SearchDebouncer = new SearchDebouncer();
  private readonly profileCache: Map<string, SupplierProfile> = new Map();

  public getActiveTier(): SupplierTier | 'all' {
    return this.activeTier;
  }

  public setActiveTier(tier: SupplierTier | 'all'): void {
    if (this.activeTier === tier) return;
    this.activeTier = tier;
    this.notifyListeners();
  }

  public getActiveCapability(): CapabilityDomain | 'all' {
    return this.activeCapability;
  }

  public setActiveCapability(capability: CapabilityDomain | 'all'): void {
    if (this.activeCapability === capability) return;
    this.activeCapability = capability;
    this.notifyListeners();
  }

  public getActiveCorridor(): DefenceCorridor | 'all' {
    return this.activeCorridor;
  }

  public setActiveCorridor(corridor: DefenceCorridor | 'all'): void {
    if (this.activeCorridor === corridor) return;
    this.activeCorridor = corridor;
    this.notifyListeners();
  }

  public getActiveCertification(): DefenceCertification | 'all' {
    return this.activeCertification;
  }

  public setActiveCertification(certification: DefenceCertification | 'all'): void {
    if (this.activeCertification === certification) return;
    this.activeCertification = certification;
    this.notifyListeners();
  }

  /** Raw, un-debounced input for a controlled search box. */
  public getSearchInput(): string {
    return this.searchInput;
  }

  /** Debounced query actually applied to filtering. */
  public getSearchQuery(): string {
    return this.searchQuery;
  }

  public setSearchQuery(query: string): void {
    this.searchInput = query;
    this.searchDebouncer.schedule(() => {
      const trimmed = this.searchInput.trim();
      if (this.searchQuery === trimmed) return;
      this.searchQuery = trimmed;
      this.notifyListeners();
    });
  }

  public getSortMode(): SupplierSortMode {
    return this.sortMode;
  }

  public setSortMode(mode: SupplierSortMode): void {
    if (this.sortMode === mode) return;
    this.sortMode = mode;
    this.notifyListeners();
  }

  public resetFilters(): void {
    this.activeTier = 'all';
    this.activeCapability = 'all';
    this.activeCorridor = 'all';
    this.activeCertification = 'all';
    this.searchInput = '';
    this.searchQuery = '';
    this.sortMode = 'linked_desc';
    this.notifyListeners();
  }

  public getSelectedSupplier(): SupplierProfile | null {
    return this.selectedSupplier;
  }

  public setSelectedSupplier(supplier: SupplierProfile | null): void {
    if (this.selectedSupplier?.id === supplier?.id) return;
    this.selectedSupplier = supplier;
    this.notifyListeners();
  }

  public selectSupplierBySlug(slug: string): boolean {
    const found = this.getCachedSupplier(slug);
    if (found) {
      this.setSelectedSupplier(found);
      return true;
    }
    return false;
  }

  /** In-memory cache over ALL_SUPPLIERS lookups, keyed by slug. */
  public getCachedSupplier(slug: string): SupplierProfile | undefined {
    const cached = this.profileCache.get(slug);
    if (cached) return cached;
    const found = getSupplierBySlug(slug);
    if (found) {
      this.profileCache.set(slug, found);
    }
    return found;
  }

  public getSuppliersForProgram(programId: string): SupplierProfile[] {
    return getSuppliersForProgram(programId);
  }

  public getFilteredSuppliers(): SupplierProfile[] {
    const query = this.searchQuery.toLowerCase();

    const filtered = ALL_SUPPLIERS.filter((supplier) => {
      if (this.activeTier !== 'all' && supplier.tier !== this.activeTier) return false;
      if (this.activeCorridor !== 'all' && supplier.corridor !== this.activeCorridor) return false;

      if (this.activeCapability !== 'all') {
        const hasCapability = supplier.capabilities.some((c) => c.capabilityDomain === this.activeCapability);
        if (!hasCapability) return false;
      }

      if (this.activeCertification !== 'all') {
        const hasCertification = supplier.capabilities.some((c) =>
          c.certifications.includes(this.activeCertification as DefenceCertification)
        );
        if (!hasCertification) return false;
      }

      if (query) {
        const haystack = `${supplier.name} ${supplier.description}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      return true;
    });

    return this.sortSuppliers(filtered);
  }

  private sortSuppliers(suppliers: SupplierProfile[]): SupplierProfile[] {
    const sorted = [...suppliers];
    if (this.sortMode === 'alphabetical') {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      sorted.sort((a, b) => getLinkedProgramCount(b.id) - getLinkedProgramCount(a.id) || a.name.localeCompare(b.name));
    }
    return sorted;
  }

  public getAllSuppliers(): SupplierProfile[] {
    return [...ALL_SUPPLIERS];
  }

  public subscribe(listener: SuppliersStateListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  public destroy(): void {
    this.searchDebouncer.cancel();
    this.listeners.clear();
    this.profileCache.clear();
  }
}
