/**
 * Master Aggregator and Query Engine for Program-Scoped ORBAT & Deployments
 * Indexes operational and slated units mapped strictly to the 43 Strategic Programs.
 * Hard limit: <= 300 LOC. Target: < 150 LOC.
 */

import { OrbatDeploymentStatus, OrbatServiceBranch, OrbatUnit, ProgramOrbatProfile } from '../../types/orbat.js';
import { AEROSPACE_ORBAT_UNITS } from './orbatAerospace.js';
import { NAVAL_ORBAT_UNITS } from './orbatNaval.js';
import { LAND_ORBAT_UNITS } from './orbatLand.js';
import { MISSILES_ORBAT_UNITS } from './orbatMissiles.js';
import { UNMANNED_ORBAT_UNITS } from './orbatUnmanned.js';

export const ALL_ORBAT_UNITS: ReadonlyArray<OrbatUnit> = Object.freeze([
  ...AEROSPACE_ORBAT_UNITS,
  ...NAVAL_ORBAT_UNITS,
  ...LAND_ORBAT_UNITS,
  ...MISSILES_ORBAT_UNITS,
  ...UNMANNED_ORBAT_UNITS
]);

const ORBAT_BY_PROGRAM = new Map<string, OrbatUnit[]>();
const ORBAT_BY_SERVICE = new Map<OrbatServiceBranch, OrbatUnit[]>();
const ORBAT_BY_STATUS = new Map<OrbatDeploymentStatus, OrbatUnit[]>();
const ORBAT_BY_ID = new Map<string, OrbatUnit>();

// Initialize O(1) indices
for (const unit of ALL_ORBAT_UNITS) {
  ORBAT_BY_ID.set(unit.id, unit);

  const progList = ORBAT_BY_PROGRAM.get(unit.programId) ?? [];
  progList.push(unit);
  ORBAT_BY_PROGRAM.set(unit.programId, progList);

  const branchList = ORBAT_BY_SERVICE.get(unit.serviceBranch) ?? [];
  branchList.push(unit);
  ORBAT_BY_SERVICE.set(unit.serviceBranch, branchList);

  const statusList = ORBAT_BY_STATUS.get(unit.status) ?? [];
  statusList.push(unit);
  ORBAT_BY_STATUS.set(unit.status, statusList);
}

export function getAllOrbatUnits(): OrbatUnit[] {
  return [...ALL_ORBAT_UNITS];
}

export function getOrbatUnitById(id: string): OrbatUnit | undefined {
  return ORBAT_BY_ID.get(id);
}

export function getOrbatByProgramId(programId: string): OrbatUnit[] {
  return [...(ORBAT_BY_PROGRAM.get(programId) ?? [])];
}

export function getOrbatUnitsByServiceBranch(branch: OrbatServiceBranch): OrbatUnit[] {
  return [...(ORBAT_BY_SERVICE.get(branch) ?? [])];
}

export function getOrbatUnitsByStatus(status: OrbatDeploymentStatus): OrbatUnit[] {
  return [...(ORBAT_BY_STATUS.get(status) ?? [])];
}

export function getOrbatProfileForProgram(programId: string, fallbackName = ''): ProgramOrbatProfile {
  const units = getOrbatByProgramId(programId);
  const operationalCount = units.filter((u) => u.status === 'operational').length;

  return {
    programId,
    programName: fallbackName,
    totalOperationalUnits: operationalCount,
    totalPlannedUnits: units.length,
    units
  };
}
