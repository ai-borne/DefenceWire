/**
 * 9 Strategic Naval Warfare & Submarine Technical Specifications
 * Jane's-grade specifications for SSBNs, SSNs, SSKs, aircraft carriers, destroyers & frigates.
 * Hard limit: <= 300 LOC.
 */

import { ProgramTechnicalSpecs } from '../../types/programs.js';

export const NAVAL_SPECS: ProgramTechnicalSpecs[] = [
  {
    programId: 'project-75i',
    dimensions: { length: '75.0 m', beam: '6.5 m', height: '14.0 m', displacementTons: 3200 },
    performance: { maxSpeed: '20+ knots submerged / 12 knots surfaced', combatRadiusKm: 12000, serviceCeilingMeters: 350, enduranceHours: 720 },
    propulsion: { engineModel: 'Fuel Cell AIP + High-Capacity Lithium-ion / Lead-acid batteries', engineType: 'Diesel-Electric with Air-Independent Propulsion (AIP)', powerOutput: '3,000 kW electric motor + 300 kW AIP fuel cell' },
    avionics: {
      radarSuite: 'Integrated Sonar Suite (Flank array, Bow cylindrical, Towed array) & Optronic Masts',
      ewSuite: 'Submarine Electronic Support Measures (ESM) & Radar Warning',
      datalink: 'VLF/ELF underwater communications & SATCOM'
    },
    armament: {
      hardpointsCount: 6, payloadCapacityKg: 18000, internalBays: '6x 533mm torpedo tubes + 8 VLS cells',
      compatibleWeapons: ['Varunastra Heavyweight Torpedoes', 'BrahMos-M Submarine-Launched Cruise Missiles', 'Sub-Harpoon / Exocet']
    }
  },
  {
    programId: 'project-75-kalvari',
    dimensions: { length: '67.5 m', beam: '6.2 m', height: '12.3 m', displacementTons: 1775 },
    performance: { maxSpeed: '20 knots submerged / 11 knots surfaced', combatRadiusKm: 10000, serviceCeilingMeters: 300, enduranceHours: 500 },
    propulsion: { engineModel: '4x MTU 12V 396 SE84 + DRDO PAFC AIP retrofit plug', engineType: 'Diesel-Electric submarine propulsion', powerOutput: '2,900 kW permanent magnet synchronous motor' },
    avionics: {
      radarSuite: 'Thales SUBTICS integrated sonar and combat management system',
      ewSuite: 'Thales DR 3000 ESM suite',
      datalink: 'Naval Tactical Data Network'
    },
    armament: {
      hardpointsCount: 6, payloadCapacityKg: 18000, internalBays: '6x 533mm bow torpedo tubes for 18 weapons',
      compatibleWeapons: ['Varunastra Heavyweight Torpedo', 'SM39 Exocet Anti-Ship Missiles', 'C303/S Torpedo Countermeasures']
    }
  },
  {
    programId: 'project-76',
    dimensions: { length: '78.0 m', beam: '7.2 m', height: '14.5 m', displacementTons: 3500 },
    performance: { maxSpeed: '22 knots submerged', combatRadiusKm: 14000, serviceCeilingMeters: 400, enduranceHours: 850 },
    propulsion: { engineModel: 'Indigenized high-output Fuel Cell AIP + Advanced Li-ion battery banks', engineType: 'AIP Diesel-Electric Hybrid', powerOutput: '3,500 kW Permanent Magnet Motor' },
    avionics: {
      radarSuite: 'USHUS-3 integrated sonar suite with hull-mounted cylindrical & towed thin-line arrays',
      ewSuite: 'Indigenous Naval Submarine ESM Suite',
      datalink: 'Brahma Naval C4I secure datalink'
    },
    armament: {
      hardpointsCount: 6, payloadCapacityKg: 22000, internalBays: '6x 533mm tubes + indigenous VLS module',
      compatibleWeapons: ['Varunastra Torpedoes', 'Indigenous Submarine-Launched Cruise Missiles (SLCM)', 'BrahMos-M']
    }
  },
  {
    programId: 'project-17b',
    dimensions: { length: '149.0 m', beam: '17.8 m', height: '39.0 m', displacementTons: 6800 },
    performance: { maxSpeed: '30 knots (56 km/h)', combatRadiusKm: 8500, enduranceHours: 720 },
    propulsion: { engineModel: 'Combined Diesel or Gas (CODOG) - 2x General Electric LM2500 gas turbines', engineType: 'CODOG marine gas turbines & diesel generators', powerOutput: '2x 24 MW + 2x 3.8 MW diesel engines' },
    avionics: {
      radarSuite: 'IAI EL/M-2248 MF-STAR AESA Multi-Function Radar',
      ewSuite: 'Shakti Indigenous EW suite with Radar Jammer and ESM',
      datalink: 'Link-II Tactical Data System'
    },
    armament: {
      hardpointsCount: 40, payloadCapacityKg: 15000, internalBays: '32-cell VLS for MRSAM + 8-cell VLS for BrahMos',
      compatibleWeapons: ['BrahMos-ER (450 km)', 'MRSAM / Barak-8ER Air Defence', 'Varunastra Torpedoes', 'RBU-6000 ASW Rockets'],
      gunSystem: '76 mm OTO Melara Super Rapid Gun Mount (SRGM)'
    }
  },
  {
    programId: 'project-18',
    dimensions: { length: '175.0 m', beam: '21.0 m', height: '45.0 m', displacementTons: 11500 },
    performance: { maxSpeed: '32 knots (59 km/h)', combatRadiusKm: 11000, enduranceHours: 1000 },
    propulsion: { engineModel: 'Integrated Electric Propulsion (IEP) with Marine Gas Turbines & BHEL generators', engineType: 'Full Electric Drive with Azipod / Shaftline', powerOutput: '60 MW total electric power' },
    avionics: {
      radarSuite: 'Dual-Band GaN AESA (S-band volume search + X-band fire control)',
      ewSuite: 'Next-Gen Directed Energy Countermeasures & Shakti-II EW',
      datalink: 'Tri-Service C4ISR Tactical Combat Cloud'
    },
    armament: {
      hardpointsCount: 96, payloadCapacityKg: 35000, internalBays: 'Universal VLS with 96 cells',
      compatibleWeapons: ['BrahMos-II Hypersonic', 'LR-SAM / Project Kusha Navalized', 'VL-SRSAM', 'SMART ASW Missile'],
      gunSystem: '127 mm Naval Gun + 30 kW Laser DEW'
    }
  },
  {
    programId: 'project-75-alpha-ssn',
    dimensions: { length: '105.0 m', beam: '11.0 m', height: '16.0 m', displacementTons: 6000 },
    performance: { maxSpeed: '30+ knots submerged', combatRadiusKm: 50000, serviceCeilingMeters: 450, enduranceHours: 2160 },
    propulsion: { engineModel: 'BARC 190 MW Compact Light Water Nuclear Reactor', engineType: 'Pressurized Water Nuclear Reactor (PWR) & Steam Turbines', powerOutput: '190 MW thermal / 30 MW shaft power' },
    avionics: {
      radarSuite: 'USHUS-4 Pan-Spectral Sonar Suite with conformal hull flank arrays',
      ewSuite: 'Submarine Electronic Countermeasure Suite',
      datalink: 'Extremely Low Frequency (ELF) / VLF & SATCOM'
    },
    armament: {
      hardpointsCount: 6, payloadCapacityKg: 28000, internalBays: '6x 533mm torpedo tubes + 8 VLS cells',
      compatibleWeapons: ['Indigenous SLCM (Nirbhay naval derivative 1000 km)', 'Varunastra Heavyweight Torpedoes', 'Anti-torpedo decoy systems']
    }
  },
  {
    programId: 's4-s5-ssbn',
    dimensions: { length: '130.0 m (S4) / 150.0 m (S5)', beam: '12.0 m / 14.0 m', height: '17.0 m', displacementTons: 7000 },
    performance: { maxSpeed: '24 knots submerged', combatRadiusKm: 60000, serviceCeilingMeters: 450, enduranceHours: 2160 },
    propulsion: { engineModel: 'BARC Indigenous Pressurized Light Water Reactor (83-190 MW)', engineType: 'Nuclear Steam Turbine Propulsion', powerOutput: '83 MW (Arihant) to 190 MW (S5) thermal' },
    avionics: {
      radarSuite: 'Pan-directional acoustic listening array & active obstacle avoidance sonar',
      ewSuite: 'Strategic acoustic signature reduction & counter-ESM',
      datalink: 'Secured Strategic Forces Command ELF/VLF communication array'
    },
    armament: {
      hardpointsCount: 8, payloadCapacityKg: 30000, internalBays: '8 to 12 vertical missile launch tubes (VLS)',
      compatibleWeapons: ['K-4 SLBM (3500 km)', 'K-5 SLBM (5000 km)', 'Varunastra Torpedoes for self-defence']
    }
  },
  {
    programId: 'iac-2-vishal',
    dimensions: { length: '262.0 m', beam: '62.0 m', height: '61.0 m', displacementTons: 45000 },
    performance: { maxSpeed: '28 knots (52 km/h)', combatRadiusKm: 14000, enduranceHours: 1200 },
    propulsion: { engineModel: '4x General Electric LM2500+ Gas Turbines (COGAG configuration)', engineType: 'Combined Gas and Gas (COGAG)', powerOutput: '88 MW (118,000 hp)' },
    avionics: {
      radarSuite: 'Selex RAN-40L 3D L-band radar & EL/M-2248 MF-STAR AESA',
      ewSuite: 'Shakti EW System with decoy rocket launchers (Kavach)',
      datalink: 'CMS-28 Combat Management System & TNDL'
    },
    armament: {
      hardpointsCount: 36, payloadCapacityKg: 45000, internalBays: 'Ski-jump deck with 3 arrester wires for 36 aircraft',
      compatibleWeapons: ['Rafale-M / TEDBF Fighters', 'Kamov Ka-31 AEW', 'MH-60R Seahawk ASW', 'Barak-8 VLS Air Defence'],
      gunSystem: '4x AK-630 CIWS + 32-cell MRSAM'
    }
  },
  {
    programId: 'ngc-ngmv',
    dimensions: { length: '120.0 m (NGC) / 56.0 m (NGMV)', beam: '14.5 m / 9.5 m', height: '22.0 m / 14.0 m', displacementTons: 3500 },
    performance: { maxSpeed: '27 knots (NGC) / 35 knots (NGMV)', combatRadiusKm: 7500, enduranceHours: 500 },
    propulsion: { engineModel: 'Combined Diesel and Diesel (CODAD) / Gas Turbine boost', engineType: 'CODAD / CODAG marine drive', powerOutput: '2x 8,000 kW marine diesel engines' },
    avionics: {
      radarSuite: '3D Medium Range Surveillance Radar & Air Target Trackers',
      ewSuite: 'Ajanta / Shakti-lite ESM and soft-kill jammers',
      datalink: 'Naval Link-II Tactical System'
    },
    armament: {
      hardpointsCount: 16, payloadCapacityKg: 10000, internalBays: '8x BrahMos Anti-Ship VLS cells + 16x VL-SRSAM',
      compatibleWeapons: ['BrahMos Supersonic Cruise Missiles', 'VL-SRSAM Short Range SAMs', 'Varunastra Torpedoes'],
      gunSystem: '76 mm Super Rapid Gun Mount + 2x AK-630 CIWS'
    }
  }
];
