/**
 * Master Aggregator & Indexed Fast Query Engine for 43 Strategic Defence Programs
 * Hard limit: <= 300 LOC.
 */

import {
  LifecycleStage,
  ProgramDomain,
  ProgramDomainStats,
  ProgramFilterOptions,
  StrategicProgram
} from '../types/programs.js';
import { AEROSPACE_PROGRAMS } from './programsAerospace.js';
import { NAVAL_PROGRAMS } from './programsNaval.js';
import { LAND_PROGRAMS } from './programsLand.js';
import { MISSILE_PROGRAMS } from './programsMissiles.js';
import { UNMANNED_PROGRAMS } from './programsUnmanned.js';

export const ALL_STRATEGIC_PROGRAMS: ReadonlyArray<StrategicProgram> = Object.freeze([
  ...AEROSPACE_PROGRAMS,
  ...NAVAL_PROGRAMS,
  ...LAND_PROGRAMS,
  ...MISSILE_PROGRAMS,
  ...UNMANNED_PROGRAMS
]);

const PROGRAMS_BY_ID = new Map<string, StrategicProgram>();
const PROGRAMS_BY_DOMAIN = new Map<ProgramDomain, StrategicProgram[]>();
const PROGRAMS_BY_STAGE = new Map<LifecycleStage, StrategicProgram[]>();

// Initialize fast O(1) indices
for (const prog of ALL_STRATEGIC_PROGRAMS) {
  PROGRAMS_BY_ID.set(prog.id, prog);

  const domainList = PROGRAMS_BY_DOMAIN.get(prog.domain) ?? [];
  domainList.push(prog);
  PROGRAMS_BY_DOMAIN.set(prog.domain, domainList);

  const stageList = PROGRAMS_BY_STAGE.get(prog.stage) ?? [];
  stageList.push(prog);
  PROGRAMS_BY_STAGE.set(prog.stage, stageList);
}

export function getAllPrograms(): StrategicProgram[] {
  return [...ALL_STRATEGIC_PROGRAMS];
}

export function getProgramById(id: string): StrategicProgram | undefined {
  return PROGRAMS_BY_ID.get(id);
}

export function getProgramsByDomain(domain: ProgramDomain): StrategicProgram[] {
  return [...(PROGRAMS_BY_DOMAIN.get(domain) ?? [])];
}

export function getProgramsByStage(stage: LifecycleStage): StrategicProgram[] {
  return [...(PROGRAMS_BY_STAGE.get(stage) ?? [])];
}

export function getProgramDomainStats(): ProgramDomainStats {
  let inProductionOrInducted = 0;
  let inTrials = 0;
  let inDevelopment = 0;
  let inConceptOrSanctioned = 0;

  for (const p of ALL_STRATEGIC_PROGRAMS) {
    if (p.stage === 'production' || p.stage === 'induction') inProductionOrInducted++;
    else if (p.stage === 'trials') inTrials++;
    else if (p.stage === 'development') inDevelopment++;
    else if (p.stage === 'concept' || p.stage === 'sanctioned') inConceptOrSanctioned++;
  }

  return {
    total: ALL_STRATEGIC_PROGRAMS.length,
    aerospace: PROGRAMS_BY_DOMAIN.get('aerospace')?.length ?? 0,
    naval: PROGRAMS_BY_DOMAIN.get('naval')?.length ?? 0,
    land: PROGRAMS_BY_DOMAIN.get('land')?.length ?? 0,
    missiles: PROGRAMS_BY_DOMAIN.get('missiles')?.length ?? 0,
    unmanned: PROGRAMS_BY_DOMAIN.get('unmanned')?.length ?? 0,
    inProductionOrInducted,
    inTrials,
    inDevelopment,
    inConceptOrSanctioned
  };
}

export function filterPrograms(options: ProgramFilterOptions): StrategicProgram[] {
  const query = options.query?.trim().toLowerCase();

  return ALL_STRATEGIC_PROGRAMS.filter((p) => {
    if (options.domain && options.domain !== 'all' && p.domain !== options.domain) {
      return false;
    }
    if (options.stage && options.stage !== 'all' && p.stage !== options.stage) {
      return false;
    }
    if (
      options.serviceBranch &&
      !p.serviceBranch.includes(options.serviceBranch as any) &&
      !p.serviceBranch.includes('Tri-Services')
    ) {
      return false;
    }
    if (
      options.minIndigenisation !== undefined &&
      p.indigenousPercentage < options.minIndigenisation
    ) {
      return false;
    }
    if (query) {
      const matchName = p.name.toLowerCase().includes(query);
      const matchShort = p.shortName.toLowerCase().includes(query);
      const matchSummary = p.summary.toLowerCase().includes(query);
      const matchAgency = p.leadAgency.toLowerCase().includes(query);
      const matchAliases = p.searchAliases.some((alias) => alias.toLowerCase().includes(query));
      const matchSubsystems = p.keySubsystems.some((sub) =>
        sub.name.toLowerCase().includes(query) || sub.supplier.toLowerCase().includes(query)
      );

      if (!matchName && !matchShort && !matchSummary && !matchAgency && !matchAliases && !matchSubsystems) {
        return false;
      }
    }
    return true;
  });
}

export function findProgramByAlias(text: string): StrategicProgram | undefined {
  const lower = text.toLowerCase();
  for (const prog of ALL_STRATEGIC_PROGRAMS) {
    if (prog.searchAliases.some((alias) => {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const reg = new RegExp(`\\b${escaped}\\b`, 'i');
      return reg.test(lower);
    })) {
      return prog;
    }
  }
  return undefined;
}

export function matchProgramsInText(text: string): StrategicProgram[] {
  const lower = text.toLowerCase();
  const matched: StrategicProgram[] = [];

  for (const prog of ALL_STRATEGIC_PROGRAMS) {
    const isMatch = prog.searchAliases.some((alias) => {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const reg = new RegExp(`\\b${escaped}\\b`, 'i');
      return reg.test(lower);
    });

    if (isMatch) {
      matched.push(prog);
    }
  }

  return matched;
}
