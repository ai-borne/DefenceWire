/**
 * Verified Indian Defence MSME & Supplier Directory Data Contracts SSOT
 * Hard limit: <= 300 LOC.
 */

export type SupplierTier = 'dpsu' | 'private_prime' | 'tier2_msme' | 'deep_tech_startup';

export type CapabilityDomain =
  | 'Precision Machining'
  | 'Composite Airframes'
  | 'Seeker Optics & EO/IR'
  | 'Energetic Materials'
  | 'Counter-UAS'
  | 'Radar & RF'
  | 'Naval & Undersea'
  | 'Propulsion';

export type DefenceCertification = 'AS9100D' | 'CEMILAC' | 'ISO/IEC 17025' | 'DGAQA';

export type DefenceCorridor =
  | 'Tamil Nadu'
  | 'Uttar Pradesh'
  | 'Bengaluru'
  | 'Hyderabad'
  | 'Pune';

export type IndigenisationStatus = 'srijan_listed' | 'idex_winner' | 'in_house' | 'licensed_production';

export interface SupplierCapability {
  supplierId: string;
  capabilityDomain: CapabilityDomain;
  certifications: DefenceCertification[];
}

export interface ProgramSupplierLink {
  programId: string;
  subsystemName: string;
  supplierId: string;
  tier: SupplierTier;
  indigenisationStatus: IndigenisationStatus;
}

export interface SupplierProfile {
  id: string;
  slug: string;
  name: string;
  /** Well-known public short names/abbreviations (e.g. 'BEL', 'HAL') this supplier also goes by in wire coverage — used for wire-mention matching, not fabricated. */
  aliases?: string[];
  tier: SupplierTier;
  hqCity: string;
  hqState: string;
  corridor?: DefenceCorridor;
  website?: string;
  description: string;
  srijanId?: string;
  idexWinner: boolean;
  isListed: boolean;
  stockSymbol?: string;
  capabilities: SupplierCapability[];
  linkedPrograms: ProgramSupplierLink[];
}

export interface SupplierFilterOptions {
  tier?: SupplierTier | 'all';
  capabilityDomain?: CapabilityDomain | 'all';
  corridor?: DefenceCorridor | 'all';
  certification?: DefenceCertification | 'all';
  query?: string;
}
