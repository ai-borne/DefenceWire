/**
 * Program <-> Supplier Cross-Linking Indexed Query Engine (Phase 2.3)
 * Builds reverse indices over ALL_SUPPLIERS' embedded linkedPrograms so the
 * Programs pillar and the Ecosystem pillar can query each other in O(1).
 * Hard limit: <= 300 LOC.
 */

import type { CapabilityDomain, ProgramSupplierLink, SupplierProfile } from '../../types/suppliers.js';
import { ALL_STRATEGIC_PROGRAMS } from '../strategicPrograms.js';
import { ALL_SUPPLIERS, getSupplierBySlug } from './seedSuppliers.js';

export { ALL_SUPPLIERS, getSupplierBySlug };

export interface CapabilityDomainStat {
  domain: CapabilityDomain;
  supplierCount: number;
  linkedProgramCount: number;
}

export interface ProgramCoverageStats {
  totalPrograms: number;
  mappedProgramCount: number;
  mappedProgramIds: string[];
}

const LINKS_BY_PROGRAM_ID = new Map<string, ProgramSupplierLink[]>();
const SUPPLIERS_BY_PROGRAM_ID = new Map<string, SupplierProfile[]>();
const LINKED_PROGRAM_COUNT_BY_SUPPLIER_ID = new Map<string, number>();

for (const supplier of ALL_SUPPLIERS) {
  LINKED_PROGRAM_COUNT_BY_SUPPLIER_ID.set(supplier.id, supplier.linkedPrograms.length);

  for (const link of supplier.linkedPrograms) {
    const links = LINKS_BY_PROGRAM_ID.get(link.programId) ?? [];
    links.push(link);
    LINKS_BY_PROGRAM_ID.set(link.programId, links);

    const suppliers = SUPPLIERS_BY_PROGRAM_ID.get(link.programId) ?? [];
    if (!suppliers.some((s) => s.id === supplier.id)) {
      suppliers.push(supplier);
    }
    SUPPLIERS_BY_PROGRAM_ID.set(link.programId, suppliers);
  }
}

/** All ProgramSupplierLink rows tying a strategic program to its verified suppliers. */
export function getLinksForProgram(programId: string): ProgramSupplierLink[] {
  return [...(LINKS_BY_PROGRAM_ID.get(programId) ?? [])];
}

/** Distinct verified suppliers linked to a strategic program. */
export function getSuppliersForProgram(programId: string): SupplierProfile[] {
  return [...(SUPPLIERS_BY_PROGRAM_ID.get(programId) ?? [])];
}

/** Number of distinct strategic programs a supplier has a verified link to. */
export function getLinkedProgramCount(supplierId: string): number {
  return LINKED_PROGRAM_COUNT_BY_SUPPLIER_ID.get(supplierId) ?? 0;
}

/** Coverage strip data: "X of 43 programs have verified supply chains mapped". */
export function getProgramCoverageStats(): ProgramCoverageStats {
  const mappedProgramIds = [...LINKS_BY_PROGRAM_ID.keys()];
  return {
    totalPrograms: ALL_STRATEGIC_PROGRAMS.length,
    mappedProgramCount: mappedProgramIds.length,
    mappedProgramIds
  };
}

/** Per-capability-domain supplier and linked-program tallies for the coverage strip. */
export function getCapabilityDomainStats(): CapabilityDomainStat[] {
  const domainToSupplierIds = new Map<CapabilityDomain, Set<string>>();
  const domainToProgramIds = new Map<CapabilityDomain, Set<string>>();

  for (const supplier of ALL_SUPPLIERS) {
    for (const capability of supplier.capabilities) {
      const supplierIds = domainToSupplierIds.get(capability.capabilityDomain) ?? new Set<string>();
      supplierIds.add(supplier.id);
      domainToSupplierIds.set(capability.capabilityDomain, supplierIds);

      const programIds = domainToProgramIds.get(capability.capabilityDomain) ?? new Set<string>();
      for (const link of supplier.linkedPrograms) {
        programIds.add(link.programId);
      }
      domainToProgramIds.set(capability.capabilityDomain, programIds);
    }
  }

  return [...domainToSupplierIds.entries()]
    .map(([domain, supplierIds]) => ({
      domain,
      supplierCount: supplierIds.size,
      linkedProgramCount: domainToProgramIds.get(domain)?.size ?? 0
    }))
    .sort((a, b) => b.linkedProgramCount - a.linkedProgramCount);
}
