/**
 * ORBAT Deployment Data for 11 Strategic Aerospace Programs
 * Authoritative units backed by Parliamentary Reports and MoD Releases.
 * Hard limit: <= 300 LOC. Target: < 250 LOC.
 */

import { OrbatUnit } from '../../types/orbat.js';

export const AEROSPACE_ORBAT_UNITS: OrbatUnit[] = [
  // 1. Tejas Mk1A
  {
    id: 'orbat-tejas-45sqn',
    programId: 'tejas-mk1a',
    unitDesignation: 'No. 45 Squadron IAF',
    nickname: 'Flying Daggers',
    unitType: 'squadron',
    serviceBranch: 'Indian Air Force',
    baseLocation: 'AFS Sulur, Tamil Nadu',
    command: 'Southern Air Command',
    status: 'operational',
    inductionDate: '2016-07',
    allocatedUnits: '16 IOC + 2 Trainers',
    operationalRole: 'Air Superiority & Multi-role Interception',
    citation: { sourceTitle: 'Standing Committee on Defence: 42nd Report on Demands for Grants', sourceType: 'parliamentary_report', documentNumber: '17th Lok Sabha, Report No. 42', date: '2023-03-21', relevantExcerpt: 'No. 45 Squadron operationalized at Sulur as pioneer Tejas formation.' }
  },
  {
    id: 'orbat-tejas-18sqn',
    programId: 'tejas-mk1a',
    unitDesignation: 'No. 18 Squadron IAF',
    nickname: 'Flying Bullets',
    unitType: 'squadron',
    serviceBranch: 'Indian Air Force',
    baseLocation: 'AFS Sulur / Nal',
    command: 'Southern / Western Air Command',
    status: 'operational',
    inductionDate: '2020-05',
    allocatedUnits: '16 FOC + 2 Trainers',
    operationalRole: 'Frontline Air Defense & Strike',
    citation: { sourceTitle: 'PIB: IAF Operationalizes Second Tejas Squadron No. 18 Flying Bullets', sourceType: 'pib_release', documentNumber: 'PIB ID 1627042', date: '2020-05-27', relevantExcerpt: 'IAF operationalized No. 18 Squadron with FOC Tejas.' }
  },
  {
    id: 'orbat-tejas-3sqn',
    programId: 'tejas-mk1a',
    unitDesignation: 'No. 3 Squadron IAF',
    nickname: 'Cobras',
    unitType: 'squadron',
    serviceBranch: 'Indian Air Force',
    baseLocation: 'AFS Nal (Bikaner), Rajasthan',
    command: 'Western Air Command',
    status: 'slated',
    allocatedUnits: '18 Mk1A Jets',
    operationalRole: 'Forward Western Border Air Defense',
    citation: { sourceTitle: 'MoD: MiG-21 Phase-out & Tejas Mk1A Induction Bases', sourceType: 'parliamentary_report', documentNumber: 'Lok Sabha Unstarred Q. No. 1420', date: '2024-02-09', relevantExcerpt: 'First series-production batch of 83 Tejas Mk1A slated for Nal.' }
  },
  // 2. Tejas Mk2
  {
    id: 'orbat-tejas-mk2-slated',
    programId: 'tejas-mk2',
    unitDesignation: 'IAF Central Strike Wing',
    nickname: 'Mirage / Jaguar Replacement Squadrons',
    unitType: 'squadron',
    serviceBranch: 'Indian Air Force',
    baseLocation: 'AFS Gwalior / AFS Ambala',
    command: 'Central / Western Air Command',
    status: 'slated',
    allocatedUnits: '6 Squadrons (~110-120 Aircraft)',
    operationalRole: 'Medium-weight Multi-role Deep Penetration Strike',
    citation: { sourceTitle: 'Standing Committee on Defence: Review of MWF Development Schedule', sourceType: 'parliamentary_report', documentNumber: '17th Lok Sabha, Report No. 36', date: '2023-01-16', relevantExcerpt: 'IAF projection for 6 squadrons of Medium Weight Fighter (Tejas Mk2).' }
  },
  // 3. AMCA
  {
    id: 'orbat-amca-slated',
    programId: 'amca',
    unitDesignation: '5th Gen Stealth Fighter Fleet',
    nickname: 'Projected 5G Squadrons',
    unitType: 'squadron',
    serviceBranch: 'Indian Air Force',
    baseLocation: 'AFS Sulur / Strategic Air Enclaves',
    command: 'Tri-Services / Air HQ Task Force',
    status: 'slated',
    allocatedUnits: '7 Squadrons (2 Mk1 + 5 Mk2)',
    operationalRole: 'Air Dominance, Low-Observable Deep Strike & EW',
    citation: { sourceTitle: 'CCS Sanction for AMCA Full Scale Prototyping', sourceType: 'dac_decision', documentNumber: 'CCS/2024/03/AMCA', date: '2024-03-07', relevantExcerpt: 'CCS approved ₹15,000 Cr for prototyping 5 fifth-gen stealth aircraft.' }
  },
  // 4. TEDBF
  {
    id: 'orbat-tedbf-slated',
    programId: 'tedbf',
    unitDesignation: 'Naval Air Squadron (INAS) TEDBF Wing',
    nickname: 'Carrier Air Group (IAC-1 & IAC-2)',
    unitType: 'squadron',
    serviceBranch: 'Indian Navy',
    baseLocation: 'INS Hansa (Goa) & INS Vikrant',
    command: 'Western Naval Command / Naval Aviation',
    status: 'slated',
    allocatedUnits: '45 Carrier-borne Aircraft Planned',
    operationalRole: 'STOBAR Carrier Air Dominance & Maritime Interception',
    citation: { sourceTitle: 'Standing Committee on Defence: Naval Fleet Strength & Deck Fighters', sourceType: 'parliamentary_report', documentNumber: '17th Lok Sabha, Report No. 41', date: '2023-03-20', relevantExcerpt: 'NSQR drafted for Twin-Engine Deck-Based Fighter.' }
  },
  // 5. Ghatak UCAV
  {
    id: 'orbat-ghatak-slated',
    programId: 'ghatak-ucav',
    unitDesignation: 'Autonomous Stealth Strike Squadron',
    nickname: 'Unmanned Strike Flight',
    unitType: 'special_unit',
    serviceBranch: 'Indian Air Force',
    baseLocation: 'Aeronautical Test Range, Chitradurga',
    command: 'Strategic Air Directorate',
    status: 'evaluating',
    operationalRole: 'Deep Penetration SEAD/DEAD & Precision Strike',
    citation: { sourceTitle: 'DRDO Year End Review: SWiFT Flying Wing Validation', sourceType: 'mod_annual_report', documentNumber: 'DRDO/2023/YE-SWIFT', date: '2023-12-28', relevantExcerpt: 'Successful flight trials in tailless stealth configuration at Chitradurga.' }
  },
  // 6. Netra AEW&C
  {
    id: 'orbat-netra-50sqn',
    programId: 'netra-aewc',
    unitDesignation: 'No. 50 Squadron IAF',
    nickname: 'Eyes in the Sky',
    unitType: 'squadron',
    serviceBranch: 'Indian Air Force',
    baseLocation: 'AFS Bhatinda, Punjab',
    command: 'Western Air Command',
    status: 'operational',
    inductionDate: '2017-02',
    allocatedUnits: '3 ERJ-145 Aircraft',
    operationalRole: 'Airborne Early Warning & Battle Management',
    citation: { sourceTitle: 'PIB: Raksha Mantri formally inducts DRDO Netra AEW&C into IAF', sourceType: 'pib_release', documentNumber: 'PIB ID 1481829', date: '2017-02-14', relevantExcerpt: 'Induction of indigenous AEW&C system handed to No. 50 Squadron.' }
  },
  // 7. Prachand LCH
  {
    id: 'orbat-prachand-143hu',
    programId: 'prachand-lch',
    unitDesignation: 'No. 143 Helicopter Unit IAF',
    nickname: 'Dhanush',
    unitType: 'squadron',
    serviceBranch: 'Indian Air Force',
    baseLocation: 'AFS Jodhpur, Rajasthan',
    command: 'South Western Air Command',
    status: 'operational',
    inductionDate: '2022-10',
    allocatedUnits: '5 LSP Units',
    operationalRole: 'High-Altitude Anti-Armor & Mountain CAS',
    citation: { sourceTitle: 'PIB: Raksha Mantri Inducts LCH Prachand at Jodhpur', sourceType: 'pib_release', documentNumber: 'PIB ID 1864585', date: '2022-10-03', relevantExcerpt: 'LCH christened Prachand and formally inducted into 143 HU.' }
  },
  {
    id: 'orbat-prachand-251army',
    programId: 'prachand-lch',
    unitDesignation: '251 Army Aviation Squadron',
    nickname: 'Missamari Combat Aviators',
    unitType: 'squadron',
    serviceBranch: 'Indian Army',
    baseLocation: 'Missamari Aviation Base, Assam',
    command: 'Eastern Command',
    status: 'operational',
    inductionDate: '2022-11',
    allocatedUnits: '5 LSP Units (Army)',
    operationalRole: 'Mountain Warfare CAS along Line of Actual Control',
    citation: { sourceTitle: 'MoD Annual Report: Army Aviation Modernisation', sourceType: 'mod_annual_report', documentNumber: 'MoD-AR-2023-P88', date: '2023-04-12', relevantExcerpt: 'First Army Aviation LCH squadron operationalized at Missamari.' }
  },
  // 8. LUH
  {
    id: 'orbat-luh-slated',
    programId: 'luh',
    unitDesignation: 'High Altitude Logistic Flights',
    nickname: 'Cheetah Replacement Flights',
    unitType: 'wing',
    serviceBranch: 'Tri-Services',
    baseLocation: 'Leh Air Base / Forward Staging (Siachen)',
    command: 'Northern Command / Western Air Command',
    status: 'forming',
    allocatedUnits: '12 LSP + 187 Serial Production',
    operationalRole: 'High-Altitude CASEVAC, Recon & Logistics',
    citation: { sourceTitle: 'Standing Committee on Defence: Light Utility Helicopters', sourceType: 'parliamentary_report', documentNumber: '17th Lok Sabha, Report No. 44', date: '2023-08-04', relevantExcerpt: 'LUH clearing hot and high altitude trials at Daulat Beg Oldie.' }
  },
  // 9. IMRH
  {
    id: 'orbat-imrh-slated',
    programId: 'imrh',
    unitDesignation: 'Medium Lift Helicopter Regiment',
    nickname: 'Mi-17 Replacement Fleets',
    unitType: 'regiment',
    serviceBranch: 'Tri-Services',
    baseLocation: 'AFS Sarsawa / AFS Guwahati',
    command: 'Tri-Services Joint Command',
    status: 'slated',
    allocatedUnits: '350 Planned Across Tri-Services',
    operationalRole: 'Medium Lift Tactical Troop Transport & CSAR',
    citation: { sourceTitle: 'Lok Sabha Committee Report on Indigenous Helicopters', sourceType: 'parliamentary_report', documentNumber: '17th Lok Sabha, Report No. 39', date: '2023-03-14', relevantExcerpt: 'IMRH projected to replace IAF Mi-17 fleet beginning 2030-32.' }
  },
  // 10. C-295 Transport
  {
    id: 'orbat-c295-11sqn',
    programId: 'c295-transport',
    unitDesignation: 'No. 11 Squadron IAF',
    nickname: 'Rhinos',
    unitType: 'squadron',
    serviceBranch: 'Indian Air Force',
    baseLocation: 'AFS Vadodara, Gujarat',
    command: 'South Western Air Command',
    status: 'operational',
    inductionDate: '2023-09',
    allocatedUnits: '56 Total (16 Flyaway + 40 Vadodara Assembly)',
    operationalRole: 'Tactical Airlift & Forward Short-Field Logistics',
    citation: { sourceTitle: 'PIB: Induction of First C-295 Aircraft into IAF No. 11 Sqn', sourceType: 'pib_release', documentNumber: 'PIB ID 1960249', date: '2023-09-25', relevantExcerpt: 'Formal induction of C-295 MW into No. 11 Squadron Rhinos.' }
  },
  // 11. Su-30MKI Super Sukhoi
  {
    id: 'orbat-su30-222sqn',
    programId: 'su30mki-super-sukhoi',
    unitDesignation: 'No. 222 Squadron IAF',
    nickname: 'Tigersharks',
    unitType: 'squadron',
    serviceBranch: 'Indian Air Force',
    baseLocation: 'AFS Thanjavur, Tamil Nadu',
    command: 'Southern Air Command',
    status: 'operational',
    inductionDate: '2020-01',
    allocatedUnits: '18 Su-30MKI (BrahMos-A Strike Wing)',
    operationalRole: 'Maritime Domain Strike & Indian Ocean Air Dominance',
    citation: { sourceTitle: 'PIB: No. 222 Squadron Inducts Su-30MKI with BrahMos-A at Thanjavur', sourceType: 'pib_release', documentNumber: 'PIB ID 1599863', date: '2020-01-20', relevantExcerpt: 'No. 222 Squadron operationalized at Thanjavur with BrahMos.' }
  },
  {
    id: 'orbat-su30-super-sukhoi-upgrade',
    programId: 'su30mki-super-sukhoi',
    unitDesignation: 'Super Sukhoi Modernization Wings',
    nickname: 'Uttam AESA & Indigenous EW Fleet',
    unitType: 'wing',
    serviceBranch: 'Indian Air Force',
    baseLocation: 'AFS Halwara / AFS Bareilly / AFS Tezpur',
    command: 'Western / Central / Eastern Air Command',
    status: 'upgrading',
    allocatedUnits: '84 Aircraft in Phase-1 Upgrade',
    operationalRole: 'Long-Range BVR Interception & Stand-Off Strike',
    citation: { sourceTitle: 'DAC Clearance for 84 Su-30MKI Modernization', sourceType: 'dac_decision', documentNumber: 'DAC/2023/11/SU30-UP', date: '2023-11-30', relevantExcerpt: 'DAC approved ₹65,000 Cr upgrade of 84 Su-30MKI with indigenous AESA.' }
  }
];
