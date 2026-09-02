/**
 * Strategic Defence Programs Data Contracts & Types SSOT
 * Hard limit: <= 300 LOC.
 */

export type ProgramDomain = 'aerospace' | 'naval' | 'land' | 'missiles' | 'unmanned';

export type LifecycleStage =
  | 'concept'
  | 'sanctioned'
  | 'development'
  | 'trials'
  | 'production'
  | 'induction';

export type MilestoneStatus = 'completed' | 'in_progress' | 'upcoming';

export type ServiceBranch =
  | 'Indian Air Force'
  | 'Indian Navy'
  | 'Indian Army'
  | 'Tri-Services'
  | 'Paramilitary'
  | 'Indian Coast Guard'
  | 'Strategic Forces Command';

export interface ProgramSubsystem {
  name: string;
  type: 'Radar / Sensor' | 'Propulsion / Engine' | 'Avionics / EW' | 'Armament / Payload' | 'Hull / Airframe' | 'Guidance / Navigation' | 'SATCOM / Network';
  indigenous: boolean;
  supplier: string;
  status: string;
}

export interface ProgramMilestone {
  id: string;
  date: string;
  title: string;
  status: MilestoneStatus;
  description?: string;
}

export interface StrategicProgram {
  id: string;
  name: string;
  shortName: string;
  domain: ProgramDomain;
  stage: LifecycleStage;
  leadAgency: string;
  serviceBranch: ServiceBranch[];
  sanctionedBudgetCrores?: number;
  estimatedTotalCrores?: number;
  indigenousPercentage: number;
  targetInductionYear?: number | string;
  plannedUnits?: number | string;
  summary: string;
  keySubsystems: ProgramSubsystem[];
  keyMilestones: ProgramMilestone[];
  searchAliases: string[];
  specifications?: Record<string, string>;
  foreignOem?: string;
  officialDesignation?: string;
}

export interface ProgramFilterOptions {
  domain?: ProgramDomain | 'all';
  stage?: LifecycleStage | 'all';
  serviceBranch?: string;
  query?: string;
  minIndigenisation?: number;
}

export interface ProgramDomainStats {
  total: number;
  aerospace: number;
  naval: number;
  land: number;
  missiles: number;
  unmanned: number;
  inProductionOrInducted: number;
  inTrials: number;
  inDevelopment: number;
  inConceptOrSanctioned: number;
}
