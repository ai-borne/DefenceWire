/**
 * Master Aggregator & Indexed O(1) Fast Query Engine for Program Technical Specifications
 * Hard limit: <= 300 LOC.
 */

import { ProgramTechnicalSpecs } from '../../types/programs.js';
import { AEROSPACE_SPECS } from './specsAerospace.js';
import { NAVAL_SPECS } from './specsNaval.js';
import { LAND_SPECS } from './specsLand.js';
import { MISSILE_SPECS } from './specsMissiles.js';
import { UNMANNED_SPECS } from './specsUnmanned.js';

export const ALL_PROGRAM_SPECS: ReadonlyArray<ProgramTechnicalSpecs> = Object.freeze([
  ...AEROSPACE_SPECS,
  ...NAVAL_SPECS,
  ...LAND_SPECS,
  ...MISSILE_SPECS,
  ...UNMANNED_SPECS
]);

const SPECS_BY_PROGRAM_ID = new Map<string, ProgramTechnicalSpecs>();

// Build fast O(1) lookup index
for (const spec of ALL_PROGRAM_SPECS) {
  SPECS_BY_PROGRAM_ID.set(spec.programId, spec);
}

/**
 * Retrieve Jane's-grade technical specifications by program ID in O(1) time.
 */
export function getSpecsByProgramId(programId: string): ProgramTechnicalSpecs | undefined {
  return SPECS_BY_PROGRAM_ID.get(programId);
}

/**
 * Return all registered technical specifications.
 */
export function getAllProgramSpecs(): ProgramTechnicalSpecs[] {
  return [...ALL_PROGRAM_SPECS];
}
