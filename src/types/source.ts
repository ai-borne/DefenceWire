/**
 * Source Types & Reliability Tier Definitions for DefenceWire.in
 * Hard limit: <= 300 LOC.
 */

export enum SourceTier {
  TIER_1_OFFICIAL = 'TIER_1_OFFICIAL',       // MoD, PIB, DRDO, Services (Army, Navy, Air Force)
  TIER_2_NATIONAL = 'TIER_2_NATIONAL',       // Reuters, The Hindu, ThePrint, ANI, Indian Express
  TIER_3_SPECIALIZED = 'TIER_3_SPECIALIZED', // Livefist, IDRW, Janes, Naval News, Force India
  TIER_4_OSINT = 'TIER_4_OSINT'              // Think Tanks (IDSA, ORF, USI), accredited OSINT
}

export interface TierWeight {
  tier: SourceTier;
  authorityWeight: number; // 0.0 - 1.0 (e.g. Tier 1: 1.0, Tier 2: 0.85, Tier 3: 0.70, Tier 4: 0.50)
  label: string;
}

export interface NewsSource {
  id: string;
  name: string;
  domain: string;
  tier: SourceTier;
  feedUrl?: string;
  isOfficialGov: boolean;
}
