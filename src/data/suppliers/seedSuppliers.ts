/**
 * Verified Indian Defence MSME & Supplier Directory — Aggregated Seed Dataset (Phase 2.2)
 * Mirrors src/data/strategicPrograms.ts's aggregation-of-category-files pattern.
 * Every supplier here has >=1 verified linkedPrograms entry against a real
 * StrategicProgram.id — see tests/unit/supplierContracts.test.ts for the enforced gate.
 * Hard limit: <= 300 LOC.
 */

import type { SupplierProfile } from '../../types/suppliers.js';
import DPSU_SUPPLIERS from './seedSuppliersDpsu.js';
import PRIVATE_SUPPLIERS from './seedSuppliersPrivate.js';
import STARTUP_SUPPLIERS from './seedSuppliersStartups.js';

export const ALL_SUPPLIERS: SupplierProfile[] = [
  ...DPSU_SUPPLIERS,
  ...PRIVATE_SUPPLIERS,
  ...STARTUP_SUPPLIERS
];

export function getSupplierBySlug(slug: string): SupplierProfile | undefined {
  return ALL_SUPPLIERS.find((s) => s.slug === slug);
}

export default ALL_SUPPLIERS;
