/**
 * Unit Tests for Pillar B Supplier Directory Data Contracts (Phase 2.1)
 * Hard limit: <= 300 LOC.
 */

import { describe, expect, it } from 'vitest';
import { ALL_STRATEGIC_PROGRAMS } from '../../src/data/strategicPrograms.js';
import { ALL_SUPPLIERS } from '../../src/data/suppliers/seedSuppliers.js';
import { STRINGS } from '../../src/resources/strings.js';
import type {
  ProgramSupplierLink,
  SupplierCapability,
  SupplierProfile
} from '../../src/types/suppliers.js';

const FIRST_PROGRAM = ALL_STRATEGIC_PROGRAMS[0];
if (!FIRST_PROGRAM) {
  throw new Error('ALL_STRATEGIC_PROGRAMS must not be empty for supplier contract tests to run.');
}
const REAL_PROGRAM_ID = FIRST_PROGRAM.id;

function validateProgramSupplierLinkage(links: ProgramSupplierLink[]): string[] {
  const validProgramIds = new Set(ALL_STRATEGIC_PROGRAMS.map((p) => p.id));
  return links
    .filter((link) => !validProgramIds.has(link.programId))
    .map((link) => link.programId);
}

describe('Supplier Directory Data Contracts SSOT (Phase 2.1)', () => {
  it('constructs a valid SupplierProfile satisfying the SupplierProfile contract', () => {
    const capability: SupplierCapability = {
      supplierId: 'godrej-aerospace',
      capabilityDomain: 'Propulsion',
      certifications: ['AS9100D', 'CEMILAC']
    };

    const link: ProgramSupplierLink = {
      programId: REAL_PROGRAM_ID,
      subsystemName: 'Test Subsystem',
      supplierId: 'godrej-aerospace',
      tier: 'private_prime',
      indigenisationStatus: 'in_house'
    };

    const supplier: SupplierProfile = {
      id: 'godrej-aerospace',
      slug: 'godrej-aerospace',
      name: 'Godrej Aerospace',
      tier: 'private_prime',
      hqCity: 'Mumbai',
      hqState: 'Maharashtra',
      corridor: undefined,
      description: 'Precision aerospace manufacturer.',
      idexWinner: false,
      isListed: false,
      capabilities: [capability],
      linkedPrograms: [link]
    };

    expect(supplier.linkedPrograms).toHaveLength(1);
    expect(supplier.capabilities[0]?.capabilityDomain).toBe('Propulsion');
  });

  it('fails validation when a program_suppliers link references a non-existent StrategicProgram.id', () => {
    const links: ProgramSupplierLink[] = [
      {
        programId: REAL_PROGRAM_ID,
        subsystemName: 'Valid Link',
        supplierId: 's1',
        tier: 'dpsu',
        indigenisationStatus: 'in_house'
      },
      {
        programId: 'nonexistent-program-id-xyz',
        subsystemName: 'Invalid Link',
        supplierId: 's2',
        tier: 'dpsu',
        indigenisationStatus: 'in_house'
      }
    ];

    const orphaned = validateProgramSupplierLinkage(links);
    expect(orphaned).toEqual(['nonexistent-program-id-xyz']);
  });

  it('passes validation when every program_suppliers link matches a real StrategicProgram.id', () => {
    const links: ProgramSupplierLink[] = ALL_STRATEGIC_PROGRAMS.slice(0, 3).map((program, i) => ({
      programId: program.id,
      subsystemName: `Subsystem ${i}`,
      supplierId: `supplier-${i}`,
      tier: 'dpsu',
      indigenisationStatus: 'in_house'
    }));

    expect(validateProgramSupplierLinkage(links)).toHaveLength(0);
  });

  it('exposes the Ecosystem tab and supplier dossier strings via the SSOT STRINGS object', () => {
    expect(STRINGS.suppliers.navTab).toBe('Ecosystem');
    expect(STRINGS.suppliers.heading).toBeTruthy();
    expect(STRINGS.suppliers.linkedProgramsEmpty).toBeTruthy();
  });

  it('seed dataset is non-empty (Phase 2.2 inclusion gate must not silently produce zero suppliers)', () => {
    expect(ALL_SUPPLIERS.length).toBeGreaterThan(0);
  });

  it('fails loudly if any seeded supplier has an empty/missing linkedPrograms array', () => {
    const suppliersWithNoLinks = ALL_SUPPLIERS.filter(
      (supplier) => !supplier.linkedPrograms || supplier.linkedPrograms.length === 0
    ).map((supplier) => supplier.id);

    expect(suppliersWithNoLinks).toEqual([]);
  });

  it('fails loudly if any seeded supplier links to a programId absent from ALL_STRATEGIC_PROGRAMS', () => {
    const orphanedLinks = ALL_SUPPLIERS.flatMap((supplier) =>
      validateProgramSupplierLinkage(supplier.linkedPrograms).map((programId) => `${supplier.id}->${programId}`)
    );

    expect(orphanedLinks).toEqual([]);
  });
});
