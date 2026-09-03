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
  specs?: ProgramTechnicalSpecs;
  orderBook?: ProgramOrderBook;
  idexChallenges?: IdexChallenge[];
}

export interface ProgramDimensions {
  length?: string;
  wingspan?: string;
  beam?: string;
  height?: string;
  diameter?: string;
  displacementTons?: number | string;
  emptyWeightKg?: number | string;
  mtowKg?: number | string;
}

export interface ProgramPerformance {
  maxSpeed?: string;
  combatRadiusKm?: number | string;
  ferryRangeKm?: number | string;
  serviceCeilingMeters?: number | string;
  rcsEstimate?: string;
  enduranceHours?: number | string;
}

export interface ProgramPropulsion {
  engineModel?: string;
  engineType?: string;
  dryThrustKn?: number | string;
  wetThrustKn?: number | string;
  powerOutput?: string;
}

export interface ProgramAvionics {
  radarSuite?: string;
  ewSuite?: string;
  datalink?: string;
  targetTrackingCapacity?: string;
}

export interface ProgramArmament {
  hardpointsCount?: number | string;
  payloadCapacityKg?: number | string;
  internalBays?: string | boolean;
  compatibleWeapons?: string[];
  gunSystem?: string;
}

export interface ProgramTechnicalSpecs {
  programId: string;
  dimensions?: ProgramDimensions;
  performance?: ProgramPerformance;
  propulsion?: ProgramPropulsion;
  avionics?: ProgramAvionics;
  armament?: ProgramArmament;
}

export type OrderBatchStatus = 'delivered' | 'in_production' | 'pending' | 'sanctioned';

export interface OrderBatch {
  batchName: string;
  orderDate?: string;
  units: number;
  contractValueCrores?: number;
  manufacturingFacility?: string;
  deliverySchedule?: string;
  recipientBasesOrSquadrons?: string[];
  status?: OrderBatchStatus;
}

export interface ProgramOrderBook {
  programId: string;
  sanctionedUnits: number;
  contractedUnits: number;
  deliveredUnits: number;
  pendingUnits: number;
  batches: OrderBatch[];
  latestDeliveryMilestone?: string;
}

export type IdexEdition = 'DISC' | 'ADITI' | 'Open Challenge' | 'SPARK' | string;
export type IdexChallengeStatus = 'open' | 'evaluating' | 'awarded' | 'prototype_fielded' | 'completed';

export interface IdexChallenge {
  id: string;
  edition: string;
  psNumber: string;
  title: string;
  nodalAgency: string;
  grantAmount: string;
  problemDescription: string;
  targetCapability: string;
  mappedProgramId: string;
  status: IdexChallengeStatus | string;
  officialPdfUrl?: string;
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

