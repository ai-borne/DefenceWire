/**
 * Unit Tests for Program <-> Supplier Cross-Linking Mapper (Phase 2.3)
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it } from 'vitest';
import { ALL_STRATEGIC_PROGRAMS } from '../../src/data/strategicPrograms.js';
import { ALL_SUPPLIERS } from '../../src/data/suppliers/seedSuppliers.js';
import {
  getCapabilityDomainStats,
  getLinkedProgramCount,
  getLinksForProgram,
  getProgramCoverageStats,
  getSuppliersForProgram
} from '../../src/data/suppliers/programSupplierMapper.js';

describe('Program-Supplier Mapper (Phase 2.3)', () => {
  it('returns the verified suppliers linked to a real strategic program', () => {
    const supplierWithLink = ALL_SUPPLIERS[0]!;
    const link = supplierWithLink.linkedPrograms[0]!;

    const suppliers = getSuppliersForProgram(link.programId);
    expect(suppliers.some((s) => s.id === supplierWithLink.id)).toBe(true);
  });

  it('returns an empty array for a program with no verified supplier links', () => {
    expect(getSuppliersForProgram('nonexistent-program-id-xyz')).toEqual([]);
    expect(getLinksForProgram('nonexistent-program-id-xyz')).toEqual([]);
  });

  it('getLinksForProgram returns raw ProgramSupplierLink rows, not deduped supplier profiles', () => {
    const supplierWithLink = ALL_SUPPLIERS[0]!;
    const link = supplierWithLink.linkedPrograms[0]!;
    const links = getLinksForProgram(link.programId);
    expect(links.some((l) => l.supplierId === supplierWithLink.id)).toBe(true);
  });

  it('getLinkedProgramCount matches the length of a supplier\'s linkedPrograms array', () => {
    for (const supplier of ALL_SUPPLIERS) {
      expect(getLinkedProgramCount(supplier.id)).toBe(supplier.linkedPrograms.length);
    }
  });

  it('getLinkedProgramCount returns 0 for an unknown supplier id', () => {
    expect(getLinkedProgramCount('nonexistent-supplier-xyz')).toBe(0);
  });

  it('coverage stats never exceed the total number of strategic programs', () => {
    const stats = getProgramCoverageStats();
    expect(stats.totalPrograms).toBe(ALL_STRATEGIC_PROGRAMS.length);
    expect(stats.mappedProgramCount).toBeGreaterThan(0);
    expect(stats.mappedProgramCount).toBeLessThanOrEqual(stats.totalPrograms);
    expect(stats.mappedProgramIds).toHaveLength(stats.mappedProgramCount);
  });

  it('every mapped program id in coverage stats is a real StrategicProgram.id', () => {
    const validIds = new Set(ALL_STRATEGIC_PROGRAMS.map((p) => p.id));
    const stats = getProgramCoverageStats();
    for (const id of stats.mappedProgramIds) {
      expect(validIds.has(id)).toBe(true);
    }
  });

  it('capability domain stats carry non-zero supplier and linked-program tallies, sorted by linked-program count descending', () => {
    const stats = getCapabilityDomainStats();
    expect(stats.length).toBeGreaterThan(0);
    for (const stat of stats) {
      expect(stat.supplierCount).toBeGreaterThan(0);
      expect(stat.linkedProgramCount).toBeGreaterThan(0);
    }
    for (let i = 1; i < stats.length; i++) {
      expect(stats[i - 1]!.linkedProgramCount).toBeGreaterThanOrEqual(stats[i]!.linkedProgramCount);
    }
  });
});
