/**
 * Strategic Defence Programs Order of Battle (ORBAT) & Deployment Contracts
 * Scoped strictly to operational & slated formations for the 43 Strategic Programs.
 * Hard limit: <= 300 LOC.
 */

export type OrbatUnitType =
  | 'squadron'
  | 'regiment'
  | 'fleet'
  | 'flotilla'
  | 'battery'
  | 'wing'
  | 'carrier_strike_group'
  | 'special_unit';

export type OrbatServiceBranch =
  | 'Indian Air Force'
  | 'Indian Navy'
  | 'Indian Army'
  | 'Tri-Services'
  | 'Indian Coast Guard'
  | 'Strategic Forces Command';

export type OrbatDeploymentStatus =
  | 'operational'
  | 'forming'
  | 'slated'
  | 'upgrading'
  | 'evaluating';

export type OrbatCitationSourceType =
  | 'parliamentary_report'
  | 'mod_annual_report'
  | 'pib_release'
  | 'gazette_notification'
  | 'dac_decision';

export interface OrbatCitation {
  sourceTitle: string;
  sourceType: OrbatCitationSourceType;
  documentNumber?: string;
  date: string;
  url?: string;
  relevantExcerpt?: string;
}

export interface OrbatUnit {
  id: string;
  programId: string;
  unitDesignation: string;
  nickname?: string;
  unitType: OrbatUnitType;
  serviceBranch: OrbatServiceBranch;
  baseLocation: string;
  command: string;
  status: OrbatDeploymentStatus;
  inductionDate?: string;
  allocatedUnits?: number | string;
  operationalRole?: string;
  citation: OrbatCitation;
}

export interface ProgramOrbatProfile {
  programId: string;
  programName: string;
  totalOperationalUnits: number;
  totalPlannedUnits: number | string;
  units: OrbatUnit[];
  parliamentaryOverview?: string;
}
